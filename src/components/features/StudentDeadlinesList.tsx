'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, Calendar, BookOpen, ArrowRight, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { formatDateTime } from '@/lib/utils/formatters';
import { enrichDeadlines, formatDaysRemaining } from '@/lib/utils/deadlinePriority';
import type { Deadline } from '@/types';

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
    cardBgClass: 'bg-gradient-to-r from-muted/30 to-card border-border dark:from-muted/35 dark:to-card/80',
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

function DeadlineCard({
  deadline,
  qaNavigatingId,
  onNavigate,
  muted = false,
}: {
  deadline: ReturnType<typeof enrichDeadlines>[number];
  qaNavigatingId: string | null;
  onNavigate: (id: string) => void;
  muted?: boolean;
}) {
  const router = useRouter();
  const theme = colorThemes[muted ? 'gray' : (deadline.color as keyof typeof colorThemes)] || colorThemes.green;

  return (
    <div
      className={`relative rounded-xl overflow-hidden transition-all duration-150 hover:translate-x-0.5 border ${theme.cardBgClass} ${muted ? 'opacity-60 dark:opacity-85' : ''}`}
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
              {muted ? 'Was due:' : 'Due:'} {formatDateTime(deadline.due_date)}
            </p>
            <span
              className={`text-[8px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full leading-none w-fit ${theme.badgeBgClass} ${theme.badgeTextColor}`}
            >
              {muted ? 'Expired' : formatDaysRemaining(deadline.daysRemaining)}
            </span>
          </div>
          <button
            onClick={() => {
              onNavigate(deadline.id);
              router.push(`/student/deadlines/${deadline.id}`);
            }}
            disabled={qaNavigatingId === deadline.id}
            className="group flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg text-white bg-slate-700 dark:bg-slate-800 border border-slate-600 dark:border-slate-700 hover:bg-slate-650 dark:hover:bg-slate-750 active:scale-[0.98] transition-all whitespace-nowrap self-start sm:self-auto disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer shadow-md shadow-black/20"
          >
            Question &amp; Answer
            {qaNavigatingId === deadline.id ? (
              <Loader2 className="w-3 h-3 flex-shrink-0 animate-spin text-amber-400" />
            ) : (
              <ArrowRight className="w-3 h-3 flex-shrink-0 text-amber-400 group-hover:translate-x-0.5 transition-transform" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export function StudentDeadlinesList({ deadlines }: { deadlines: Deadline[] }) {
  const [qaNavigatingId, setQaNavigatingId] = useState<string | null>(null);
  const [showPast, setShowPast] = useState(false);

  const enriched = enrichDeadlines(deadlines);
  const [now] = useState(() => Date.now());
  const activeDeadlines = enriched.filter((d) => new Date(d.due_date).getTime() >= now);
  const pastDeadlines = enriched
    .filter((d) => new Date(d.due_date).getTime() < now)
    .sort((a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime());

  if (activeDeadlines.length === 0 && pastDeadlines.length === 0) {
    return (
      <div className="glass-card p-12 text-center flex flex-col items-center justify-center gap-3">
        <Clock className="w-12 h-12 text-muted-foreground opacity-30 animate-pulse" />
        <h2 className="text-lg font-semibold">No deadlines yet</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          All caught up! There are no assignments or exams currently scheduled.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Active deadlines */}
      {activeDeadlines.length === 0 ? (
        <div className="glass-card p-8 text-center flex flex-col items-center justify-center gap-3">
          <Clock className="w-10 h-10 text-muted-foreground opacity-30 animate-pulse" />
          <p className="text-sm text-muted-foreground">No upcoming deadlines right now.</p>
        </div>
      ) : (
        activeDeadlines.map((deadline) => (
          <DeadlineCard
            key={deadline.id}
            deadline={deadline}
            qaNavigatingId={qaNavigatingId}
            onNavigate={setQaNavigatingId}
          />
        ))
      )}

      {/* Past deadlines collapsible section */}
      {pastDeadlines.length > 0 && (
        <div className="mt-4 flex flex-col gap-3">
          <button
            onClick={() => setShowPast((v) => !v)}
            className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-widest hover:text-foreground transition-colors cursor-pointer self-start px-1 py-1"
          >
            {showPast ? (
              <ChevronUp className="w-3.5 h-3.5 flex-shrink-0" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" />
            )}
            Past Deadlines ({pastDeadlines.length})
          </button>

          {showPast && (
            <div className="flex flex-col gap-2.5 animate-fade-in">
              {pastDeadlines.map((deadline) => (
                <DeadlineCard
                  key={deadline.id}
                  deadline={deadline}
                  qaNavigatingId={qaNavigatingId}
                  onNavigate={setQaNavigatingId}
                  muted
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

