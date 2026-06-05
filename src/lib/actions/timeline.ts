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
  
  // Set start of Saturday (first day) and end of Wednesday (last day)
  const startDate = new Date(days[0]);
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date(days[4]);
  endDate.setHours(23, 59, 59, 999);

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
    const dayStart = new Date(dayDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayDate);
    dayEnd.setHours(23, 59, 59, 999);

    const filterByDay = (itemDateStr: string) => {
      const itemDate = new Date(itemDateStr);
      return itemDate >= dayStart && itemDate <= dayEnd;
    };

    return {
      dateStr,
      dayName: dayNames[index],
      dateLabel: dayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      announcements: (announcements || []).filter(item => filterByDay(item.created_at)),
      deadlines: (deadlines || []).filter(item => filterByDay(item.due_date)),
      results: (examResults || []).filter(item => filterByDay(item.published_at)),
    };
  });

  return timelineDays;
}
