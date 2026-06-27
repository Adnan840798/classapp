'use server';

import { getSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function getAbsentTrackers() {
  try {
    const supabase = await getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const { data, error } = await supabase
      .from('absent_trackers')
      .select('*')
      .eq('profile_id', user.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('getAbsentTrackers database error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err: any) {
    console.error('getAbsentTrackers unexpected error:', err);
    return { success: false, error: err.message || 'Unexpected error occurred' };
  }
}

export async function createAbsentTracker(courseName: string) {
  try {
    const supabase = await getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const trimmed = courseName.trim();
    if (!trimmed) return { success: false, error: 'Course name is required' };

    const { data, error } = await supabase
      .from('absent_trackers')
      .insert({
        profile_id: user.id,
        course_name: trimmed,
        count: 0
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: 'You are already tracking absences for this course.' };
      }
      console.error('createAbsentTracker database error:', error);
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (err: any) {
    console.error('createAbsentTracker unexpected error:', err);
    return { success: false, error: err.message || 'Unexpected error occurred' };
  }
}

export async function updateAbsentTracker(id: string, count: number) {
  try {
    const supabase = await getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    if (count < 0) return { success: false, error: 'Absent count cannot be negative' };

    const { data, error } = await supabase
      .from('absent_trackers')
      .update({
        count,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('profile_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('updateAbsentTracker database error:', error);
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (err: any) {
    console.error('updateAbsentTracker unexpected error:', err);
    return { success: false, error: err.message || 'Unexpected error occurred' };
  }
}

export async function deleteAbsentTracker(id: string) {
  try {
    const supabase = await getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const { error } = await supabase
      .from('absent_trackers')
      .delete()
      .eq('id', id)
      .eq('profile_id', user.id);

    if (error) {
      console.error('deleteAbsentTracker database error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('deleteAbsentTracker unexpected error:', err);
    return { success: false, error: err.message || 'Unexpected error occurred' };
  }
}
