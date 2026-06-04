import Link from 'next/link';
import { Plus, Clock, BookOpen, Calendar, AlertCircle } from 'lucide-react';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { formatDateTime } from '@/lib/utils/formatters';
import { enrichDeadlines, getDeadlineColorClass, formatDaysRemaining } from '@/lib/utils/deadlinePriority';
import { deleteDeadline } from '@/lib/actions/deadlines';
import { DeleteButton } from '@/components/ui/DeleteButton';

export const revalidate = 0; // force dynamic rendering

export default async function CRDeadlinesPage() {
  const supabase = await getSupabaseServerClient();

  const { data: deadlines, error } = await supabase
    .from('deadlines')
    .select('*')
    .order('due_date', { ascending: true });

  if (error) {
    console.error('Failed to load deadlines:', error);
  }

  const enriched = deadlines ? enrichDeadlines(deadlines) : [];

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="page-header mb-0">
          <h1 className="page-title">Deadlines</h1>
          <p className="page-subtitle">Track academic submissions, projects, and assignment deadlines</p>
        </div>
        <Link href="/cr/deadlines/new" className="btn-primary self-start sm:self-auto">
          <Plus className="w-4 h-4" />
          New Deadline
        </Link>
      </div>

      {!enriched || enriched.length === 0 ? (
        <div className="glass-card p-12 text-center flex flex-col items-center justify-center gap-3">
          <Clock className="w-12 h-12 text-muted-foreground opacity-30 animate-pulse" />
          <h2 className="text-lg font-semibold">No deadlines yet</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            All assignments and submissions are up to date! Add a deadline to notify the class.
          </p>
          <Link href="/cr/deadlines/new" className="btn-primary mt-2">
            <Plus className="w-4 h-4" />
            Create Deadline
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {enriched.map((deadline) => {
            const colorClass = getDeadlineColorClass(deadline.color);
            return (
              <div
                key={deadline.id}
                className="glass-card p-5 flex flex-col justify-between hover:scale-[1.01] transition-all duration-200"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold text-muted-foreground bg-accent px-2.5 py-1 rounded-md border border-border">
                      <BookOpen className="w-3.5 h-3.5 text-primary" />
                      {deadline.subject}
                    </span>
                    <span className={`badge px-2 py-0.5 text-xs font-semibold border ${colorClass}`}>
                      {formatDaysRemaining(deadline.daysRemaining)}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-foreground mb-2 leading-snug">
                    {deadline.title}
                  </h3>

                  {deadline.description && (
                    <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed mb-4">
                      {deadline.description}
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span>Due: {formatDateTime(deadline.due_date)}</span>
                  </div>
                  <DeleteButton
                    id={deadline.id}
                    onDelete={deleteDeadline}
                    confirmMessage="Are you sure you want to delete this deadline?"
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
