'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Clock, BookOpen, Calendar, ArrowRight, Square, Trash2, Check, CheckSquare, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { formatDateTime } from '@/lib/utils/formatters';
import { enrichDeadlines, formatDaysRemaining } from '@/lib/utils/deadlinePriority';
import { deleteDeadline, bulkDeleteDeadlines } from '@/lib/actions/deadlines';
import { DeleteButton } from '@/components/ui/DeleteButton';
import { EditDeadlineModal } from '@/components/features/EditDeadlineModal';
import { BulkDeleteBar } from '@/components/ui/BulkDeleteBar';
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
  selected: {
    cardBgClass: 'bg-gradient-to-r from-rose-500/[0.04] to-card border-rose-500/30 dark:from-rose-500/[0.08] dark:to-card/40 dark:border-rose-500/40',
    accent: 'linear-gradient(180deg, #f43f5e, #be123c)',
    subjectBadgeClass: 'bg-rose-500/[0.03] dark:bg-rose-500/25 border border-rose-500/10 text-rose-950 dark:text-rose-300 font-bold',
    subjectIconColor: 'text-zinc-555 dark:text-rose-400',
    iconBgClass: 'bg-rose-500/[0.03] dark:bg-rose-500/20 border border-rose-500/10',
    iconColorClass: 'text-zinc-700 dark:text-rose-400',
    badgeBgClass: 'bg-rose-500/[0.03] dark:bg-rose-500/25 border border-rose-500/10',
    badgeTextColor: 'text-rose-950 dark:text-rose-300',
    btnClass: 'text-zinc-900 dark:text-zinc-100 border border-rose-500/30 dark:border-rose-500/45 bg-rose-500/12 dark:bg-rose-500/25 hover:bg-rose-500/22 dark:hover:bg-rose-500/35 shadow-sm shadow-rose-500/5',
  },
};

export function DeadlinesList({ deadlines }: { deadlines: Deadline[] }) {
  const router = useRouter();
  const [qaNavigatingId, setQaNavigatingId] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Long-press detection refs and handlers
  const longPressTimeout = useRef<NodeJS.Timeout | null>(null);
  const isLongPressActive = useRef(false);
  const justSelectedByLongPress = useRef<string | null>(null);

  const handleTouchStart = (id: string) => {
    isLongPressActive.current = false;
    if (!selectMode) {
      longPressTimeout.current = setTimeout(() => {
        isLongPressActive.current = true;
        if (navigator.vibrate) {
          navigator.vibrate(50); // Haptic vibration
        }
        setSelectMode(true);
        setSelectedIds(new Set([id]));
        justSelectedByLongPress.current = id;
      }, 500);
    }
  };

  const handleTouchMove = () => {
    if (longPressTimeout.current) {
      clearTimeout(longPressTimeout.current);
      longPressTimeout.current = null;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (longPressTimeout.current) {
      clearTimeout(longPressTimeout.current);
      longPressTimeout.current = null;
    }
    if (isLongPressActive.current) {
      e.preventDefault();
      e.stopPropagation();
      isLongPressActive.current = false;
    }
  };

  const handleItemClick = (e: React.MouseEvent, id: string) => {
    if (justSelectedByLongPress.current === id) {
      justSelectedByLongPress.current = null;
      return;
    }
    if (selectMode) {
      e.preventDefault();
      e.stopPropagation();
      toggleItem(id);
    }
  };

  const [showPast, setShowPast] = useState(false);

  const enriched = enrichDeadlines(deadlines);
  const now = Date.now();
  const activeDeadlines = enriched.filter((d) => new Date(d.due_date).getTime() >= now);
  const pastDeadlines = enriched
    .filter((d) => new Date(d.due_date).getTime() < now)
    .sort((a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime());

  function toggleSelectMode() {
    setSelectMode((v) => !v);
    setSelectedIds(new Set());
  }

  function toggleItem(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function handleBulkDelete() {
    await bulkDeleteDeadlines(Array.from(selectedIds));
    setSelectedIds(new Set());
    setSelectMode(false);
  }

  const renderDeadlineCard = (deadline: typeof enriched[number], isPast = false) => {
    const isSelected = selectedIds.has(deadline.id);
    const theme = isSelected 
      ? colorThemes.selected 
      : isPast 
        ? colorThemes.gray 
        : (colorThemes[deadline.color] || colorThemes.green);

    return (
      <div
        key={deadline.id}
        onClick={(e) => handleItemClick(e, deadline.id)}
        onTouchStart={() => handleTouchStart(deadline.id)}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`relative rounded-xl overflow-hidden transition-all duration-150 animate-fade-in ${
          selectMode ? 'cursor-pointer' : 'hover:translate-x-0.5'
        } ${theme.cardBgClass} border ${isPast && !isSelected ? 'opacity-60' : ''}`}
        style={{
          boxShadow: isSelected ? '0 0 14px rgba(244, 63, 94, 0.12)' : undefined,
        }}
      >
        <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: theme.accent }} />

        <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {selectMode && (
              <div className="flex-shrink-0 mt-0.5">
                {isSelected ? (
                  <div className="w-5 h-5 rounded-md bg-gradient-to-br from-rose-400 to-rose-600 flex items-center justify-center text-white shadow-[0_0_10px_rgba(244,63,94,0.4)] border border-rose-400/20">
                    <Check className="w-3.5 h-3.5 stroke-[3.5]" />
                  </div>
                ) : (
                  <div className="w-5 h-5 rounded-md border border-border bg-muted/20 hover:border-muted-foreground/50 transition-colors flex items-center justify-center" />
                )}
              </div>
            )}
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${theme.iconBgClass}`}>
              <Clock className={`w-5 h-5 ${theme.iconColorClass}`} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                <span className={`text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded flex items-center gap-1 ${theme.subjectBadgeClass}`}>
                  <BookOpen className={`w-2.5 h-2.5 ${theme.subjectIconColor}`} />{deadline.subject}
                </span>
                <h3 className="text-sm font-extrabold text-foreground break-words leading-snug">{deadline.title}</h3>
              </div>
              {deadline.description && (
                <p className="text-xs text-zinc-700 dark:text-zinc-400 whitespace-pre-line leading-relaxed break-words">{deadline.description}</p>
              )}
            </div>
          </div>

          {!selectMode && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5 flex-shrink-0 w-full sm:w-auto mt-3 sm:mt-0 pt-3 sm:pt-0 border-t border-border/50 sm:border-0">
              <div className="flex flex-col items-start sm:items-end gap-1.5">
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold flex items-center gap-1.5 whitespace-nowrap">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground/80 flex-shrink-0" />
                  <span>{isPast ? 'Was due:' : 'Due:'} {formatDateTime(deadline.due_date)}</span>
                </p>
                <span className={`text-[8px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full leading-none w-fit ${theme.badgeBgClass} ${theme.badgeTextColor}`}>
                  {isPast ? 'Expired' : formatDaysRemaining(deadline.daysRemaining)}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setQaNavigatingId(deadline.id);
                    router.push(`/cr/deadlines/${deadline.id}`);
                  }}
                  disabled={qaNavigatingId === deadline.id}
                  className={`flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer ${theme.btnClass}`}
                >
                  Question &amp; Answer
                  {qaNavigatingId === deadline.id ? (
                    <Loader2 className="w-3 h-3 flex-shrink-0 animate-spin" />
                  ) : (
                    <ArrowRight className="w-3 h-3 flex-shrink-0" />
                  )}
                </button>
                <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                  <EditDeadlineModal deadline={deadline} />
                  <DeleteButton id={deadline.id} onDelete={deleteDeadline} confirmMessage="Are you sure you want to delete this deadline?" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (activeDeadlines.length === 0 && pastDeadlines.length === 0) {
    return (
      <div className="glass-card p-12 text-center flex flex-col items-center justify-center gap-3">
        <Clock className="w-12 h-12 text-muted-foreground opacity-30 animate-pulse" />
        <h2 className="text-lg font-semibold">No deadlines yet</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          All assignments and submissions are up to date! Add a deadline to notify the class.
        </p>
        <Link href="/cr/deadlines/new" className="btn-yellow mt-2">
          <Plus className="w-4 h-4" /> Create Deadline
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Deadlines &amp; Submissions</h1>
          <p className="page-subtitle">Track academic schedules, project turn-ins, and homework deadlines</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={toggleSelectMode}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer flex-shrink-0 ${
              selectMode
                ? 'bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20'
                : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted/40'
            }`}
          >
            {selectMode ? <><Trash2 className="w-3.5 h-3.5" /> Cancel Select</> : <><CheckSquare className="w-3.5 h-3.5" /> Select</>}
          </button>
          {!selectMode && (
            <Link href="/cr/deadlines/new" className="btn-yellow flex-1 sm:flex-initial sm:w-auto justify-center">
              <Plus className="w-4 h-4" /> New Deadline
            </Link>
          )}
        </div>
      </div>

      {/* List */}
      <div className="flex flex-col gap-3">
        {/* Active deadlines */}
        {activeDeadlines.length === 0 ? (
          <div className="glass-card p-8 text-center flex flex-col items-center justify-center gap-3">
            <Clock className="w-10 h-10 text-muted-foreground opacity-30 animate-pulse" />
            <p className="text-sm text-muted-foreground">No upcoming deadlines right now.</p>
          </div>
        ) : (
          activeDeadlines.map((deadline) => renderDeadlineCard(deadline, false))
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
                {pastDeadlines.map((deadline) => renderDeadlineCard(deadline, true))}
              </div>
            )}
          </div>
        )}
      </div>

      <BulkDeleteBar count={selectedIds.size} onCancel={toggleSelectMode} onDelete={handleBulkDelete} label="deadlines" />
    </>
  );
}


