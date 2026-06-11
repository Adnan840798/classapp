import Link from 'next/link';
import { Clock, Calendar, BookOpen, ArrowRight } from 'lucide-react';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { formatDateTime } from '@/lib/utils/formatters';
import { enrichDeadlines, formatDaysRemaining } from '@/lib/utils/deadlinePriority';

export const revalidate = 0; // force dynamic rendering

const colorThemes = {
  red: {
    bg: 'linear-gradient(90deg, rgba(239,68,68,0.09) 0%, rgba(26,29,36,0.65) 100%)',
    border: '1px solid rgba(239,68,68,0.28)',
    accent: 'linear-gradient(180deg, #ef4444, #f87171)',
    badgeBg: 'rgba(239,68,68,0.15)',
    badgeBorder: '1px solid rgba(239,68,68,0.3)',
    badgeText: '#f87171',
    iconColor: 'text-red-400',
    iconBg: 'rgba(239,68,68,0.12)',
    iconBorder: '1px solid rgba(239,68,68,0.2)',
  },
  yellow: {
    bg: 'linear-gradient(90deg, rgba(245,158,11,0.07) 0%, rgba(26,29,36,0.65) 100%)',
    border: '1px solid rgba(245,158,11,0.22)',
    accent: 'linear-gradient(180deg, #f59e0b, #fbbf24)',
    badgeBg: 'rgba(245,158,11,0.12)',
    badgeBorder: '1px solid rgba(245,158,11,0.25)',
    badgeText: '#fbbf24',
    iconColor: 'text-amber-400',
    iconBg: 'rgba(245,158,11,0.1)',
    iconBorder: '1px solid rgba(245,158,11,0.18)',
  },
  green: {
    bg: 'linear-gradient(90deg, rgba(16,185,129,0.06) 0%, rgba(26,29,36,0.65) 100%)',
    border: '1px solid rgba(16,185,129,0.2)',
    accent: 'linear-gradient(180deg, #10b981, #34d399)',
    badgeBg: 'rgba(16,185,129,0.1)',
    badgeBorder: '1px solid rgba(16,185,129,0.22)',
    badgeText: '#34d399',
    iconColor: 'text-emerald-400',
    iconBg: 'rgba(16,185,129,0.08)',
    iconBorder: '1px solid rgba(16,185,129,0.18)',
  },
  gray: {
    bg: 'rgba(26,29,36,0.4)',
    border: '1px solid rgba(148,163,184,0.12)',
    accent: 'linear-gradient(180deg, #64748b, #94a3b8)',
    badgeBg: 'rgba(148,163,184,0.08)',
    badgeBorder: '1px solid rgba(148,163,184,0.15)',
    badgeText: '#94a3b8',
    iconColor: 'text-slate-400',
    iconBg: 'rgba(148,163,184,0.06)',
    iconBorder: '1px solid rgba(148,163,184,0.12)',
  },
};

export default async function StudentDeadlinesPage() {
  const supabase = await getSupabaseServerClient();

  const { data: deadlines, error } = await supabase
    .from('deadlines')
    .select('*')
    .order('due_date', { ascending: true });

  if (error) {
    console.error('Failed to load deadlines:', error);
  }

  const enriched = deadlines ? enrichDeadlines(deadlines) : [];
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
                className="relative rounded-xl overflow-hidden transition-all duration-150 hover:translate-x-0.5"
                style={{
                  background: theme.bg,
                  border: theme.border,
                }}
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
                      className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{
                        background: theme.iconBg,
                        border: theme.iconBorder,
                      }}
                    >
                      <Clock className={`w-4 h-4 ${theme.iconColor}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded bg-slate-800/40 border border-slate-700/50 text-[#94a3b8] flex items-center gap-1">
                          <BookOpen className="w-2.5 h-2.5 text-emerald-400" />
                          {deadline.subject}
                        </span>
                        <h3 className="text-sm font-extrabold text-white break-words leading-snug">
                          {deadline.title}
                        </h3>
                      </div>
                      {deadline.description && (
                        <p className="text-xs text-slate-400 mt-2 whitespace-pre-line leading-relaxed break-words">
                          {deadline.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right section: Due Date + Action Button */}
                  <div className="flex items-center justify-between sm:justify-end gap-6 flex-shrink-0">
                    <div className="text-left sm:text-right flex flex-col items-start sm:items-end gap-1">
                      <p className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        Due: {formatDateTime(deadline.due_date)}
                      </p>
                      <span
                        className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded"
                        style={{
                          background: theme.badgeBg,
                          border: theme.badgeBorder,
                          color: theme.badgeText,
                        }}
                      >
                        {formatDaysRemaining(deadline.daysRemaining)}
                      </span>
                    </div>
                    <Link
                      href={`/student/deadlines/${deadline.id}`}
                      className="flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 rounded-lg text-emerald-400 border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 transition-all"
                    >
                      Q&A
                      <ArrowRight className="w-3 h-3" />
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
