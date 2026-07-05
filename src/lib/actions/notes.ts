'use server';

import { getSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { STORAGE_BUCKETS, STORAGE_PATHS } from '@/lib/constants';
import { generateStoragePath } from '@/lib/utils/formatters';
import { sendTelegramMessage, sendTelegramFile, escapeHTML } from '@/lib/telegram';

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

    // ── Handle file attachment (CR only) ──────────────────────────────────
    let attachment_url: string | null = null;
    let attachment_type: 'image' | 'pdf' | null = null;

    if (isCR) {
      const file = formData.get('attachment') as File | null;
      if (file && file.size > 0) {
        const isImage = file.type.startsWith('image/');
        const isPDF = file.type === 'application/pdf';

        if (!isImage && !isPDF) {
          return { error: 'Only images and PDF files are accepted as attachments.' };
        }
        if (file.size > 5 * 1024 * 1024) {
          return { error: 'Attachment must be under 5 MB.' };
        }

        // Post to Telegram first (before compressing for storage) — only if public
        if (finalIsPublic) {
          try {
            const caption =
              `📚 <b>New Resource</b>\n` +
              `<b>${escapeHTML(parsed.data.title)}</b>\n\n` +
              (parsed.data.content ? escapeHTML(parsed.data.content).slice(0, 900) : '');
            const telegramResult = await sendTelegramFile(file, caption);
            if (!telegramResult.success) {
              console.warn('Telegram resource file post failed (non-fatal):', telegramResult.error);
            }
          } catch (err) {
            console.warn('Telegram resource file post failed (non-fatal):', err);
          }
        }

        // Compress and store
        const { compressFileForStorage } = await import('@/lib/utils/compress');
        const { buffer, contentType, fileName } = await compressFileForStorage(file);
        const path = generateStoragePath(STORAGE_PATHS.RESOURCES, fileName);

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(STORAGE_BUCKETS.NOTICES)
          .upload(path, buffer, { contentType, upsert: false });

        if (uploadError || !uploadData) {
          return { error: `Upload failed: ${uploadError?.message || 'Unknown upload error'}` };
        }

        const { data: urlData } = supabase.storage
          .from(STORAGE_BUCKETS.NOTICES)
          .getPublicUrl(uploadData.path);

        attachment_url = urlData.publicUrl;
        attachment_type = isImage ? 'image' : 'pdf';
      }
    }

    const { error } = await supabase.from('notes').insert({
      title: parsed.data.title,
      content: parsed.data.content ?? null,
      drive_link: parsed.data.drive_link || null,
      attachment_url,
      attachment_type,
      is_public: finalIsPublic,
      is_pending: finalIsPending,
      user_id: user.id,
    });

    if (error) return { error: error.message };

    // Post text-only resource to Telegram if CR made it public and no file was attached
    if (isCR && finalIsPublic && !attachment_url) {
      try {
        const result = await sendTelegramMessage(
          `📚 New Resource: ${parsed.data.title}`,
          parsed.data.content || parsed.data.drive_link || 'No description provided.'
        );
        if (!result.success) {
          console.warn('Telegram resource text post failed (non-fatal):', result.error);
        }
      } catch (err) {
        console.warn('Telegram resource text post failed (non-fatal):', err);
      }
    }

    // SEC-12: Revalidate both student and CR note lists so changes show up immediately for all roles
    revalidatePath('/student/notes');
    revalidatePath('/cr/notes');
    // Bust the getCachedResources cache so hub context gets fresh public resources
    revalidateTag('resources', { expire: 0 });
    
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
    // Bust the getCachedResources cache so hub context gets fresh public resources
    revalidateTag('resources', { expire: 0 });

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
    // Bust the getCachedResources cache in case a public note was deleted
    revalidateTag('resources', { expire: 0 });
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
    // Bust the getCachedResources cache — bulk delete may remove public notes
    revalidateTag('resources', { expire: 0 });
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

    // Fetch the note content so we can post it to Telegram
    const { data: note } = await supabase
      .from('notes')
      .select('title, content, drive_link, attachment_url, attachment_type')
      .eq('id', id)
      .single();

    const { error } = await supabase
      .from('notes')
      .update({
        is_public: true,
        is_pending: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) return { error: error.message };

    // Post approved resource to Telegram
    if (note) {
      try {
        if (note.attachment_url) {
          // Fetch the file bytes and send to Telegram
          const fileRes = await fetch(note.attachment_url);
          if (fileRes.ok) {
            const blob = await fileRes.blob();
            const ext = note.attachment_type === 'pdf' ? 'pdf' : 'jpg';
            const file = new File([blob], `resource.${ext}`, { type: blob.type });
            const caption =
              `📚 <b>Approved Resource</b>\n` +
              `<b>${escapeHTML(note.title)}</b>\n\n` +
              (note.content ? escapeHTML(note.content).slice(0, 900) : '');
            await sendTelegramFile(file, caption).catch((err) =>
              console.warn('Telegram approved resource file post failed (non-fatal):', err)
            );
          }
        } else {
          const body = note.content || note.drive_link || 'No description provided.';
          await sendTelegramMessage(`📚 Approved Resource: ${note.title}`, body).catch((err) =>
            console.warn('Telegram approved resource text post failed (non-fatal):', err)
          );
        }
      } catch (err) {
        console.warn('Telegram approved resource post failed (non-fatal):', err);
      }
    }

    revalidatePath('/student/notes');
    revalidatePath('/cr/notes');
    // Bust the getCachedResources cache — approved note is now publicly visible
    revalidateTag('resources', { expire: 0 });
    return { success: true };
  } catch (err: any) {
    console.error('approveNote error:', err);
    return { error: err.message || 'An unexpected error occurred during approval.' };
  }
}

/**
 * getMyPrivateNotes — returns the authenticated user's own private/pending notes.
 *
 * Called client-side by HubResources when the hub context is not hydrated
 * (i.e. direct URL navigation to /student/notes). This avoids requiring the
 * server page to fetch user-specific data and pass it as a prop.
 */
export async function getMyPrivateNotes(): Promise<{ data: any[]; error: string | null }> {
  try {
    const supabase = await getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: [], error: 'Unauthorized' };

    const { data, error } = await supabase
      .from('notes')
      .select('*, attachment_url, attachment_type, creator:profiles!user_id(full_name)')
      .eq('user_id', user.id)
      .eq('is_public', false)
      .order('updated_at', { ascending: false });

    if (error) return { data: [], error: error.message };
    return { data: data ?? [], error: null };
  } catch (err: any) {
    console.error('getMyPrivateNotes error:', err);
    return { data: [], error: err.message || 'Unexpected error.' };
  }
}
