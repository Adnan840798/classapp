import Link from 'next/link';
import { Calendar, HelpCircle } from 'lucide-react';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { formatDate, formatEventType, getEventTypeColor } from '@/lib/utils/formatters';

export const revalidate = 0; // force dynamic rendering

export default async function StudentCalendarPage() {
  const supabase = await getSupabaseServerClient();

  const { data: events, error } = await supabase
    .from('calendar_events')
    .select('*')
    .order('event_date', { ascending: true });

  if (error) {
    console.error('Failed to load events:', error);
  }

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Class Calendar & Timeline</h1>
        <p className="page-subtitle">View upcoming exams, classes, holidays, and participate in event Q&As</p>
      </div>

      {!events || events.length === 0 ? (
        <div className="glass-card p-12 text-center flex flex-col items-center justify-center gap-3">
          <Calendar className="w-12 h-12 text-muted-foreground opacity-30" />
          <h2 className="text-lg font-semibold">No events scheduled</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            All quiet. Check back later for updates to the class schedule.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {events.map((event) => {
            const typeColor = getEventTypeColor(event.event_type);
            return (
              <div
                key={event.id}
                className="glass-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:scale-[1.005] transition-all duration-200"
              >
                <div className="flex items-start gap-4">
                  <div className="flex flex-col items-center justify-center w-14 h-14 rounded-xl border border-border bg-accent/30 text-center flex-shrink-0">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">
                      {new Date(event.event_date).toLocaleDateString('en-US', { month: 'short' })}
                    </span>
                    <span className="text-lg font-extrabold text-foreground leading-tight">
                      {new Date(event.event_date).toLocaleDateString('en-US', { day: 'numeric' })}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-base text-foreground leading-snug">
                        {event.title}
                      </h3>
                      <span className={`badge px-2.5 py-0.5 text-[10px] font-bold border uppercase tracking-wider ${typeColor}`}>
                        {formatEventType(event.event_type)}
                      </span>
                    </div>
                    {event.description && (
                      <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
                        {event.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-auto border-t sm:border-t-0 pt-3 sm:pt-0 border-border">
                  {event.qa_enabled && (
                    <Link
                      href={`/student/calendar/${event.id}`}
                      className="flex items-center gap-1.5 text-xs font-semibold bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 px-3.5 py-2 rounded-lg transition-colors"
                    >
                      <HelpCircle className="w-4 h-4" />
                      Q&A Section
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
