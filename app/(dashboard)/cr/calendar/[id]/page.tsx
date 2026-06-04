import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Calendar, HelpCircle, MessageSquare } from 'lucide-react';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { formatDate, formatEventType, getEventTypeColor } from '@/lib/utils/formatters';
import { QuestionCard } from '@/components/features/QuestionCard';
import { TimelineQuestion } from '@/types';

interface CRCalendarDetailPageProps {
  params: Promise<{ id: string }>;
}

export const revalidate = 0; // force dynamic rendering

export default async function CRCalendarDetailPage({ params }: CRCalendarDetailPageProps) {
  const { id } = await params;
  const supabase = await getSupabaseServerClient();

  // Fetch event details
  const { data: event, error: eventError } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('id', id)
    .single();

  if (eventError || !event) {
    notFound();
  }

  // Fetch questions for this event
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

  // Cast questions to the type including answers
  const questions = (rawQuestions || []) as TimelineQuestion[];

  // Get current user session to pass as author
  const { data: { user } } = await supabase.auth.getUser();

  const typeColor = getEventTypeColor(event.event_type);

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/cr/calendar"
          className="flex items-center justify-center w-9 h-9 rounded-lg border border-border bg-background hover:bg-accent text-muted-foreground hover:text-foreground transition-all duration-200"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="page-header mb-0">
          <h1 className="page-title">Event Q&A Panel</h1>
          <p className="page-subtitle">Resolve questions and clarify details for students</p>
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
              {event.is_public && (
                <span className="badge badge-public text-[10px]">Public</span>
              )}
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

      {/* Q&A Section Title */}
      <div className="border-t border-border pt-6 mt-2">
        <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-primary" />
          Questions from Students ({questions.length})
        </h3>

        {questions.length === 0 ? (
          <div className="glass-card p-10 text-center flex flex-col items-center justify-center gap-2">
            <MessageSquare className="w-10 h-10 text-muted-foreground opacity-30" />
            <h4 className="text-sm font-semibold">No questions yet</h4>
            <p className="text-xs text-muted-foreground">
              Students haven't asked any questions about this event.
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
