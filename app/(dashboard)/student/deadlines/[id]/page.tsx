import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, Clock, Calendar, HelpCircle, MessageSquare, CornerDownRight, Check, AlertCircle, BookOpen } from 'lucide-react';
import { getSupabaseServerClient, getAuthUser } from '@/lib/supabase/server';
import { formatDateTime } from '@/lib/utils/formatters';
import { enrichDeadlines, getDeadlineColorClass, formatDaysRemaining } from '@/lib/utils/deadlinePriority';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { AskQuestionForm } from '../../calendar/[id]/AskQuestionForm';
import { TimelineQuestion } from '@/types';

interface StudentDeadlineDetailPageProps {
  params: Promise<{ id: string }>;
}

export const revalidate = 0; // force dynamic rendering

export default async function StudentDeadlineDetailPage({ params }: StudentDeadlineDetailPageProps) {
  const { id } = await params;
  const { user } = await getAuthUser();
  if (!user) redirect('/login');
  const supabase = await getSupabaseServerClient();

  // Fetch deadline details
  const { data: deadline, error: deadlineError } = await supabase
    .from('deadlines')
    .select('id, title, subject, description, due_date, created_by, created_at')
    .eq('id', id)
    .single();

  if (deadlineError || !deadline) {
    notFound();
  }

  const enriched = enrichDeadlines([deadline])[0];
  const colorClass = getDeadlineColorClass(enriched.color);

  // Fetch all questions for this deadline
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
    .eq('deadline_id', id)
    .order('created_at', { ascending: false });

  if (questionsError) {
    console.error('Failed to load questions:', questionsError);
  }

  const questions = (rawQuestions || []) as TimelineQuestion[];

  // Check if this student has an unresolved question
  const hasUnresolvedQuestion = questions.some(
    (q) => q.asked_by === user.id && !q.is_resolved
  );

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/student/deadlines"
          className="flex items-center justify-center w-9 h-9 rounded-lg border border-border bg-background hover:bg-accent text-muted-foreground hover:text-foreground transition-all duration-200"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="page-header mb-0">
          <h1 className="page-title">Deadline Q&A</h1>
          <p className="page-subtitle">Ask questions and discuss details about this submission</p>
        </div>
      </div>

      {/* Deadline Details Card */}
      <div className="glass-card p-6 sm:p-8 flex flex-col gap-5 relative overflow-hidden">
        {/* Card Accent Line */}
        <div className="absolute top-0 left-0 w-full h-[3px]" style={{
          background: enriched.color === 'red' ? 'linear-gradient(90deg, #ef4444, #f87171)' : 
                      enriched.color === 'yellow' ? 'linear-gradient(90deg, #f59e0b, #fbbf24)' : 
                      'linear-gradient(90deg, #6b7280, #9ca3af)'
        }} />

        {/* Header section with course badge and remaining badge */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/40">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold text-slate-300 bg-white/[0.04] border border-white/[0.08] px-2.5 py-1 rounded-md">
              <BookOpen className="w-3.5 h-3.5 text-brand-cyan" />
              {enriched.subject}
            </span>
            <span className={`badge px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${colorClass}`}>
              {formatDaysRemaining(enriched.daysRemaining)}
            </span>
          </div>
        </div>

        {/* Content section */}
        <div className="flex flex-col gap-3">
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            {enriched.title}
          </h2>
          {enriched.description ? (
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed whitespace-pre-line">
              {enriched.description}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground italic">No additional description provided.</p>
          )}
        </div>

        {/* Footer info: Due Date */}
        <div className="flex items-center gap-2 text-xs text-slate-400 mt-2 pt-4 border-t border-border/40 font-medium">
          <Clock className="w-4 h-4 text-rose-400" />
          <span>Deadline: <strong className="text-slate-200">{formatDateTime(enriched.due_date)}</strong></span>
        </div>
      </div>

      {/* Ask Question Input */}
      <div className="mt-2">
        {hasUnresolvedQuestion ? (
          <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 p-4 rounded-lg flex items-start gap-3 text-xs leading-normal">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Pending Question:</span> You currently have an unresolved question on this deadline.
              You can ask another question once your previous question has been answered and marked resolved by a CR.
            </div>
          </div>
        ) : (
          <AskQuestionForm entityId={enriched.id} entityType="deadline" />
        )}
      </div>

      {/* Q&A List */}
      <div className="border-t border-border pt-6 mt-2">
        <h3 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-primary" />
          Questions & Answers ({questions.length})
        </h3>

        {questions.length === 0 ? (
          <div className="glass-card p-10 text-center flex flex-col items-center justify-center gap-2">
            <MessageSquare className="w-10 h-10 text-muted-foreground opacity-30" />
            <h4 className="text-sm font-semibold">No questions yet</h4>
            <p className="text-xs text-muted-foreground">
              Have questions about this deadline? Ask them above to get answers from your CRs.
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
                    <span className="badge bg-emerald-500/10 text-emerald-400 border-emerald-500/20 px-2.5 py-0.5 rounded text-[10px] uppercase font-bold flex items-center gap-0.5">
                      <Check className="w-3.5 h-3.5" />
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
