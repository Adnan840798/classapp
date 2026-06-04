'use server';

import { getSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { STORAGE_BUCKETS, STORAGE_PATHS } from '@/lib/constants';
import { generateStoragePath } from '@/lib/utils/formatters';
import { sendTelegramMessage } from '@/lib/telegram';

const AnnouncementSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  body: z.string().min(1, 'Body is required').max(5000),
  is_important: z.boolean().default(false),
  is_public: z.boolean().default(false),
});

export async function createAnnouncement(formData: FormData) {
  const supabase = await getSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const raw = {
    title: formData.get('title') as string,
    body: formData.get('body') as string,
    is_important: formData.get('is_important') === 'true',
    is_public: formData.get('is_public') === 'true',
  };

  const parsed = AnnouncementSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  // Handle file upload
  let attachment_url: string | null = null;
  let attachment_type: 'image' | 'pdf' | null = null;

  const file = formData.get('attachment') as File | null;
  if (file && file.size > 0) {
    const isImage = file.type.startsWith('image/');
    const isPDF = file.type === 'application/pdf';

    if (!isImage && !isPDF) {
      return { error: 'Only images and PDF files are accepted.' };
    }
    if (file.size > 5 * 1024 * 1024) {
      return { error: 'File must be under 5MB.' };
    }

    const path = generateStoragePath(STORAGE_PATHS.ANNOUNCEMENTS, file.name);
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKETS.NOTICES)
      .upload(path, file, { contentType: file.type, upsert: false });

    if (uploadError) {
      return { error: `Upload failed: ${uploadError.message}` };
    }

    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKETS.NOTICES)
      .getPublicUrl(uploadData.path);

    attachment_url = urlData.publicUrl;
    attachment_type = isImage ? 'image' : 'pdf';
  }

  // Insert announcement
  const { data: announcement, error: insertError } = await supabase
    .from('announcements')
    .insert({
      title: parsed.data.title,
      body: parsed.data.body,
      is_important: parsed.data.is_important,
      is_public: parsed.data.is_public,
      attachment_url,
      attachment_type,
      created_by: user.id,
    })
    .select('id')
    .single();

  if (insertError || !announcement) {
    return { error: `Failed to create announcement: ${insertError?.message}` };
  }

  // Broadcast in-app notifications to all students
  const { error: rpcError } = await supabase.rpc('broadcast_notification', {
    p_title: parsed.data.title,
    p_message: parsed.data.body.slice(0, 200),
    p_type: 'announcement',
    p_reference_id: announcement.id,
  });

  if (rpcError) {
    console.error('broadcast_notification RPC error:', rpcError);
  }

  // Post to Telegram (non-blocking, direct server call)
  try {
    const result = await sendTelegramMessage(parsed.data.title, parsed.data.body);
    if (result.success) {
      await supabase
        .from('announcements')
        .update({ telegram_posted: true })
        .eq('id', announcement.id);
    } else {
      console.warn('Telegram post failed (non-fatal):', result.error);
    }
  } catch (err) {
    console.warn('Telegram post failed (non-fatal):', err);
  }

  revalidatePath('/cr/announcements');
  redirect('/cr/announcements');
}

export async function deleteAnnouncement(id: string) {
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.from('announcements').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/cr/announcements');
  return { success: true };
}
