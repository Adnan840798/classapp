'use server';

import { getSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { STORAGE_BUCKETS, STORAGE_PATHS } from '@/lib/constants';
import { generateStoragePath } from '@/lib/utils/formatters';
import { sendTelegramMessage, sendTelegramFile } from '@/lib/telegram';
import { compressFileForStorage } from '@/lib/utils/compress';
import { sendWebPush, sendFCMPush } from '@/lib/actions/push';

const AnnouncementSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  body: z.string().min(1, 'Body is required').max(5000),
  is_public: z.boolean().default(false),
});

export async function createAnnouncement(formData: FormData) {
  try {
    const supabase = await getSupabaseServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const raw = {
      title: formData.get('title') as string,
      body: formData.get('body') as string,
      is_public: formData.get('is_public') === 'true',
    };

    const parsed = AnnouncementSchema.safeParse(raw);
    if (!parsed.success) {
      return { error: parsed.error.issues[0].message };
    }

    // ── Handle file attachment ───────────────────────────────
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
        return { error: 'File must be under 5 MB.' };
      }

      // ── Step 1: Send ORIGINAL file to Telegram first (non-fatal) ──
      try {
        const caption = `📢 ${parsed.data.title}\n\n${parsed.data.body.slice(0, 900)}`;
        const telegramResult = await sendTelegramFile(file, caption);
        if (!telegramResult.success) {
          console.warn('Telegram file post failed (non-fatal):', telegramResult.error);
        }
      } catch (err) {
        console.warn('Telegram file post failed (non-fatal):', err);
      }

      // ── Step 2: Compress file for Supabase storage ──────────────
      const { buffer, contentType, fileName } = await compressFileForStorage(file);
      const path = generateStoragePath(STORAGE_PATHS.ANNOUNCEMENTS, fileName);

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

    // ── Insert announcement ──────────────────────────────────
    const customDate = formData.get('custom_created_at') as string;
    let created_at: string | undefined = undefined;
    if (customDate) {
      let dateStr = customDate;
      if (dateStr.length === 10) {
        dateStr = `${dateStr}T12:00:00+06:00`;
      } else if (!dateStr.includes('+') && !dateStr.endsWith('Z')) {
        dateStr = `${dateStr}+06:00`;
      }
      const dateObj = new Date(dateStr);
      if (!isNaN(dateObj.getTime())) {
        created_at = dateObj.toISOString();
      }
    }

    const { data: announcement, error: insertError } = await supabase
      .from('announcements')
      .insert({
        title: parsed.data.title,
        body: parsed.data.body,
        is_important: true, // always important
        is_public: parsed.data.is_public,
        attachment_url,
        attachment_type,
        created_by: user.id,
        ...(created_at ? { created_at } : {}),
      })
      .select('id')
      .single();

    if (insertError || !announcement) {
      return { error: `Failed to create announcement: ${insertError?.message || 'Unknown insert error'}` };
    }

    // ── Broadcast in-app notifications to all students ───────
    const { error: rpcError } = await supabase.rpc('broadcast_notification', {
      p_title: parsed.data.title,
      p_message: parsed.data.body.slice(0, 200),
      p_type: 'announcement',
      p_reference_id: announcement.id,
    });

    if (rpcError) {
      console.error('broadcast_notification RPC error:', rpcError);
    }

    // Send Web Push notification (browsers)
    try {
      await sendWebPush({
        title: `📢 ${parsed.data.title}`,
        body: parsed.data.body.slice(0, 150),
        url: '/student/announcements',
      });
    } catch (pushErr) {
      console.error('Web push notification failed (non-fatal):', pushErr);
    }

    // Send FCM push notification (Android APK)
    try {
      await sendFCMPush({
        title: `📢 ${parsed.data.title}`,
        body: parsed.data.body.slice(0, 150),
        url: '/student/announcements',
      });
    } catch (fcmErr) {
      console.error('FCM push notification failed (non-fatal):', fcmErr);
    }

    // ── Post text message to Telegram if no file was attached ─
    // (If there was a file, the caption already contained the text above)
    if (!file || file.size === 0) {
      try {
        const result = await sendTelegramMessage(parsed.data.title, parsed.data.body);
        if (result.success) {
          await supabase
            .from('announcements')
            .update({ telegram_posted: true })
            .eq('id', announcement.id);
        } else {
          console.warn('Telegram text post failed (non-fatal):', result.error);
        }
      } catch (err) {
        console.warn('Telegram text post failed (non-fatal):', err);
      }
    } else {
      // Mark as posted (file was already sent above)
      await supabase
        .from('announcements')
        .update({ telegram_posted: true })
        .eq('id', announcement.id);
    }

    const redirectTo = formData.get('redirect_to') as string;
    revalidatePath('/cr/announcements');
    revalidatePath('/cr/timeline');
    revalidatePath('/student/timeline');
    
    if (redirectTo === 'timeline') {
      redirect('/cr/timeline');
    } else {
      redirect('/cr/announcements');
    }
  } catch (err: any) {
    if (
      err instanceof Error &&
      (err.message === 'NEXT_REDIRECT' || (err as any).digest?.startsWith('NEXT_REDIRECT'))
    ) {
      throw err;
    }
    console.error('createAnnouncement error:', err);
    return { error: err.message || 'An unexpected error occurred.' };
  }
}

export async function deleteAnnouncement(id: string) {
  try {
    const supabase = await getSupabaseServerClient();
    const { error } = await supabase.from('announcements').delete().eq('id', id);
    if (error) return { error: error.message };
    revalidatePath('/cr/announcements');
    return { success: true };
  } catch (err: any) {
    console.error('deleteAnnouncement error:', err);
    return { error: err.message || 'An unexpected error occurred during deletion.' };
  }
}
