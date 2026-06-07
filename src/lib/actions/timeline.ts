'use server';

import { getSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { STORAGE_BUCKETS } from '@/lib/constants';
import { compressFileForStorage } from '@/lib/utils/compress';
import { getWeekDates, toISODateString } from '@/lib/utils/timelineDates';

/**
 * Fetch the current class routine
 */
export async function getClassRoutine() {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from('class_routine')
    .select('*')
    .order('uploaded_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error fetching class routine:', error);
    return null;
  }
  return data;
}

/**
 * Upload class routine (CR only)
 */
export async function uploadRoutine(formData: FormData) {
  const supabase = await getSupabaseServerClient();

  // Authentication check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Role check
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || (profile.role !== 'cr' && profile.role !== 'admin')) {
    return { error: 'Unauthorized: Only CRs and Admins can upload routines.' };
  }

  const file = formData.get('routine') as File | null;
  if (!file || file.size === 0) {
    return { error: 'No file provided.' };
  }

  if (!file.type.startsWith('image/')) {
    return { error: 'Only image files are accepted.' };
  }

  if (file.size > 5 * 1024 * 1024) {
    return { error: 'Image must be under 5 MB.' };
  }

  try {
    // 1. Delete previous routine from storage if exists (defensive check)
    const { data: oldRoutine } = await supabase
      .from('class_routine')
      .select('image_url')
      .order('uploaded_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (oldRoutine?.image_url) {
      try {
        const urlParts = oldRoutine.image_url.split('/public/notices/');
        if (urlParts.length > 1) {
          const oldStoragePath = urlParts[1];
          await supabase.storage
            .from(STORAGE_BUCKETS.NOTICES)
            .remove([oldStoragePath]);
        }
      } catch (err) {
        console.warn('Failed to delete old routine from storage (non-fatal):', err);
      }
    }

    // 2. Compress the image for storage
    const { buffer, contentType, fileName } = await compressFileForStorage(file);
    const safeName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const path = `routine/${Date.now()}-${safeName}`;

    // 3. Upload to notices bucket
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKETS.NOTICES)
      .upload(path, buffer, { contentType, upsert: false });

    if (uploadError) {
      return { error: `Upload failed: ${uploadError.message}` };
    }

    // 4. Get public URL
    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKETS.NOTICES)
      .getPublicUrl(uploadData.path);

    const imageUrl = urlData.publicUrl;

    // 5. Delete old rows from table and insert new one
    const { error: deleteError } = await supabase.from('class_routine').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (deleteError) {
      console.warn('Failed to delete old routine database rows (non-fatal):', deleteError.message);
    }

    const { error: insertError } = await supabase.from('class_routine').insert({
      image_url: imageUrl,
      uploaded_by: user.id,
    });

    if (insertError) {
      return { error: `Database insert failed: ${insertError.message}` };
    }

    revalidatePath('/cr/timeline');
    revalidatePath('/student/timeline');
    return { success: true };
  } catch (err: any) {
    console.error('Routine upload error:', err);
    return { error: err.message || 'An unexpected error occurred during upload.' };
  }
}

/**
 * Delete class routine (CR only)
 */
export async function deleteRoutine() {
  const supabase = await getSupabaseServerClient();

  // Authentication check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Role check
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || (profile.role !== 'cr' && profile.role !== 'admin')) {
    return { error: 'Unauthorized: Only CRs and Admins can delete routines.' };
  }

  try {
    const { data: routine } = await supabase
      .from('class_routine')
      .select('image_url')
      .order('uploaded_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (routine?.image_url) {
      const urlParts = routine.image_url.split('/public/notices/');
      if (urlParts.length > 1) {
        const storagePath = urlParts[1];
        await supabase.storage
          .from(STORAGE_BUCKETS.NOTICES)
          .remove([storagePath]);
      }
    }

    const { error: deleteError } = await supabase.from('class_routine').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (deleteError) {
      return { error: `Failed to delete routine record: ${deleteError.message}` };
    }

    revalidatePath('/cr/timeline');
    revalidatePath('/student/timeline');
    return { success: true };
  } catch (err: any) {
    console.error('Routine deletion error:', err);
    return { error: err.message || 'An unexpected error occurred.' };
  }
}

/**
 * Fetch counts and items for Saturday-to-Wednesday of a specific week
 */
export async function getTimelineData(weekNumber: number) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { days } = getWeekDates(weekNumber);
  
  // Set start of Saturday (first day) and end of Wednesday (last day) in GMT+6 timezone
  const startDate = new Date(days[0].getTime());
  const endDate = new Date(days[4].getTime() + 24 * 60 * 60 * 1000 - 1);

  // Fetch announcements in the week
  const { data: announcements, error: annError } = await supabase
    .from('announcements')
    .select('*, creator:profiles(full_name, profile_pic_url)')
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())
    .order('created_at', { ascending: true });

  if (annError) console.error('Error fetching announcements for timeline:', annError);

  // Fetch deadlines in the week
  const { data: deadlines, error: deadError } = await supabase
    .from('deadlines')
    .select('*')
    .gte('due_date', startDate.toISOString())
    .lte('due_date', endDate.toISOString())
    .order('due_date', { ascending: true });

  if (deadError) console.error('Error fetching deadlines for timeline:', deadError);

  // Fetch results in the week
  const { data: examResults, error: resError } = await supabase
    .from('exam_results')
    .select('*')
    .gte('published_at', startDate.toISOString())
    .lte('published_at', endDate.toISOString())
    .order('published_at', { ascending: true });

  if (resError) console.error('Error fetching exam results for timeline:', resError);

  // Map data to each of the 5 days (Saturday to Wednesday)
  const dayNames = ['SAT', 'SUN', 'MON', 'TUE', 'WED'];

  const timelineDays = days.map((dayDate, index) => {
    const dateStr = toISODateString(dayDate);
    const dayStart = dayDate.getTime();
    const dayEnd = dayStart + 24 * 60 * 60 * 1000 - 1;

    const filterByDay = (itemDateStr: string) => {
      const itemDate = new Date(itemDateStr);
      const time = itemDate.getTime();
      return time >= dayStart && time <= dayEnd;
    };

    return {
      dateStr,
      dayName: dayNames[index],
      dateLabel: dayDate.toLocaleDateString('en-US', { timeZone: 'Asia/Dhaka', month: 'short', day: 'numeric' }),
      announcements: (announcements || []).filter(item => filterByDay(item.created_at)),
      deadlines: (deadlines || []).filter(item => filterByDay(item.due_date)),
      results: (examResults || []).filter(item => filterByDay(item.published_at)),
    };
  });

  return timelineDays;
}

/**
 * Fetch all holiday day slots (week_number + day_index pairs).
 * Used by SemesterTimeline to compute non-holiday day counters
 * and render holiday visuals. Returns a flat array of all marked holidays.
 */
export async function getHolidayDays(): Promise<{ week_number: number; day_index: number; note: string | null }[]> {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from('holiday_days')
    .select('week_number, day_index, note')
    .order('week_number', { ascending: true })
    .order('day_index', { ascending: true });

  if (error) {
    console.error('Error fetching holiday days:', error);
    return [];
  }
  return data ?? [];
}

/**
 * Toggle a specific academic day slot as holiday/non-holiday (CR/admin only).
 * If the slot is already a holiday → deletes it (removes holiday).
 * If not → inserts it (marks as holiday).
 */
export async function toggleHolidayDay(
  weekNumber: number,
  dayIndex: number,
  note?: string
): Promise<{ success: boolean; isNowHoliday: boolean; error?: string }> {
  const supabase = await getSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Role check
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || (profile.role !== 'cr' && profile.role !== 'admin')) {
    return { success: false, isNowHoliday: false, error: 'Unauthorized: Only CRs and Admins can manage holidays.' };
  }

  try {
    // Check if already marked
    const { data: existing } = await supabase
      .from('holiday_days')
      .select('id')
      .eq('week_number', weekNumber)
      .eq('day_index', dayIndex)
      .maybeSingle();

    if (existing) {
      // Remove holiday
      const { error: delError } = await supabase
        .from('holiday_days')
        .delete()
        .eq('week_number', weekNumber)
        .eq('day_index', dayIndex);

      if (delError) return { success: false, isNowHoliday: true, error: delError.message };

      revalidatePath('/cr/timeline');
      revalidatePath('/student/timeline');
      return { success: true, isNowHoliday: false };
    } else {
      // Mark as holiday
      const { error: insError } = await supabase
        .from('holiday_days')
        .insert({ week_number: weekNumber, day_index: dayIndex, note: note ?? null, created_by: user.id });

      if (insError) return { success: false, isNowHoliday: false, error: insError.message };

      revalidatePath('/cr/timeline');
      revalidatePath('/student/timeline');
      return { success: true, isNowHoliday: true };
    }
  } catch (err: any) {
    console.error('toggleHolidayDay error:', err);
    return { success: false, isNowHoliday: false, error: err.message || 'An unexpected error occurred.' };
  }
}

/**
 * Set an entire academic week as holiday or normal (CR/admin only).
 */
/**
 * Get the current total number of weeks in the semester (default 14).
 */
export async function getTotalWeeks(): Promise<number> {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from('semester_config')
    .select('total_weeks')
    .eq('id', 1)
    .maybeSingle();

  if (error) {
    console.error('Error fetching total_weeks:', error);
    return 14;
  }
  return data?.total_weeks ?? 14;
}

/**
 * Update the total number of weeks in the semester (CR/admin only).
 */
export async function setTotalWeeks(
  totalWeeks: number
): Promise<{ success: boolean; error?: string }> {
  if (totalWeeks < 1 || totalWeeks > 52) {
    return { success: false, error: 'Week count must be between 1 and 52.' };
  }

  const supabase = await getSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || (profile.role !== 'cr' && profile.role !== 'admin')) {
    return { success: false, error: 'Unauthorized: Only CRs and Admins can modify semester settings.' };
  }

  const { error } = await supabase
    .from('semester_config')
    .update({ total_weeks: totalWeeks, updated_at: new Date().toISOString(), updated_by: user.id })
    .eq('id', 1);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/cr/timeline');
  revalidatePath('/student/timeline');
  return { success: true };
}

export async function setWeekHoliday(
  weekNumber: number,
  isHoliday: boolean
): Promise<{ success: boolean; error?: string }> {
  const supabase = await getSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Role check
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || (profile.role !== 'cr' && profile.role !== 'admin')) {
    return { success: false, error: 'Unauthorized: Only CRs and Admins can manage holidays.' };
  }

  try {
    if (isHoliday) {
      // Mark entire week as holiday: delete existing days first to avoid unique constraints
      await supabase
        .from('holiday_days')
        .delete()
        .eq('week_number', weekNumber);

      // Insert all 5 slots (0 to 4)
      const insertRows = Array.from({ length: 5 }, (_, d) => ({
        week_number: weekNumber,
        day_index: d,
        note: 'Whole Week Holiday',
        created_by: user.id,
      }));

      const { error: insError } = await supabase
        .from('holiday_days')
        .insert(insertRows);

      if (insError) return { success: false, error: insError.message };
    } else {
      // Unmark entire week: delete all holiday days for this week
      const { error: delError } = await supabase
        .from('holiday_days')
        .delete()
        .eq('week_number', weekNumber);

      if (delError) return { success: false, error: delError.message };
    }

    revalidatePath('/cr/timeline');
    revalidatePath('/student/timeline');
    return { success: true };
  } catch (err: any) {
    console.error('setWeekHoliday error:', err);
    return { success: false, error: err.message || 'An unexpected error occurred.' };
  }
}
