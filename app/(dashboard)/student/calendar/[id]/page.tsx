import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, Calendar, HelpCircle, MessageSquare, CornerDownRight, Check, AlertCircle } from 'lucide-react';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { formatDate, formatEventType, getEventTypeColor, formatDateTime } from '@/lib/utils/formatters';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { AskQuestionForm } from './AskQuestionForm';
import { TimelineQuestion } from '@/types';

interface StudentCalendarDetailPageProps {
  params: Promise<{ id: string }>;
}

export const revalidate = 0; // force dynamic rendering

export default async function StudentCalendarDetailPage({ params }: StudentCalendarDetailPageProps) {
  const { id } = await params;
  const supabase = await getSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Fetch event details
  const { data: event, error: eventError } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('id', id)
    .single();

  if (eventError || !event) {
    notFound();
  }

  // Fetch all questions for this event
  const { data: rawQuestions, error: questionsError } = await supabase
    .from('timeline_questions')
    .select(`
      *,
      asker:profiles!asked_by(full_name, profile_pic_url),
      answers:timeline_answers(
        *,
        answerer:profiles!answered_by(full_name, profile_pic_url)
      )
    `)
    .eq('event_id', id)
    .order('created_at', { ascending: false });

  if (questionsError) {
    console.error('Failed to load questions:', questionsError);
  }

  const questions = (rawQuestions || []) as TimelineQuestion[];

  // Check if this student has an unresolved question
  const hasUnresolvedQuestion = questions.some(
    (q) => q.asked_by === user.id && !q.is_resolved
  );

  const typeColor = getEventTypeColor(event.event_type);

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/student/calendar"
          className="flex items-center justify-center w-9 h-9 rounded-lg border border-border bg-background hover:bg-accent text-muted-foreground hover:text-foreground transition-all duration-200"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="page-header mb-0">
          <h1 className="page-title">Event Q&A Room</h1>
          <p className="page-subtitle">Ask questions and read answers regarding this schedule</p>
        </div>
      </div>

      {/* Event Details Card */}
      <div className="glass-card p-6 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-foreground">
                {event.title}
              </h2>
              <span className={`badge px-2.5 py-0.5 text-[10px] font-bold border uppercase tracking-wider ${typeColor}`}>
                {formatEventType(event.event_type)}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>Event Date: {formatDate(event.event_date)}</span>
            </div>
          </div>
        </div>

        {event.description && (
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line border-t border-border/50 pt-3">
            {event.description}
          </p>
        )}
      </div>

      {/* Ask Question Input */}
      {event.qa_enabled && (
        <div className="mt-2">
          {hasUnresolvedQuestion ? (
            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 p-4 rounded-lg flex items-start gap-3 text-xs leading-normal">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Pending Question:</span> You currently have an unresolved question on this event.
                You can ask another question once your previous question has been answered and marked resolved by a CR.
              </div>
            </div>
          ) : (
            <AskQuestionForm eventId={event.id} />
          )}
        </div>
      )}

      {/* Q&A List */}
      <div className="border-t border-border pt-6 mt-2">
        <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-primary" />
          Questions & Answers ({questions.length})
        </h3>

        {questions.length === 0 ? (
          <div className="glass-card p-10 text-center flex flex-col items-center justify-center gap-2">
            <MessageSquare className="w-10 h-10 text-muted-foreground opacity-30" />
            <h4 className="text-sm font-semibold">No questions yet</h4>
            <p className="text-xs text-muted-foreground">
              Have questions about this event? Type them above to get answers.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {questions.map((q) => (
              <div
                key={q.id}
                className={`glass-card p-5 flex flex-col gap-4 border ${
                  q.is_resolved ? 'border-emerald-500/20 bg-emerald-500/5' : ''
                }`}
              >
                {/* Question Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <UserAvatar
                      profile={{
                        full_name: q.asker?.full_name || 'Student',
                        profile_pic_url: q.asker?.profile_pic_url || null,
                      }}
                      size="sm"
                    />
                    <div>
                      <p className="text-xs font-semibold text-foreground">
                        {q.asker?.full_name || 'Student'}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {formatDateTime(q.created_at)}
                      </p>
                    </div>
                  </div>
                  {q.is_resolved && (
                    <span className="badge bg-emerald-500/10 text-emerald-400 border-emerald-500/20 px-2 py-0.5 rounded text-[10px] uppercase font-bold flex items-center gap-0.5">
                      <Check className="w-3 h-3" />
                      Resolved
                    </span>
                  )}
                </div>

                {/* Question text */}
                <p className="text-sm font-semibold text-foreground pl-1">
                  {q.question}
                </p>

                {/* Answers list */}
                {q.answers && q.answers.length > 0 && (
                  <div className="flex flex-col gap-3 pl-4 border-l border-border mt-1">
                    {q.answers.map((ans) => (
                      <div key={ans.id} className="flex items-start gap-2.5 text-xs">
                        <CornerDownRight className="w-3.5 h-3.5 text-muted-foreground mt-1 flex-shrink-0" />
                        <div className="flex-1 bg-accent/20 border border-border/30 rounded-xl p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-foreground">
                              {ans.answerer?.full_name || 'CR'}
                            </span>
                            <span className="text-[9px] text-muted-foreground">
                              {formatDateTime(ans.created_at)}
                            </span>
                          </div>
                          <p className="text-muted-foreground whitespace-pre-line leading-relaxed">
                            {ans.answer}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
