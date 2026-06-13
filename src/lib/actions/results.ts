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

const ResultSchema = z.object({
  exam_name: z.string().min(1, 'Exam name is required').max(200),
});

export async function publishResult(formData: FormData) {
  try {
    const supabase = await getSupabaseServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const raw = {
      exam_name: formData.get('exam_name') as string,
    };

    const parsed = ResultSchema.safeParse(raw);
    if (!parsed.success) {
      return { error: parsed.error.issues[0].message };
    }

    // ── Handle result sheet file ─────────────────────────────
    let result_sheet_url: string | null = null;
    const file = formData.get('result_sheet') as File | null;

    if (file && file.size > 0) {
      const isImage = file.type.startsWith('image/');
      const isPDF = file.type === 'application/pdf';

      if (!isImage && !isPDF) {
        return { error: 'Only images and PDF files are accepted.' };
      }

      if (file.size > 5 * 1024 * 1024) {
        return { error: 'File must be under 5 MB.' };
      }

      // ── Step 1: Send ORIGINAL file to Telegram (non-fatal) ──────
      try {
        const caption =
          `📊 *Result Published*\n` +
          `*Exam:* ${parsed.data.exam_name}\n\n` +
          `Results have been published. Check the app for details.`;

        const telegramResult = await sendTelegramFile(file, caption);
        if (!telegramResult.success) {
          console.warn('Telegram result file post failed (non-fatal):', telegramResult.error);
        }
      } catch (err) {
        console.warn('Telegram result file post failed (non-fatal):', err);
      }

      // ── Step 2: Compress file, then upload to Supabase ──────────
      const { buffer, contentType, fileName } = await compressFileForStorage(file);
      const path = generateStoragePath(STORAGE_PATHS.RESULTS, fileName);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKETS.NOTICES)
        .upload(path, buffer, { contentType });

      if (uploadError || !uploadData) {
        return { error: `Upload failed: ${uploadError?.message || 'Unknown upload error'}` };
      }

      const { data: urlData } = supabase.storage
        .from(STORAGE_BUCKETS.NOTICES)
        .getPublicUrl(uploadData.path);

      result_sheet_url = urlData.publicUrl;
    }

    // ── Insert result record ─────────────────────────────────
    const customDate = formData.get('custom_published_at') as string;
    let published_at: string | undefined = undefined;
    if (customDate) {
      let dateStr = customDate;
      if (dateStr.length === 10) {
        dateStr = `${dateStr}T12:00:00+06:00`;
      } else if (!dateStr.includes('+') && !dateStr.endsWith('Z')) {
        dateStr = `${dateStr}+06:00`;
      }
      const dateObj = new Date(dateStr);
      if (!isNaN(dateObj.getTime())) {
        published_at = dateObj.toISOString();
      }
    }

    const { data: result, error: insertError } = await supabase
      .from('exam_results')
      .insert({
        exam_name: parsed.data.exam_name,
        result_sheet_url,
        published_by: user.id,
        ...(published_at ? { published_at } : {}),
      })
      .select('id')
      .single();

    if (insertError || !result) {
      return { error: `Failed to publish result: ${insertError?.message || 'Unknown insert error'}` };
    }

    // ── Broadcast in-app notifications to all students ───────
    const { error: rpcError } = await supabase.rpc('broadcast_notification', {
      p_title: `Exam Result: ${parsed.data.exam_name}`,
      p_message: `Results have been published. Check your marksheet.`,
      p_type: 'result',
      p_reference_id: result.id,
    });

    if (rpcError) {
      console.error('broadcast_notification RPC error:', rpcError);
    }

    // Send Web Push notification (browsers)
    try {
      await sendWebPush({
        title: `📊 Result Published: ${parsed.data.exam_name}`,
        body: `Exam results are available. Check your marksheet in the app.`,
        url: '/student/results',
      });
    } catch (pushErr) {
      console.error('Web push notification failed (non-fatal):', pushErr);
    }

    // Send FCM push notification (Android APK)
    try {
      await sendFCMPush({
        title: `📊 Result Published: ${parsed.data.exam_name}`,
        body: `Exam results are available. Check your marksheet in the app.`,
        url: '/student/results',
      });
    } catch (fcmErr) {
      console.error('FCM push notification failed (non-fatal):', fcmErr);
    }

    // ── If no file was attached, send a text-only Telegram post ─
    if (!file || file.size === 0) {
      try {
        const telegramTitle = `📊 Result Published`;
        const telegramBody = `*Exam:* ${parsed.data.exam_name}\n\nResults have been published. Students can check their results in the app.`;
        const telegramResult = await sendTelegramMessage(telegramTitle, telegramBody);
        if (!telegramResult.success) {
          console.warn('Telegram result post failed (non-fatal):', telegramResult.error);
        }
      } catch (err) {
        console.warn('Telegram result post failed (non-fatal):', err);
      }
    }

    const redirectTo = formData.get('redirect_to') as string;
    revalidatePath('/cr/results');
    revalidatePath('/cr/timeline');
    revalidatePath('/student/timeline');
    
    if (redirectTo === 'timeline') {
      redirect('/cr/timeline');
    } else {
      redirect('/cr/results');
    }
  } catch (err: any) {
    if (
      err instanceof Error &&
      (err.message === 'NEXT_REDIRECT' || (err as any).digest?.startsWith('NEXT_REDIRECT'))
    ) {
      throw err;
    }
    console.error('publishResult error:', err);
    return { error: err.message || 'An unexpected error occurred.' };
  }
}

export async function deleteResult(id: string) {
  try {
    const supabase = await getSupabaseServerClient();
    const { error } = await supabase.from('exam_results').delete().eq('id', id);
    if (error) return { error: error.message };
    revalidatePath('/cr/results');
    return { success: true };
  } catch (err: any) {
    console.error('deleteResult error:', err);
    return { error: err.message || 'An unexpected error occurred during deletion.' };
  }
}
