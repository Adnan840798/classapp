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
      <div className="glass-card p-6 sm:p-8 flex flex-col gap-5 relative overflow-hidden">
        {/* Card Accent Line */}
        <div className="absolute top-0 left-0 w-full h-[3px]" style={{
          background: enriched.color === 'red' ? 'linear-gradient(90deg, #ef4444, #f87171)' : 
                      enriched.color === 'yellow' ? 'linear-gradient(90deg, #f59e0b, #fbbf24)' : 
                      'linear-gradient(90deg, #6b7280, #9ca3af)'
        }} />

        {/* Header section with course badge, remaining badge and edit button */}
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

          <div className="flex items-center gap-2">
            <EditDeadlineModal deadline={deadline} />
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

      {/* Q&A Section Title */}
      <div className="border-t border-border pt-6 mt-2">
        <h3 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-primary" />
          Questions from Students ({questions.length})
        </h3>

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
