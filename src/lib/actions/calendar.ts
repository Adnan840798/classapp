'use server';

import { getSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

const CalendarEventSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  event_date: z.string().min(1, 'Event date is required'),
  event_type: z.enum(['exam', 'class', 'holiday', 'submission', 'other']).default('other'),
  is_public: z.boolean().default(true),
  qa_enabled: z.boolean().default(true),
});

export async function createCalendarEvent(formData: FormData) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

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
  redirect('/cr/calendar');
}

export async function updateCalendarEvent(id: string, formData: FormData) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

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
  redirect('/cr/calendar');
}

export async function deleteCalendarEvent(id: string) {
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.from('calendar_events').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/cr/calendar');
  revalidatePath('/student/calendar');
  return { success: true };
}

// Q&A actions
export async function answerQuestion(questionId: string, formData: FormData) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const answer = formData.get('answer') as string;
  if (!answer || answer.length > 1000) return { error: 'Invalid answer.' };

  const { error } = await supabase.from('timeline_answers').insert({
    question_id: questionId,
    answered_by: user.id,
    answer,
  });

  if (error) return { error: error.message };
  revalidatePath(`/cr/calendar/${(await supabase.from('timeline_questions').select('event_id').eq('id', questionId).single()).data?.event_id}`);
  return { success: true };
}

export async function resolveQuestion(questionId: string) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { error } = await supabase
    .from('timeline_questions')
    .update({ is_resolved: true, resolved_by: user.id, resolved_at: new Date().toISOString() })
    .eq('id', questionId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function askQuestion(eventId: string, formData: FormData) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const question = formData.get('question') as string;
  if (!question || question.length > 500) return { error: 'Question must be 1–500 characters.' };

  const { error } = await supabase.from('timeline_questions').insert({
    event_id: eventId,
    asked_by: user.id,
    question,
  });

  if (error) return { error: error.message };
  revalidatePath(`/student/calendar/${eventId}`);
  return { success: true };
}
