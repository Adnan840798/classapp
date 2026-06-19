'use server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function bulkDeleteNotifications(ids: string[]) {
  try {
    if (!ids || ids.length === 0) return { error: 'No notifications selected.' };

    const supabase = await getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Unauthorized' };

    // Delete only the notifications that belong to the current authenticated user (enforced by eq('user_id', user.id))
    const { error } = await supabase
      .from('notifications')
      .delete()
      .in('id', ids)
      .eq('user_id', user.id);

    if (error) {
      console.error('[bulkDeleteNotifications] Error:', error.message);
      return { error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('[bulkDeleteNotifications] Unexpected error:', err);
    return { error: err.message || 'An unexpected error occurred during deletion.' };
  }
}
