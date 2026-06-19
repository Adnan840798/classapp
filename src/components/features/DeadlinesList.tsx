'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Clock, BookOpen, Calendar, ArrowRight, Square, Trash2, Check, CheckSquare } from 'lucide-react';
import { formatDateTime } from '@/lib/utils/formatters';
import { enrichDeadlines, formatDaysRemaining } from '@/lib/utils/deadlinePriority';
import { deleteDeadline, bulkDeleteDeadlines } from '@/lib/actions/deadlines';
import { DeleteButton } from '@/components/ui/DeleteButton';
import { EditDeadlineModal } from '@/components/features/EditDeadlineModal';
import { BulkDeleteBar } from '@/components/ui/BulkDeleteBar';
import type { Deadline } from '@/types';

const colorThemes = {
  red: {
    bg: 'linear-gradient(90deg, rgba(239,68,68,0.09) 0%, rgba(26,29,36,0.65) 100%)',
    border: '1px solid rgba(239,68,68,0.28)',
    accent: 'linear-gradient(180deg, #ef4444, #f87171)',
    badgeBg: 'rgba(239,68,68,0.15)', badgeBorder: '1px solid rgba(239,68,68,0.3)', badgeText: '#f87171',
    iconColor: 'text-red-400', iconBg: 'rgba(239,68,68,0.12)', iconBorder: '1px solid rgba(239,68,68,0.2)',
  },
  yellow: {
    bg: 'linear-gradient(90deg, rgba(245,158,11,0.07) 0%, rgba(26,29,36,0.65) 100%)',
    border: '1px solid rgba(245,158,11,0.22)',
    accent: 'linear-gradient(180deg, #f59e0b, #fbbf24)',
    badgeBg: 'rgba(245,158,11,0.12)', badgeBorder: '1px solid rgba(245,158,11,0.25)', badgeText: '#fbbf24',
    iconColor: 'text-amber-400', iconBg: 'rgba(245,158,11,0.1)', iconBorder: '1px solid rgba(245,158,11,0.18)',
  },
  green: {
    bg: 'linear-gradient(90deg, rgba(16,185,129,0.06) 0%, rgba(26,29,36,0.65) 100%)',
    border: '1px solid rgba(16,185,129,0.2)',
    accent: 'linear-gradient(180deg, #10b981, #34d399)',
    badgeBg: 'rgba(16,185,129,0.1)', badgeBorder: '1px solid rgba(16,185,129,0.22)', badgeText: '#34d399',
    iconColor: 'text-emerald-400', iconBg: 'rgba(16,185,129,0.08)', iconBorder: '1px solid rgba(16,185,129,0.18)',
  },
  gray: {
    bg: 'rgba(26,29,36,0.4)',
    border: '1px solid rgba(148,163,184,0.12)',
    accent: 'linear-gradient(180deg, #64748b, #94a3b8)',
    badgeBg: 'rgba(148,163,184,0.08)', badgeBorder: '1px solid rgba(148,163,184,0.15)', badgeText: '#94a3b8',
    iconColor: 'text-slate-400', iconBg: 'rgba(148,163,184,0.06)', iconBorder: '1px solid rgba(148,163,184,0.12)',
  },
  selected: {
    bg: 'linear-gradient(90deg, rgba(244,63,94,0.06) 0%, rgba(26,29,36,0.65) 100%)',
    border: '1px solid rgba(244, 63, 94, 0.4)',
    accent: 'linear-gradient(180deg, #f43f5e, #be123c)',
    badgeBg: 'rgba(244,63,94,0.12)', badgeBorder: '1px solid rgba(244,63,94,0.25)', badgeText: '#f43f5e',
    iconColor: 'text-rose-400', iconBg: 'rgba(244,63,94,0.12)', iconBorder: '1px solid rgba(244,63,94,0.25)',
  },
};

export function DeadlinesList({ deadlines }: { deadlines: Deadline[] }) {
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const enriched = enrichDeadlines(deadlines);
  const activeDeadlines = enriched.filter((d) => new Date(d.due_date).getTime() >= Date.now());

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

  if (activeDeadlines.length === 0) {
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
                ? 'bg-rose-500/15 border-rose-500/30 text-rose-400 hover:bg-rose-500/20'
                : 'border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/[0.04]'
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
        {activeDeadlines.map((deadline) => {
          const isSelected = selectedIds.has(deadline.id);
          const theme = isSelected ? colorThemes.selected : (colorThemes[deadline.color] || colorThemes.green);
          return (
            <div
              key={deadline.id}
              onClick={selectMode ? () => toggleItem(deadline.id) : undefined}
              className={`relative rounded-xl overflow-hidden transition-all duration-150 animate-fade-in ${
                selectMode ? 'cursor-pointer' : 'hover:translate-x-0.5'
              }`}
              style={{
                background: theme.bg,
                border: theme.border,
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
                        <div className="w-5 h-5 rounded-md border border-slate-700 bg-white/[0.02] hover:border-slate-500 transition-colors flex items-center justify-center" />
                      )}
                    </div>
                  )}
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: theme.iconBg, border: theme.iconBorder }}>
                    <Clock className={`w-5 h-5 ${theme.iconColor}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <span className="text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded bg-slate-800/40 border border-slate-700/50 text-[#94a3b8] flex items-center gap-1">
                        <BookOpen className="w-2.5 h-2.5 text-emerald-400" />{deadline.subject}
                      </span>
                      <h3 className="text-sm font-extrabold text-white break-words leading-snug">{deadline.title}</h3>
                    </div>
                    {deadline.description && (
                      <p className="text-xs text-slate-400 whitespace-pre-line leading-relaxed break-words">{deadline.description}</p>
                    )}
                  </div>
                </div>

                {!selectMode && (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5 flex-shrink-0 w-full sm:w-auto mt-3 sm:mt-0 pt-3 sm:pt-0 border-t border-white/[0.04] sm:border-0">
                    <div className="flex flex-col items-start sm:items-end gap-1.5">
                      <p className="text-[10px] text-slate-400 font-bold flex items-center gap-1.5 whitespace-nowrap">
                        <Calendar className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                        <span>Due: {formatDateTime(deadline.due_date)}</span>
                      </p>
                      <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded leading-none w-fit" style={{ background: theme.badgeBg, border: theme.badgeBorder, color: theme.badgeText }}>
                        {formatDaysRemaining(deadline.daysRemaining)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link href={`/cr/deadlines/${deadline.id}`} className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg text-emerald-400 border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 transition-all whitespace-nowrap">
                        Question &amp; Answer<ArrowRight className="w-3 h-3 flex-shrink-0" />
                      </Link>
                      <EditDeadlineModal deadline={deadline} />
                      <DeleteButton id={deadline.id} onDelete={deleteDeadline} confirmMessage="Are you sure you want to delete this deadline?" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <BulkDeleteBar count={selectedIds.size} onCancel={toggleSelectMode} onDelete={handleBulkDelete} label="deadlines" />
    </>
  );
}
