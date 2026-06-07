import Link from 'next/link';
import { Plus, Clock, BookOpen, Calendar, ArrowRight } from 'lucide-react';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { formatDateTime } from '@/lib/utils/formatters';
import { enrichDeadlines, formatDaysRemaining } from '@/lib/utils/deadlinePriority';
import { deleteDeadline } from '@/lib/actions/deadlines';
import { DeleteButton } from '@/components/ui/DeleteButton';

export const revalidate = 0; // force dynamic rendering

const colorThemes = {
  red: {
    bg: 'rgba(239,68,68,0.04)',
    border: '1px solid rgba(239,68,68,0.2)',
    accent: 'linear-gradient(180deg, #ef4444, #f97316)',
    badgeBg: 'rgba(239,68,68,0.12)',
    badgeBorder: '1px solid rgba(239,68,68,0.3)',
    badgeText: '#f87171',
    iconColor: 'text-red-400',
    iconBg: 'rgba(239,68,68,0.08)',
    iconBorder: '1px solid rgba(239,68,68,0.15)',
  },
  yellow: {
    bg: 'rgba(245,158,11,0.03)',
    border: '1px solid rgba(245,158,11,0.18)',
    accent: 'linear-gradient(180deg, #f59e0b, #eab308)',
    badgeBg: 'rgba(245,158,11,0.1)',
    badgeBorder: '1px solid rgba(245,158,11,0.25)',
    badgeText: '#fbbf24',
    iconColor: 'text-amber-400',
    iconBg: 'rgba(245,158,11,0.06)',
    iconBorder: '1px solid rgba(245,158,11,0.12)',
  },
  green: {
    bg: 'rgba(11,14,30,0.4)',
    border: '1px solid #1e2a4a',
    accent: 'linear-gradient(180deg, #10b981, #059669)',
    badgeBg: 'rgba(16,185,129,0.08)',
    badgeBorder: '1px solid rgba(16,185,129,0.2)',
    badgeText: '#34d399',
    iconColor: 'text-emerald-400',
    iconBg: 'rgba(16,185,129,0.05)',
    iconBorder: '1px solid rgba(16,185,129,0.1)',
  },
  gray: {
    bg: 'rgba(113,113,122,0.02)',
    border: '1px solid rgba(113,113,122,0.15)',
    accent: 'linear-gradient(180deg, #71717a, #52525b)',
    badgeBg: 'rgba(113,113,122,0.12)',
    badgeBorder: '1px solid rgba(113,113,122,0.25)',
    badgeText: '#a1a1aa',
    iconColor: 'text-slate-400',
    iconBg: 'rgba(113,113,122,0.05)',
    iconBorder: '1px solid rgba(113,113,122,0.1)',
  },
};

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
  const activeDeadlines = enriched.filter((d) => new Date(d.due_date).getTime() >= Date.now());

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Deadlines</h1>
          <p className="page-subtitle">Track academic submissions, projects, and assignment deadlines</p>
        </div>
        <Link href="/cr/deadlines/new" className="btn-primary self-start sm:self-auto flex-shrink-0">
          <Plus className="w-4 h-4" />
          New Deadline
        </Link>
      </div>

      {!activeDeadlines || activeDeadlines.length === 0 ? (
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
                          <BookOpen className="w-2.5 h-2.5 text-indigo-400" />
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

                  {/* Right section: Due Date + Action Button + Delete Button */}
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
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/cr/deadlines/${deadline.id}`}
                        className="flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 rounded-lg text-indigo-400 border border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-500/10 transition-all"
                      >
                        Q&A Panel
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                      <DeleteButton
                        id={deadline.id}
                        onDelete={deleteDeadline}
                        confirmMessage="Are you sure you want to delete this deadline?"
                      />
                    </div>
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
