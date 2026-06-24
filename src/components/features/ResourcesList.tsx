'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  ExternalLink,
  Edit2,
  FileText,
  Globe,
  Lock,
  Square,
  Trash2,
  Check,
  CheckSquare,
} from 'lucide-react';
import { formatDateTime } from '@/lib/utils/formatters';
import { deleteNote, bulkDeleteNotes } from '@/lib/actions/notes';
import { DeleteButton } from '@/components/ui/DeleteButton';
import { Note } from '@/types';
import { BulkDeleteBar } from '@/components/ui/BulkDeleteBar';

interface ResourcesListProps {
  initialNotes: Note[];
  currentUserId: string;
  notesPath: string;
}

export function ResourcesList({ initialNotes, currentUserId, notesPath }: ResourcesListProps) {
  const [filter, setFilter] = useState<'all' | 'private' | 'public'>('all');
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const isCR = notesPath === '/cr/notes';

  // Long-press detection refs and handlers (CR only)
  const longPressTimeout = useRef<NodeJS.Timeout | null>(null);
  const isLongPressActive = useRef(false);
  const justSelectedByLongPress = useRef<string | null>(null);

  const handleTouchStart = (id: string) => {
    isLongPressActive.current = false;
    if (!selectMode && isCR) {
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
    await bulkDeleteNotes(Array.from(selectedIds));
    setSelectedIds(new Set());
    setSelectMode(false);
  }

  const filteredNotes = initialNotes.filter((note) => {
    const isOwner = note.user_id === currentUserId;
    if (filter === 'private') return isOwner && !note.is_public;
    if (filter === 'public') return note.is_public;
    return true;
  });

  return (
    <>
      <div className="flex flex-col gap-5 w-full">
      {/* Filter tabs + Select button */}
      <div className="flex items-center justify-between gap-4 w-full">
        <div className="flex items-center gap-1.5 p-1 rounded-xl border border-border bg-muted/40 w-full sm:w-auto">
          {(['all', 'private', 'public'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`flex-1 sm:flex-none text-center px-3 py-2 sm:px-4 sm:py-1.5 rounded-lg text-[10px] sm:text-[11px] font-bold transition-all uppercase tracking-wider cursor-pointer whitespace-nowrap ${
                filter === type
                  ? 'bg-primary text-primary-foreground shadow-[0_0_12px_rgba(52,211,153,0.35)]'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
              }`}
            >
              {type === 'all' ? 'All' : type === 'private' ? 'Private' : 'Public'}
            </button>
          ))}
        </div>

        {isCR && (
          <button
            onClick={toggleSelectMode}
            className={`hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer flex-shrink-0 ${
              selectMode
                ? 'bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20'
                : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted/40'
            }`}
          >
            {selectMode ? <><Trash2 className="w-3.5 h-3.5" /> Cancel Select</> : <><CheckSquare className="w-3.5 h-3.5" /> Select</>}
          </button>
        )}
      </div>

      {/* Empty state */}
      {filteredNotes.length === 0 ? (
        <div className="glass-card p-12 text-center flex flex-col items-center justify-center gap-3">
          <BookOpen className="w-12 h-12 text-muted-foreground opacity-30" />
          <h2 className="text-lg font-semibold">No resources found</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            No resources match the selected filter. Try changing filters or create a new resource.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredNotes.map((note) => {
            const isOwner = note.user_id === currentUserId;
            const isPublic = note.is_public;
            const isSelected = selectedIds.has(note.id);

            return (
              <div
                key={note.id}
                onClick={(e) => handleItemClick(e, note.id)}
                onTouchStart={() => handleTouchStart(note.id)}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                className={`relative rounded-xl overflow-hidden transition-all duration-150 ${
                  selectMode ? 'cursor-pointer' : 'hover:translate-x-0.5'
                }`}
                style={{
                  background: isSelected
                    ? 'linear-gradient(90deg, rgba(239,68,68,0.06) 0%, hsl(var(--card)) 100%)'
                    : isPublic
                      ? 'linear-gradient(90deg, rgba(16,185,129,0.08) 0%, hsl(var(--card)) 100%)'
                      : 'linear-gradient(90deg, hsl(var(--muted)/0.15) 0%, hsl(var(--card)) 100%)',
                  border: isSelected
                    ? '1px solid rgba(239, 68, 68, 0.3)'
                    : isPublic
                      ? '1px solid hsl(var(--primary) / 0.28)'
                      : '1px solid hsl(var(--border))',
                  boxShadow: isSelected ? '0 0 14px rgba(239, 68, 68, 0.08)' : undefined,
                }}
              >
                {/* Left accent bar */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-1"
                  style={{
                    background: isSelected
                      ? 'linear-gradient(180deg, #ef4444, #be123c)'
                      : isPublic
                        ? 'linear-gradient(180deg, #34D399, #059669)'
                        : 'linear-gradient(180deg, #71717a, #3f3f46)',
                  }}
                />

                <div className="pl-5 pr-4 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">

                  {/* ── Left section: icon + title + body ── */}
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {selectMode && (
                      <div className="flex-shrink-0 mt-2.5">
                        {isSelected ? (
                          <div className="w-5 h-5 rounded-md bg-gradient-to-br from-rose-400 to-rose-600 flex items-center justify-center text-white shadow-[0_0_10px_rgba(244,63,94,0.4)] border border-rose-400/20">
                            <Check className="w-3.5 h-3.5 stroke-[3.5]" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-md border border-border bg-muted/20 hover:border-muted-foreground/50 transition-colors flex items-center justify-center" />
                        )}
                      </div>
                    )}
                    {/* Icon badge */}
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{
                        background: isSelected
                          ? 'rgba(239, 68, 68, 0.1)'
                          : isPublic
                            ? 'rgba(16,185,129,0.1)'
                            : 'hsl(var(--muted) / 0.3)',
                        border: isSelected
                          ? '1px solid rgba(239, 68, 68, 0.25)'
                          : isPublic
                            ? '1px solid hsl(var(--primary) / 0.25)'
                            : '1px solid hsl(var(--border))',
                      }}
                    >
                      <FileText className={`w-4 h-4 ${isSelected ? 'text-rose-600 dark:text-rose-400' : isPublic ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-extrabold text-foreground break-words leading-snug">
                        {note.title}
                      </h3>
                      {note.content && (
                        <p className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed break-words line-clamp-3 mt-1">
                          {note.content}
                        </p>
                      )}

                      {/* Metadata: badge + creator + timestamp */}
                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 mt-2 text-[10px] text-muted-foreground font-medium">
                        {isOwner ? (
                          note.is_pending ? (
                            <span className="inline-flex items-center gap-1 text-[7px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/25 text-zinc-800 dark:text-zinc-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                              Pending Approval
                            </span>
                          ) : isPublic ? (
                            <span className="inline-flex items-center gap-1 text-[7px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/25 text-zinc-800 dark:text-zinc-300">
                              <Globe className="w-2.5 h-2.5" />
                              Public
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[7px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-muted border border-border text-muted-foreground">
                              <Lock className="w-2.5 h-2.5" />
                              Private
                            </span>
                          )
                        ) : (
                          <span className="text-[10px] text-muted-foreground font-bold">
                            {note.creator?.full_name || 'Classmate'}
                          </span>
                        )}
                        <span className="text-muted-foreground/45">•</span>
                        <span>{formatDateTime(note.updated_at)}</span>
                      </div>
                    </div>
                  </div>

                  {/* ── Right section: drive + edit/delete ── */}
                  {!selectMode && (
                    <div className="flex items-center justify-end gap-2 flex-shrink-0 w-full sm:w-auto mt-2.5 sm:mt-0 pt-2.5 sm:pt-0 border-t border-border/50 sm:border-0">
                      {/* Action buttons */}
                      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        {/* Drive link — always shown when present */}
                        {note.drive_link && (
                          <a
                            href={note.drive_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Open Google Drive"
                            className="flex items-center justify-center p-2.5 sm:px-3 sm:py-1.5 rounded-lg text-[11px] font-bold text-sky-600 dark:text-sky-400 border border-sky-400/20 dark:border-sky-400/25 bg-sky-500/5 hover:bg-sky-500/10 transition-all cursor-pointer"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span className="ml-1">View</span>
                          </a>
                        )}

                        {/* Edit + Delete — owner or CR */}
                        {(isOwner || isCR) && (
                          <>
                            <Link
                              href={`${notesPath}/${note.id}`}
                              title="Edit Resource"
                              className="flex items-center justify-center p-2.5 sm:px-3 sm:py-1.5 rounded-lg text-[11px] font-bold text-muted-foreground hover:text-foreground border border-border bg-muted/20 hover:bg-muted/40 transition-all"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline ml-1">Edit</span>
                            </Link>
                            <DeleteButton
                              id={note.id}
                              onDelete={deleteNote}
                              confirmMessage="Are you sure you want to delete this resource?"
                            />
                          </>
                        )}
                      </div>
                    </div>
                  )}

                </div>
              </div>
            );
          })}
        </div>
      )}
      </div>

      <BulkDeleteBar
        count={selectedIds.size}
        onCancel={toggleSelectMode}
        onDelete={handleBulkDelete}
        label="resources"
      />
    </>
  );
}
