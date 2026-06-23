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
      <div className="glass-card p-6 sm:p-8 flex flex-col gap-6 relative overflow-hidden rounded-2xl shadow-xl border border-border bg-card">
        {/* Card Accent Line */}
        <div className="absolute top-0 left-0 w-full h-[4px]" style={{
          background: enriched.color === 'red' ? 'linear-gradient(90deg, #ef4444, #f87171)' : 
                      enriched.color === 'yellow' ? 'linear-gradient(90deg, #f59e0b, #fbbf24)' : 
                      'linear-gradient(90deg, #10b981, #34d399)'
        }} />

        {/* Header section with course and remaining text */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-border">
          <div className="flex items-center flex-wrap">
            <span className="flex items-center gap-1.5 text-[11px] font-bold text-sky-600 dark:text-sky-400 tracking-wider">
              <BookOpen className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              {enriched.subject}
            </span>
            <span className="text-muted-foreground/60 mx-2 select-none">•</span>
            <span className={`text-[11px] font-semibold ${
              enriched.color === 'red' ? 'text-zinc-800 dark:text-rose-300' :
              enriched.color === 'yellow' ? 'text-zinc-800 dark:text-amber-300' :
              enriched.color === 'green' ? 'text-zinc-800 dark:text-emerald-300' : 'text-zinc-500 dark:text-zinc-400'
            }`}>
              {formatDaysRemaining(enriched.daysRemaining)}
            </span>
          </div>
        </div>

        {/* Content section */}
        <div className="flex flex-col gap-4">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight leading-tight">
            {enriched.title}
          </h2>
          {enriched.description ? (
            <div className="bg-muted/10 border-l-3 border-emerald-500/40 p-4 rounded-r-xl text-zinc-800 dark:text-zinc-200 text-sm sm:text-base leading-relaxed whitespace-pre-line shadow-inner">
              {enriched.description}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic bg-muted/5 p-3 rounded-lg border border-border">
              No additional description provided.
            </p>
          )}
        </div>

        {/* Footer info: Due Date */}
        <div className="flex flex-wrap items-center justify-between gap-4 mt-2 pt-4 border-t border-border">
          <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground font-medium">
            <Calendar className="w-4.5 h-4.5 text-rose-500" />
            <span>Due Date: <strong className="text-foreground font-semibold">{formatDateTime(enriched.due_date)}</strong></span>
          </div>
        </div>
      </div>

      {/* Ask Question Input */}
      <div className="mt-2">
        {hasUnresolvedQuestion ? (
          <div className="relative overflow-hidden bg-amber-500/[0.04] border border-amber-500/20 rounded-2xl p-5 flex items-start gap-3.5 shadow-lg backdrop-blur-sm">
            <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-amber-500" />
            <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5 animate-pulse" />
            <div className="flex flex-col gap-1">
              <span className="font-bold text-sm text-zinc-800 dark:text-amber-400">Unresolved Question Pending</span>
              <p className="text-zinc-700 dark:text-zinc-300 text-xs leading-relaxed">
                You have a pending question on this deadline. You can ask another once it is resolved by a Class Representative.
              </p>
            </div>
          </div>
        ) : (
          <AskQuestionForm entityId={enriched.id} entityType="deadline" />
        )}
      </div>

      {/* Q&A List */}
      <div className="border-t border-border pt-6 mt-4">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2.5">
            <HelpCircle className="w-5.5 h-5.5 text-zinc-500 dark:text-zinc-400" />
            <span>
              Discussion Feed
              {questions.length > 0 && (
                <span className="text-muted-foreground font-normal text-sm ml-2">
                  • {questions.length}
                </span>
              )}
            </span>
          </h3>
        </div>

        {questions.length === 0 ? (
          <div className="glass-card p-10 text-center flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card">
            <div className="w-12 h-12 rounded-2xl bg-muted/10 border border-border flex items-center justify-center text-muted-foreground">
              <MessageSquare className="w-6 h-6 opacity-60" />
            </div>
            <div className="flex flex-col gap-1">
              <h4 className="text-sm font-bold text-foreground">No questions posted yet</h4>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                Have questions about this deadline? Post your query above to get a response directly from your Class Representatives.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {questions.map((q) => (
              <div
                key={q.id}
                className={`glass-card p-5.5 flex flex-col gap-4 rounded-2xl border transition-all duration-200 hover:border-muted-foreground/30 ${
                  q.is_resolved 
                    ? 'border-emerald-500/30 bg-emerald-500/[0.02] dark:bg-emerald-500/[0.04] shadow-md shadow-emerald-950/5' 
                    : 'border-border bg-card'
                }`}
              >
                {/* Question Header */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <UserAvatar
                      profile={{
                        full_name: q.asker?.full_name || 'Student',
                        profile_pic_url: q.asker?.profile_pic_url || null,
                      }}
                      size="sm"
                    />
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-foreground">
                        {q.asker?.full_name || 'Student'}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatDateTime(q.created_at)}
                      </span>
                    </div>
                  </div>
                  {q.is_resolved && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-300 shadow-sm animate-fade-in">
                      <Check className="w-3 h-3" />
                      Resolved
                    </span>
                  )}
                </div>

                {/* Question text */}
                <p className="text-sm font-medium text-foreground leading-relaxed pl-1">
                  {q.question}
                </p>

                {/* Answers list */}
                {q.answers && q.answers.length > 0 && (
                  <div className="flex flex-col gap-3 pl-4 border-l border-border mt-1">
                    {q.answers.map((ans) => (
                      <div key={ans.id} className="flex items-start gap-2.5 text-xs">
                        <CornerDownRight className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-550 mt-1.5 flex-shrink-0" />
                        <div className="flex-1 bg-muted/20 border border-border rounded-xl p-4 shadow-sm">
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-foreground">
                                {ans.answerer?.full_name || 'CR'}
                              </span>
                              <span className="text-[10px] text-zinc-800 dark:text-zinc-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md font-bold uppercase tracking-widest scale-90">
                                CR
                              </span>
                            </div>
                            <span className="text-[10px] text-muted-foreground">
                              {formatDateTime(ans.created_at)}
                            </span>
                          </div>
                          <p className="text-zinc-800 dark:text-zinc-200 whitespace-pre-line leading-relaxed text-xs">
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
