import Link from 'next/link';
import { Clock, Calendar, BookOpen, ArrowRight } from 'lucide-react';
import { formatDateTime } from '@/lib/utils/formatters';
import { enrichDeadlines, formatDaysRemaining } from '@/lib/utils/deadlinePriority';
import { getCachedDeadlines } from '@/lib/cache/queries';

export const revalidate = 0; // force dynamic rendering

const colorThemes = {
  red: {
    cardBgClass: 'bg-gradient-to-r from-red-500/[0.18] to-card border-red-500/60 dark:from-red-500/[0.22] dark:to-card/40 dark:border-red-500/55',
    accent: 'linear-gradient(180deg, #ef4444, #be123c)',
    subjectBadgeClass: 'bg-red-500/[0.03] dark:bg-red-500/25 border border-red-500/10 text-rose-950 dark:text-rose-300 font-bold',
    subjectIconColor: 'text-zinc-555 dark:text-rose-400',
    iconBgClass: 'bg-red-500/[0.03] dark:bg-red-500/20 border border-red-500/10',
    iconColorClass: 'text-zinc-700 dark:text-red-400',
    badgeBgClass: 'bg-red-500/[0.03] dark:bg-red-500/25 border border-red-500/10',
    badgeTextColor: 'text-rose-950 dark:text-rose-300',
    btnClass: 'text-zinc-900 dark:text-zinc-100 border border-red-500/30 dark:border-red-500/45 bg-red-500/12 dark:bg-red-500/25 hover:bg-red-500/22 dark:hover:bg-red-500/35 shadow-sm shadow-red-500/5',
  },
  yellow: {
    cardBgClass: 'bg-gradient-to-r from-amber-500/[0.18] to-card border-amber-500/60 dark:from-amber-500/[0.22] dark:to-card/40 dark:border-amber-500/55',
    accent: 'linear-gradient(180deg, #f59e0b, #d97706)',
    subjectBadgeClass: 'bg-amber-500/[0.03] dark:bg-amber-500/25 border border-amber-500/10 text-amber-950 dark:text-amber-300 font-bold',
    subjectIconColor: 'text-zinc-555 dark:text-amber-400',
    iconBgClass: 'bg-amber-500/[0.03] dark:bg-amber-500/20 border border-amber-500/10',
    iconColorClass: 'text-zinc-700 dark:text-amber-400',
    badgeBgClass: 'bg-amber-500/[0.03] dark:bg-amber-500/25 border border-amber-500/10',
    badgeTextColor: 'text-amber-950 dark:text-amber-300',
    btnClass: 'text-zinc-900 dark:text-zinc-100 border border-amber-500/30 dark:border-amber-500/45 bg-amber-500/12 dark:bg-amber-500/25 hover:bg-amber-500/22 dark:hover:bg-amber-500/35 shadow-sm shadow-amber-500/5',
  },
  green: {
    cardBgClass: 'bg-gradient-to-r from-emerald-500/[0.18] to-card border-emerald-500/60 dark:from-emerald-500/[0.22] dark:to-card/40 dark:border-emerald-500/55',
    accent: 'linear-gradient(180deg, #10b981, #059669)',
    subjectBadgeClass: 'bg-emerald-500/[0.03] dark:bg-emerald-500/25 border border-emerald-500/10 text-emerald-950 dark:text-emerald-300 font-bold',
    subjectIconColor: 'text-zinc-555 dark:text-emerald-400',
    iconBgClass: 'bg-emerald-500/[0.03] dark:bg-emerald-500/20 border border-emerald-500/10',
    iconColorClass: 'text-zinc-700 dark:text-emerald-400',
    badgeBgClass: 'bg-emerald-500/[0.03] dark:bg-emerald-500/25 border border-emerald-500/10',
    badgeTextColor: 'text-emerald-950 dark:text-emerald-300',
    btnClass: 'text-zinc-900 dark:text-zinc-100 border border-emerald-500/30 dark:border-emerald-500/45 bg-emerald-500/12 dark:bg-emerald-500/25 hover:bg-emerald-500/22 dark:hover:bg-emerald-500/35 shadow-sm shadow-emerald-500/5',
  },
  gray: {
    cardBgClass: 'bg-gradient-to-r from-muted/30 to-card border-border dark:from-muted/10 dark:to-card/40',
    accent: 'linear-gradient(180deg, #71717a, #3f3f46)',
    subjectBadgeClass: 'bg-muted border border-border text-zinc-800 dark:text-zinc-300 font-bold',
    subjectIconColor: 'text-zinc-500 dark:text-zinc-400',
    iconBgClass: 'bg-muted border border-border',
    iconColorClass: 'text-zinc-700 dark:text-zinc-400',
    badgeBgClass: 'bg-muted border border-border',
    badgeTextColor: 'text-zinc-800 dark:text-zinc-300',
    btnClass: 'text-zinc-900 dark:text-zinc-100 border border-border bg-muted/40 dark:bg-muted/20 hover:bg-muted/60 dark:hover:bg-muted/30 shadow-sm',
  },
};

export default async function StudentDeadlinesPage() {
  // Uses tenant-scoped unstable_cache internally — DB query shared across all students for 120s.
  const deadlines = await getCachedDeadlines();

  const enriched = deadlines ? enrichDeadlines(deadlines) : [];
  // eslint-disable-next-line react-hooks/purity
  const activeDeadlines = enriched.filter((d) => new Date(d.due_date).getTime() >= Date.now());

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full animate-fade-in">
      {/* Page Header */}
      <div className="page-header">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="page-title">Deadlines & Submissions</h1>
            <p className="page-subtitle">Track academic schedules, project turn-ins, and homework deadlines</p>
          </div>
        </div>
      </div>

      {!activeDeadlines || activeDeadlines.length === 0 ? (
        <div className="glass-card p-12 text-center flex flex-col items-center justify-center gap-3">
          <Clock className="w-12 h-12 text-muted-foreground opacity-30 animate-pulse" />
          <h2 className="text-lg font-semibold">No deadlines yet</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            All caught up! There are no assignments or exams currently scheduled.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {activeDeadlines.map((deadline) => {
            const theme = colorThemes[deadline.color] || colorThemes.green;
            return (
              <div
                key={deadline.id}
                className={`relative rounded-xl overflow-hidden transition-all duration-150 hover:translate-x-0.5 border ${theme.cardBgClass}`}
              >
                {/* Left urgency colored line */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-1"
                  style={{ background: theme.accent }}
                />

                <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Left section: Icon + Subject + Title & Desc */}
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${theme.iconBgClass}`}
                    >
                      <Clock className={`w-4 h-4 ${theme.iconColorClass}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded flex items-center gap-1 ${theme.subjectBadgeClass}`}>
                          <BookOpen className={`w-2.5 h-2.5 ${theme.subjectIconColor}`} />
                          {deadline.subject}
                        </span>
                        <h3 className="text-sm font-extrabold text-foreground break-words leading-snug">
                          {deadline.title}
                        </h3>
                      </div>
                      {deadline.description && (
                        <p className="text-xs text-zinc-700 dark:text-zinc-400 mt-2 whitespace-pre-line leading-relaxed break-words">
                          {deadline.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right section: Due Date + Action Button */}
                  <div className="flex flex-col gap-2.5 flex-shrink-0 w-full sm:w-auto mt-2 sm:mt-0 pt-3 sm:pt-0 border-t border-border/50 sm:border-t-0 sm:items-end">
                    <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2">
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold flex items-center gap-1 whitespace-nowrap">
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground/80 flex-shrink-0" />
                        Due: {formatDateTime(deadline.due_date)}
                      </p>
                      <span
                        className={`text-[8px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full leading-none w-fit ${theme.badgeBgClass} ${theme.badgeTextColor}`}
                      >
                        {formatDaysRemaining(deadline.daysRemaining)}
                      </span>
                    </div>
                    <Link
                      href={`/student/deadlines/${deadline.id}`}
                      className={`flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all whitespace-nowrap self-start sm:self-auto ${theme.btnClass}`}
                    >
                      Question &amp; Answer
                      <ArrowRight className="w-3 h-3 flex-shrink-0" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
