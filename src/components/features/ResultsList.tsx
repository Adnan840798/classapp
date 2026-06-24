'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { Plus, Award, Calendar, FileText, ArrowUpRight, Square, Trash2, Check, CheckSquare } from 'lucide-react';
import { formatDateTime } from '@/lib/utils/formatters';
import { deleteResult, bulkDeleteResults } from '@/lib/actions/results';
import { DeleteButton } from '@/components/ui/DeleteButton';
import { AttachmentViewer } from '@/components/ui/AttachmentViewer';
import { EditResultModal } from '@/components/features/EditResultModal';
import { BulkDeleteBar } from '@/components/ui/BulkDeleteBar';

type Result = {
  id: string;
  exam_name: string;
  result_sheet_url: string | null;
  published_at: string;
};

export function ResultsList({ results }: { results: Result[] }) {
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
    await bulkDeleteResults(Array.from(selectedIds));
    setSelectedIds(new Set());
    setSelectMode(false);
  }

  if (!results || results.length === 0) {
    return (
      <div className="glass-card p-12 text-center flex flex-col items-center justify-center gap-3">
        <Award className="w-12 h-12 text-muted-foreground opacity-30 animate-pulse" />
        <h2 className="text-lg font-semibold">No results published yet</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          Publish exam sheets and results class-wide. All students will be able to view these results.
        </p>
        <Link href="/cr/results/publish" className="btn-yellow mt-2">
          <Plus className="w-4 h-4" /> Publish a Result
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="page-header mb-0">
          <h1 className="page-title">Exam Results</h1>
          <p className="page-subtitle">Publish and manage academic marksheets for the class</p>
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
            <Link href="/cr/results/publish" className="btn-yellow flex-1 sm:flex-initial sm:w-auto justify-center">
              <Plus className="w-4 h-4" /> Publish Result
            </Link>
          )}
        </div>
      </div>

      {/* List */}
      <div className="flex flex-col gap-3">
        {results.map((res) => {
          const isSelected = selectedIds.has(res.id);
            return (
              <div
                key={res.id}
                onClick={(e) => handleItemClick(e, res.id)}
                onTouchStart={() => handleTouchStart(res.id)}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                className={`relative rounded-xl overflow-hidden transition-all duration-150 animate-fade-in ${
                  selectMode ? 'cursor-pointer' : 'hover:translate-x-0.5'
                }`}
                style={{
                  background: isSelected
                    ? 'linear-gradient(90deg, rgba(244,63,94,0.06) 0%, hsl(var(--card)) 100%)'
                    : 'hsl(var(--card))',
                  border: isSelected ? '1px solid rgba(244, 63, 94, 0.4)' : '1px solid hsl(var(--border))',
                  boxShadow: isSelected ? '0 0 14px rgba(244, 63, 94, 0.12)' : undefined,
                }}
              >
                <div
                  className="absolute left-0 top-0 bottom-0 w-1"
                  style={{
                    background: isSelected
                      ? 'linear-gradient(180deg, #f43f5e, #be123c)'
                      : 'linear-gradient(180deg, #38BDF8, #0ea5e9)'
                  }}
                />

                <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {selectMode && (
                      <div className="flex-shrink-0">
                        {isSelected ? (
                          <div className="w-5 h-5 rounded-md bg-gradient-to-br from-rose-400 to-rose-600 flex items-center justify-center text-white shadow-[0_0_10px_rgba(244,63,94,0.4)] border border-rose-400/20">
                            <Check className="w-3.5 h-3.5 stroke-[3.5]" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-md border border-border bg-muted/20 hover:border-muted-foreground/50 transition-colors flex items-center justify-center" />
                        )}
                      </div>
                    )}
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{
                        background: isSelected ? 'rgba(244, 63, 94, 0.12)' : 'rgba(56, 189, 248, 0.1)',
                        border: isSelected ? '1px solid rgba(244, 63, 94, 0.25)' : '1px solid rgba(56, 189, 248, 0.2)',
                      }}
                    >
                      <Award className={`w-4 h-4 ${isSelected ? 'text-rose-400' : 'text-brand-cyan'}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-extrabold text-foreground break-words leading-snug">{res.exam_name}</h3>
                    <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1.5 mt-1.5">
                      <Calendar className="w-3.5 h-3.5 text-muted-foreground/80" />
                      <span>Published: {formatDateTime(res.published_at)}</span>
                    </span>
                  </div>
                </div>

                {!selectMode && (
                  <div className="flex items-center justify-end gap-2 flex-shrink-0 w-full sm:w-auto mt-2.5 sm:mt-0 pt-2.5 sm:pt-0 border-t border-border/50 sm:border-0">
                    <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end">
                      {res.result_sheet_url ? (
                        <AttachmentViewer url={res.result_sheet_url} fileName={`${res.exam_name}_results`}>
                          <button className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-bold text-[#121214] bg-gradient-to-r from-amber-400 to-amber-500 shadow-[0_4px_12px_rgba(245,158,11,0.2)] hover:shadow-[0_6px_16px_rgba(245,158,11,0.35)] hover:from-amber-300 hover:to-amber-500 active:scale-[0.97] transition-all cursor-pointer">
                            <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="hidden xs:inline">View Marksheet</span>
                            <span className="xs:hidden">View</span>
                            <ArrowUpRight className="w-3 h-3 flex-shrink-0" />
                          </button>
                        </AttachmentViewer>
                      ) : (
                        <span className="text-[10px] text-muted-foreground/60 italic">No attachment</span>
                      )}
                      <EditResultModal result={res} />
                      <DeleteButton id={res.id} onDelete={deleteResult} confirmMessage="Are you sure you want to delete this result?" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <BulkDeleteBar count={selectedIds.size} onCancel={toggleSelectMode} onDelete={handleBulkDelete} label="results" />
    </>
  );
}
