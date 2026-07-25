'use server';

import { getSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { sendWebPush, sendFCMPush } from '@/lib/actions/push';
import { sendTelegramMessage } from '@/lib/telegram';

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
      await sendWebPush({
        title: `📅 Deadline | ${parsed.data.title}`,
        body: `New deadline for ${parsed.data.subject}.`,
        url: `/student/deadlines/${deadline.id}`,
      });
    } catch (pushErr) {
      console.error('Web push notification failed (non-fatal):', pushErr);
    }

    // Send FCM push notification (Android APK)
    try {
      await sendFCMPush({
        title: `📅 Deadline | ${parsed.data.title}`,
        body: `New deadline for ${parsed.data.subject}.`,
        url: `/student/deadlines/${deadline.id}`,
      });
    } catch (fcmErr) {
      console.error('FCM push notification failed (non-fatal):', fcmErr);
    }

    // ── Post to Telegram channel ─────────────────────────────
    try {
      const telegramBody = parsed.data.description
        ? `${parsed.data.description}\n\n📅 Due: ${new Date(due_date).toLocaleString('en-BD', { timeZone: 'Asia/Dhaka', dateStyle: 'medium', timeStyle: 'short' })}`
        : `📅 Due: ${new Date(due_date).toLocaleString('en-BD', { timeZone: 'Asia/Dhaka', dateStyle: 'medium', timeStyle: 'short' })}`;
      const telegramResult = await sendTelegramMessage(
        `📅 Deadline | ${parsed.data.subject}: ${parsed.data.title}`,
        telegramBody
      );
      if (!telegramResult.success) {
        console.warn('Telegram deadline post failed (non-fatal):', telegramResult.error);
      }
    } catch (err) {
      console.warn('Telegram deadline post failed (non-fatal):', err);
    }

    const redirectTo = formData.get('redirect_to') as string;
    revalidateTag('deadlines', { expire: 0 }); // SEC-07 fix
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
    // SEC-01 fix: enforce CR/admin role
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Unauthorized' };
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (!profile || (profile.role !== 'cr' && profile.role !== 'admin')) {
      return { error: 'Unauthorized: Only CRs and Admins can delete deadlines.' };
    }
    // Delete associated in-app notifications
    await supabase.from('notifications').delete().eq('reference_id', id).eq('type', 'deadline');
    const { error } = await supabase.from('deadlines').delete().eq('id', id);
    if (error) return { error: error.message };
    revalidateTag('deadlines', { expire: 0 }); // SEC-07 fix
    revalidatePath('/cr/deadlines');
    revalidatePath('/student/deadlines');
    return { success: true };
  } catch (err: any) {
    console.error('deleteDeadline error:', err);
    return { error: err.message || 'An unexpected error occurred during deletion.' };
  }
}

export async function bulkDeleteDeadlines(ids: string[]) {
  try {
    if (!ids || ids.length === 0) return { error: 'No items selected.' };
    const supabase = await getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Unauthorized' };
    // SEC-01 fix: enforce CR/admin role
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (!profile || (profile.role !== 'cr' && profile.role !== 'admin')) {
      return { error: 'Unauthorized: Only CRs and Admins can delete deadlines.' };
    }
    // Delete associated in-app notifications in bulk
    await supabase.from('notifications').delete().in('reference_id', ids).eq('type', 'deadline');
    const { error } = await supabase.from('deadlines').delete().in('id', ids);
    if (error) return { error: error.message };
    revalidateTag('deadlines', { expire: 0 }); // SEC-07 fix
    revalidatePath('/cr/deadlines');
    revalidatePath('/student/deadlines');
    return { success: true };
  } catch (err: any) {
    console.error('bulkDeleteDeadlines error:', err);
    return { error: err.message || 'An unexpected error occurred.' };
  }
}

export async function updateDeadline(id: string, formData: FormData) {
  try {
    const supabase = await getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Unauthorized' };
    // SEC-14 fix: enforce CR/admin role at the server — UI guard alone is not sufficient
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (!profile || (profile.role !== 'cr' && profile.role !== 'admin')) {
      return { error: 'Unauthorized: Only CRs and Admins can update deadlines.' };
    }

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

    const { error } = await supabase
      .from('deadlines')
      .update({
        title: parsed.data.title,
        subject: parsed.data.subject,
        due_date: due_date,
        description: parsed.data.description ?? null,
      })
      .eq('id', id);

    if (error) return { error: error.message };

    revalidateTag('deadlines', { expire: 0 }); // SEC-07 fix
    revalidatePath(`/cr/deadlines/${id}`);
    revalidatePath(`/student/deadlines/${id}`);
    revalidatePath('/cr/deadlines');
    revalidatePath('/student/deadlines');
    revalidatePath('/cr/timeline');
    revalidatePath('/student/timeline');

    return { success: true };
  } catch (err: any) {
    console.error('updateDeadline error:', err);
    return { error: err.message || 'An unexpected error occurred.' };
  }
}

