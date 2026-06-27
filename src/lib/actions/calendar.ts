'use server';

import { getSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { sendFCMPush } from '@/lib/actions/push';

const CalendarEventSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  event_date: z.string().min(1, 'Event date is required'),
  event_type: z.enum(['exam', 'class', 'holiday', 'submission', 'other']).default('other'),
  is_public: z.boolean().default(true),
  qa_enabled: z.boolean().default(true),
});

export async function createCalendarEvent(formData: FormData) {
  try {
    const supabase = await getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    // SEC-03: Enforce CR/admin role for createCalendarEvent
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (!profile || (profile.role !== 'cr' && profile.role !== 'admin')) {
      return { error: 'Unauthorized: Only CRs and Admins can create calendar events.' };
    }

    const raw = {
      title: formData.get('title') as string,
      description: (formData.get('description') as string) || undefined,
      event_date: formData.get('event_date') as string,
      event_type: formData.get('event_type') as string || 'other',
      is_public: formData.get('is_public') === 'true',
      qa_enabled: formData.get('qa_enabled') === 'true',
    };

    const parsed = CalendarEventSchema.safeParse(raw);
    if (!parsed.success) return { error: parsed.error.issues[0].message };

    const { error } = await supabase.from('calendar_events').insert({
      ...parsed.data,
      description: parsed.data.description ?? null,
      created_by: user.id,
    });

    if (error) return { error: error.message };

    revalidatePath('/cr/calendar');
    revalidatePath('/student/calendar');
    
    // SEC-11: Redirect using role-appropriate path
    const redirectPath = (profile.role === 'cr' || profile.role === 'admin') ? '/cr/calendar' : '/student/calendar';
    redirect(redirectPath);
  } catch (err: any) {
    if (
      err instanceof Error &&
      (err.message === 'NEXT_REDIRECT' || (err as any).digest?.startsWith('NEXT_REDIRECT'))
    ) {
      throw err;
    }
    console.error('createCalendarEvent error:', err);
    return { error: err.message || 'An unexpected error occurred.' };
  }
}

export async function updateCalendarEvent(id: string, formData: FormData) {
  try {
    const supabase = await getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    // SEC-03: Enforce CR/admin role for updateCalendarEvent
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (!profile || (profile.role !== 'cr' && profile.role !== 'admin')) {
      return { error: 'Unauthorized: Only CRs and Admins can update calendar events.' };
    }

    const { error } = await supabase
      .from('calendar_events')
      .update({
        title: formData.get('title') as string,
        description: (formData.get('description') as string) || null,
        event_date: formData.get('event_date') as string,
        event_type: formData.get('event_type') as string || 'other',
        is_public: formData.get('is_public') === 'true',
        qa_enabled: formData.get('qa_enabled') === 'true',
      })
      .eq('id', id);

    if (error) return { error: error.message };

    revalidatePath('/cr/calendar');
    revalidatePath('/student/calendar');
    
    const redirectPath = (profile.role === 'cr' || profile.role === 'admin') ? '/cr/calendar' : '/student/calendar';
    redirect(redirectPath);
  } catch (err: any) {
    if (
      err instanceof Error &&
      (err.message === 'NEXT_REDIRECT' || (err as any).digest?.startsWith('NEXT_REDIRECT'))
    ) {
      throw err;
    }
    console.error('updateCalendarEvent error:', err);
    return { error: err.message || 'An unexpected error occurred.' };
  }
}

export async function deleteCalendarEvent(id: string) {
  try {
    const supabase = await getSupabaseServerClient();
    
    // SEC-03: Enforce auth and CR/admin role check for deleteCalendarEvent
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Unauthorized' };
    
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (!profile || (profile.role !== 'cr' && profile.role !== 'admin')) {
      return { error: 'Unauthorized: Only CRs and Admins can delete calendar events.' };
    }

    const { error } = await supabase.from('calendar_events').delete().eq('id', id);
    if (error) return { error: error.message };
    revalidatePath('/cr/calendar');
    revalidatePath('/student/calendar');
    return { success: true };
  } catch (err: any) {
    console.error('deleteCalendarEvent error:', err);
    return { error: err.message || 'An unexpected error occurred during deletion.' };
  }
}

// Helper to revalidate paths for a question
async function revalidateQuestionPaths(supabase: any, questionId: string) {
  const { data: q } = await supabase
    .from('timeline_questions')
    .select('event_id, announcement_id, deadline_id')
    .eq('id', questionId)
    .single();

  if (q) {
    if (q.event_id) {
      revalidatePath(`/cr/calendar/${q.event_id}`);
      revalidatePath(`/student/calendar/${q.event_id}`);
    } else if (q.announcement_id) {
      revalidatePath(`/cr/announcements/${q.announcement_id}`);
      revalidatePath(`/student/announcements/${q.announcement_id}`);
    } else if (q.deadline_id) {
      revalidatePath(`/cr/deadlines/${q.deadline_id}`);
      revalidatePath(`/student/deadlines/${q.deadline_id}`);
    }
  }
}

// Q&A actions
export async function answerQuestion(questionId: string, formData: FormData) {
  try {
    const supabase = await getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    // SEC-04: Add role check to answerQuestion
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (!profile || (profile.role !== 'cr' && profile.role !== 'admin')) {
      return { error: 'Unauthorized: Only CRs and Admins can answer questions.' };
    }

    const answer = formData.get('answer') as string;
    if (!answer || answer.length > 1000) return { error: 'Invalid answer.' };

    const { error } = await supabase.from('timeline_answers').insert({
      question_id: questionId,
      answered_by: user.id,
      answer,
    });

    if (error) return { error: error.message };

    // Fetch the question details to find who asked it and what context it belongs to
    const { data: questionData } = await supabase
      .from('timeline_questions')
      .select('asked_by, event_id, announcement_id, deadline_id')
      .eq('id', questionId)
      .single();

    if (questionData && questionData.asked_by) {
      // Check if the student profile exists (not deleted)
      const { data: studentProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', questionData.asked_by)
        .maybeSingle();

      if (studentProfile && studentProfile.id !== user.id) {
        const referenceId = questionData.announcement_id || questionData.deadline_id || questionData.event_id;

        // 1. Send targeted in-app notification
        const { error: notifError } = await supabase.rpc('notify_single_student', {
          p_student_id: studentProfile.id,
          p_title: 'CR Answered Your Question',
          p_message: answer.length > 150 ? `${answer.slice(0, 147)}...` : answer,
          p_type: 'qna',
          p_reference_id: referenceId,
        });

        if (notifError) {
          console.error('[answerQuestion] Failed to notify student in-app:', notifError);
        }

        // 2. Send targeted FCM push notification to the specific student
        try {
          await sendFCMPush({
            title: '💬 CR Answered Your Question',
            body: answer.length > 120 ? `${answer.slice(0, 117)}...` : answer,
            url: '/student/timeline',
            targetUserId: studentProfile.id,
          });
        } catch (fcmErr) {
          console.error('[answerQuestion] FCM push notification failed (non-fatal):', fcmErr);
        }
      }
    }
    
    await revalidateQuestionPaths(supabase, questionId);
    return { success: true };
  } catch (err: any) {
    if (
      err instanceof Error &&
      (err.message === 'NEXT_REDIRECT' || (err as any).digest?.startsWith('NEXT_REDIRECT'))
    ) {
      throw err;
    }
    console.error('answerQuestion error:', err);
    return { error: err.message || 'An unexpected error occurred.' };
  }
}

export async function resolveQuestion(questionId: string) {
  try {
    const supabase = await getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    // SEC-04: Add role check to resolveQuestion
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (!profile || (profile.role !== 'cr' && profile.role !== 'admin')) {
      return { error: 'Unauthorized: Only CRs and Admins can resolve questions.' };
    }

    const { error } = await supabase
      .from('timeline_questions')
      .update({ is_resolved: true, resolved_by: user.id, resolved_at: new Date().toISOString() })
      .eq('id', questionId);

    if (error) return { error: error.message };

    await revalidateQuestionPaths(supabase, questionId);
    return { success: true };
  } catch (err: any) {
    if (
      err instanceof Error &&
      (err.message === 'NEXT_REDIRECT' || (err as any).digest?.startsWith('NEXT_REDIRECT'))
    ) {
      throw err;
    }
    console.error('resolveQuestion error:', err);
    return { error: err.message || 'An unexpected error occurred.' };
  }
}

export async function askQuestion(
  entityId: string,
  entityType: 'event' | 'announcement' | 'deadline',
  formData: FormData
) {
  try {
    const supabase = await getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const question = formData.get('question') as string;
    // SEC-13 fix: trim whitespace-only input and check question boundary correctly
    const trimmedQuestion = question ? question.trim() : '';
    if (trimmedQuestion.length === 0 || trimmedQuestion.length > 500) {
      return { error: 'Question must be 1–500 characters.' };
    }

    const insertData: Record<string, any> = {
      asked_by: user.id,
      question: trimmedQuestion,
    };

    if (entityType === 'event') {
      insertData.event_id = entityId;
    } else if (entityType === 'announcement') {
      insertData.announcement_id = entityId;
    } else if (entityType === 'deadline') {
      insertData.deadline_id = entityId;
    }

    const { error } = await supabase.from('timeline_questions').insert(insertData);

    if (error) return { error: error.message };

    if (entityType === 'event') {
      revalidatePath(`/student/calendar/${entityId}`);
    } else if (entityType === 'announcement') {
      revalidatePath(`/student/announcements/${entityId}`);
    } else if (entityType === 'deadline') {
      revalidatePath(`/student/deadlines/${entityId}`);
    }

    return { success: true };
  } catch (err: any) {
    if (
      err instanceof Error &&
      (err.message === 'NEXT_REDIRECT' || (err as any).digest?.startsWith('NEXT_REDIRECT'))
    ) {
      throw err;
    }
    console.error('askQuestion error:', err);
    return { error: err.message || 'An unexpected error occurred.' };
  }
}

export async function editQuestion(questionId: string, formData: FormData) {
  try {
    const supabase = await getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const question = formData.get('question') as string;
    if (!question || question.length > 500) {
      return { error: 'Question must be 1–500 characters.' };
    }

    // 1. Fetch the question to verify details and resolution state
    const { data: q, error: fetchErr } = await supabase
      .from('timeline_questions')
      .select('is_resolved, asked_by')
      .eq('id', questionId)
      .single();

    if (fetchErr || !q) return { error: 'Question not found.' };
    if (q.is_resolved) return { error: 'Cannot edit a resolved question.' };
    if (q.asked_by !== user.id) return { error: 'Unauthorized.' };

    // 2. Perform the update
    const { error } = await supabase
      .from('timeline_questions')
      .update({ question })
      .eq('id', questionId)
      .eq('asked_by', user.id)
      .eq('is_resolved', false);

    if (error) return { error: error.message };

    await revalidateQuestionPaths(supabase, questionId);
    return { success: true };
  } catch (err: any) {
    if (
      err instanceof Error &&
      (err.message === 'NEXT_REDIRECT' || (err as any).digest?.startsWith('NEXT_REDIRECT'))
    ) {
      throw err;
    }
    console.error('editQuestion error:', err);
    return { error: err.message || 'An unexpected error occurred.' };
  }
}

export async function editAnswer(answerId: string, formData: FormData) {
  try {
    const supabase = await getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const answer = formData.get('answer') as string;
    if (!answer || answer.length > 1000) {
      return { error: 'Answer must be 1–1000 characters.' };
    }

    // 1. Fetch answer & parent question to check resolution state
    const { data: ans, error: fetchErr } = await supabase
      .from('timeline_answers')
      .select('question_id, answered_by, question:timeline_questions(is_resolved, asked_by, event_id, announcement_id, deadline_id)')
      .eq('id', answerId)
      .single();

    if (fetchErr || !ans) return { error: 'Answer not found.' };
    
    const parentQuestion = ans.question as any;
    if (!parentQuestion) return { error: 'Associated question not found.' };
    if (parentQuestion.is_resolved) return { error: 'Cannot edit an answer to a resolved question.' };
    if (ans.answered_by !== user.id) return { error: 'Unauthorized.' };

    // 2. Perform the update on timeline_answers
    const { error } = await supabase
      .from('timeline_answers')
      .update({ answer })
      .eq('id', answerId)
      .eq('answered_by', user.id);

    if (error) return { error: error.message };

    // 3. Update student notification if exists
    const referenceId = parentQuestion.announcement_id || parentQuestion.deadline_id || parentQuestion.event_id;
    if (parentQuestion.asked_by && referenceId) {
      const displayMsg = answer.length > 150 ? `${answer.slice(0, 147)}...` : answer;
      await supabase
        .from('notifications')
        .update({ message: displayMsg })
        .eq('user_id', parentQuestion.asked_by)
        .eq('type', 'qna')
        .eq('reference_id', referenceId);
    }

    await revalidateQuestionPaths(supabase, ans.question_id);
    return { success: true };
  } catch (err: any) {
    if (
      err instanceof Error &&
      (err.message === 'NEXT_REDIRECT' || (err as any).digest?.startsWith('NEXT_REDIRECT'))
    ) {
      throw err;
    }
    console.error('editAnswer error:', err);
    return { error: err.message || 'An unexpected error occurred.' };
  }
}

