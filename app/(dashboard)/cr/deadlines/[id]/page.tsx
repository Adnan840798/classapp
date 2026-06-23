import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Clock, Calendar, HelpCircle, MessageSquare, BookOpen } from 'lucide-react';
import { getSupabaseServerClient, getAuthUser } from '@/lib/supabase/server';
import { formatDateTime } from '@/lib/utils/formatters';
import { enrichDeadlines, getDeadlineColorClass, formatDaysRemaining } from '@/lib/utils/deadlinePriority';
import { QuestionCard } from '@/components/features/QuestionCard';
import { TimelineQuestion } from '@/types';
import { EditDeadlineModal } from '@/components/features/EditDeadlineModal';

interface CRDeadlineDetailPageProps {
  params: Promise<{ id: string }>;
}

export const revalidate = 0; // force dynamic rendering

export default async function CRDeadlineDetailPage({ params }: CRDeadlineDetailPageProps) {
  const { id } = await params;
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

  // Fetch questions for this deadline
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

  // Get current user ID via cached helper — no extra auth network call
  const { user } = await getAuthUser();

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/cr/deadlines"
          className="flex items-center justify-center w-9 h-9 rounded-lg border border-border bg-background hover:bg-accent text-muted-foreground hover:text-foreground transition-all duration-200"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="page-header mb-0">
          <h1 className="page-title">Deadline Q&A Panel</h1>
          <p className="page-subtitle">Answer and resolve questions from students regarding this deadline</p>
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

          <div className="flex items-center gap-2">
            <EditDeadlineModal deadline={deadline} />
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

      <div className="border-t border-border pt-6 mt-4">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2.5">
            <HelpCircle className="w-5.5 h-5.5 text-zinc-500 dark:text-zinc-400" />
            <span>
              Questions
              {questions.length > 0 && (
                <span className="text-muted-foreground font-normal text-sm ml-2">
                  • {questions.length}
                </span>
              )}
            </span>
          </h3>
        </div>

        {questions.length === 0 ? (
          <div className="glass-card p-10 text-center flex flex-col items-center justify-center gap-2">
            <MessageSquare className="w-10 h-10 text-muted-foreground opacity-30" />
            <h4 className="text-sm font-semibold">No questions yet</h4>
            <p className="text-xs text-muted-foreground">
              Students haven&apos;t asked any questions about this deadline.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {questions.map((question) => (
              <QuestionCard
                key={question.id}
                question={question}
                currentUserId={user?.id || ''}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
