'use server';

import { getSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { sendWebPush, sendFCMPush } from '@/lib/actions/push';

const DeadlineSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  subject: z.string().min(1, 'Subject is required').max(100),
  due_date: z.string().min(1, 'Due date is required'),
  description: z.string().max(1000).optional(),
});

export async function createDeadline(formData: FormData) {
  try {
    const supabase = await getSupabaseServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const raw = {
      title: formData.get('title') as string,
      subject: formData.get('subject') as string,
      due_date: formData.get('due_date') as string,
      description: (formData.get('description') as string) || undefined,
    };

    const parsed = DeadlineSchema.safeParse(raw);
    if (!parsed.success) {
      return { error: parsed.error.issues[0].message };
    }

    let due_date = parsed.data.due_date;
    if (due_date && !due_date.includes('+') && !due_date.endsWith('Z')) {
      due_date = due_date + '+06:00';
    }

    const { data: deadline, error } = await supabase
      .from('deadlines')
      .insert({
        title: parsed.data.title,
        subject: parsed.data.subject,
        due_date: due_date,
        description: parsed.data.description ?? null,
        created_by: user.id,
      })
      .select('id')
      .single();

    if (error || !deadline) {
      return { error: error?.message || 'Failed to create deadline.' };
    }

    // ── Broadcast in-app notifications to all students ───────
    const { error: rpcError } = await supabase.rpc('broadcast_notification', {
      p_title: parsed.data.title,
      p_message: `New deadline for ${parsed.data.subject}.`,
      p_type: 'deadline',
      p_reference_id: deadline.id,
    });

    if (rpcError) {
      console.error('broadcast_notification RPC error:', rpcError);
    }

    // Send Web Push notification (browsers)
    try {
      // Format simple relative date check if possible, or just print the subject
      await sendWebPush({
        title: `⏰ Deadline: ${parsed.data.title}`,
        body: `New deadline for ${parsed.data.subject}.`,
        url: '/student/deadlines',
      });
    } catch (pushErr) {
      console.error('Web push notification failed (non-fatal):', pushErr);
    }

    // Send FCM push notification (Android APK)
    try {
      await sendFCMPush({
        title: `⏰ Deadline: ${parsed.data.title}`,
        body: `New deadline for ${parsed.data.subject}.`,
        url: '/student/deadlines',
      });
    } catch (fcmErr) {
      console.error('FCM push notification failed (non-fatal):', fcmErr);
    }

    const redirectTo = formData.get('redirect_to') as string;
    revalidatePath('/cr/deadlines');
    revalidatePath('/student/deadlines');
    revalidatePath('/cr/timeline');
    revalidatePath('/student/timeline');

    if (redirectTo === 'timeline') {
      redirect('/cr/timeline');
    } else {
      redirect('/cr/deadlines');
    }
  } catch (err: any) {
    if (
      err instanceof Error &&
      (err.message === 'NEXT_REDIRECT' || (err as any).digest?.startsWith('NEXT_REDIRECT'))
    ) {
      throw err;
    }
    console.error('createDeadline error:', err);
    return { error: err.message || 'An unexpected error occurred.' };
  }
}

export async function deleteDeadline(id: string) {
  try {
    const supabase = await getSupabaseServerClient();
    const { error } = await supabase.from('deadlines').delete().eq('id', id);
    if (error) return { error: error.message };
    revalidatePath('/cr/deadlines');
    revalidatePath('/student/deadlines');
    return { success: true };
  } catch (err: any) {
    console.error('deleteDeadline error:', err);
    return { error: err.message || 'An unexpected error occurred during deletion.' };
  }
}
