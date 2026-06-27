'use server';

import { getSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

const NoteSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  content: z.string().max(10000).optional(),
  drive_link: z.string().url('Invalid Google Drive URL').or(z.string().length(0)).optional(),
});

export async function createNote(formData: FormData) {
  try {
    const supabase = await getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const raw = {
      title: formData.get('title') as string,
      content: formData.get('content') as string || undefined,
      drive_link: formData.get('drive_link') as string || undefined,
    };

    const isPublic = formData.get('is_public') === 'on' || formData.get('is_public') === 'true';

    const parsed = NoteSchema.safeParse(raw);
    if (!parsed.success) {
      return { error: parsed.error.issues[0].message };
    }

    // Role check for pending resource gate
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    const isCR = profile?.role === 'cr' || profile?.role === 'admin';

    let finalIsPublic = false;
    let finalIsPending = false;

    if (isPublic) {
      if (isCR) {
        finalIsPublic = true;
      } else {
        finalIsPending = true;
      }
    }

    const { error } = await supabase.from('notes').insert({
      title: parsed.data.title,
      content: parsed.data.content ?? null,
      drive_link: parsed.data.drive_link || null,
      is_public: finalIsPublic,
      is_pending: finalIsPending,
      user_id: user.id,
    });

    if (error) return { error: error.message };

    // SEC-12: Revalidate both student and CR note lists so changes show up immediately for all roles
    revalidatePath('/student/notes');
    revalidatePath('/cr/notes');
    
    const notesPath = isCR ? '/cr/notes' : '/student/notes';
    redirect(notesPath);
  } catch (err: any) {
    if (
      err instanceof Error &&
      (err.message === 'NEXT_REDIRECT' || (err as any).digest?.startsWith('NEXT_REDIRECT'))
    ) {
      throw err;
    }
    console.error('createNote error:', err);
    return { error: err.message || 'An unexpected error occurred.' };
  }
}

export async function updateNote(id: string, formData: FormData) {
  try {
    const supabase = await getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const raw = {
      title: formData.get('title') as string,
      content: formData.get('content') as string || undefined,
      drive_link: formData.get('drive_link') as string || undefined,
    };

    const isPublic = formData.get('is_public') === 'on' || formData.get('is_public') === 'true';

    const parsed = NoteSchema.safeParse(raw);
    if (!parsed.success) {
      return { error: parsed.error.issues[0].message };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    const isCR = profile?.role === 'cr' || profile?.role === 'admin';

    let finalIsPublic = false;
    let finalIsPending = false;

    if (isPublic) {
      if (isCR) {
        finalIsPublic = true;
      } else {
        finalIsPending = true;
      }
    }

    let query = supabase
      .from('notes')
      .update({
        title: parsed.data.title,
        content: parsed.data.content ?? null,
        drive_link: parsed.data.drive_link || null,
        is_public: finalIsPublic,
        is_pending: finalIsPending,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (!isCR) {
      query = query.eq('user_id', user.id); // Student can only update own
    }

    const { error } = await query;

    if (error) return { error: error.message };

    // SEC-12: Revalidate all related feeds and single note pages
    revalidatePath('/student/notes');
    revalidatePath(`/student/notes/${id}`);
    revalidatePath('/cr/notes');
    revalidatePath(`/cr/notes/${id}`);

    const notesPath = isCR ? '/cr/notes' : '/student/notes';
    redirect(notesPath);
  } catch (err: any) {
    if (
      err instanceof Error &&
      (err.message === 'NEXT_REDIRECT' || (err as any).digest?.startsWith('NEXT_REDIRECT'))
    ) {
      throw err;
    }
    console.error('updateNote error:', err);
    return { error: err.message || 'An unexpected error occurred.' };
  }
}

export async function deleteNote(id: string) {
  try {
    const supabase = await getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    const isCR = profile?.role === 'cr' || profile?.role === 'admin';

    let query = supabase.from('notes').delete().eq('id', id);
    if (!isCR) {
      query = query.eq('user_id', user.id); // Student can only delete own
    }
    const { error } = await query;

    if (error) return { error: error.message };

    revalidatePath('/student/notes');
    revalidatePath('/cr/notes');
    return { success: true };
  } catch (err: any) {
    console.error('deleteNote error:', err);
    return { error: err.message || 'An unexpected error occurred during deletion.' };
  }
}

export async function bulkDeleteNotes(ids: string[]) {
  try {
    if (!ids || ids.length === 0) return { error: 'No items selected.' };
    const supabase = await getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Unauthorized' };
    
    // SEC-02: Add CR/admin role check before bulk delete
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (!profile || (profile.role !== 'cr' && profile.role !== 'admin')) {
      return { error: 'Unauthorized: Only CRs and Admins can bulk delete resources.' };
    }

    const { error } = await supabase.from('notes').delete().in('id', ids);
    if (error) return { error: error.message };
    revalidatePath('/cr/notes');
    revalidatePath('/student/notes');
    return { success: true };
  } catch (err: any) {
    console.error('bulkDeleteNotes error:', err);
    return { error: err.message || 'An unexpected error occurred.' };
  }
}

export async function approveNote(id: string) {
  try {
    const supabase = await getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    const isCR = profile?.role === 'cr' || profile?.role === 'admin';

    if (!isCR) {
      return { error: 'Unauthorized: Only CRs and Admins can approve resources.' };
    }

    const { error } = await supabase
      .from('notes')
      .update({
        is_public: true,
        is_pending: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) return { error: error.message };

    revalidatePath('/student/notes');
    revalidatePath('/cr/notes');
    return { success: true };
  } catch (err: any) {
    console.error('approveNote error:', err);
    return { error: err.message || 'An unexpected error occurred during approval.' };
  }
}
