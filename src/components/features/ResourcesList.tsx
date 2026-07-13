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
  Search,
  X,
} from 'lucide-react';
import { formatDateTime } from '@/lib/utils/formatters';
import { deleteNote, bulkDeleteNotes } from '@/lib/actions/notes';
import { DeleteButton } from '@/components/ui/DeleteButton';
import { Note } from '@/types';
import { BulkDeleteBar } from '@/components/ui/BulkDeleteBar';
import { AttachmentViewer } from '@/components/ui/AttachmentViewer';

interface ResourcesListProps {
  initialNotes: Note[];
  currentUserId: string;
  notesPath: string;
}

export function ResourcesList({ initialNotes, currentUserId, notesPath }: ResourcesListProps) {
  const [filter, setFilter] = useState<'all' | 'private' | 'public'>('all');
  const [searchQuery, setSearchQuery] = useState('');
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
    if (filter === 'private' && !(isOwner && !note.is_public)) return false;
    if (filter === 'public' && !note.is_public) return false;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      const titleMatch = note.title?.toLowerCase().includes(query);
      const contentMatch = note.content?.toLowerCase().includes(query);
      return titleMatch || contentMatch;
    }

    return true;
  });

  return (
    <>
      <div className="flex flex-col gap-5 w-full">
      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row md:items-center gap-4 w-full justify-between">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md w-full group">
          <input
            type="text"
            placeholder="Search resources..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 sm:py-3 text-xs sm:text-sm text-foreground bg-muted/15 dark:bg-muted/20 border border-primary/40 dark:border-primary/30 focus:border-primary focus:bg-background/80 dark:focus:bg-card/50 rounded-2xl outline-none transition-all duration-300 shadow-[0_0_8px_rgba(52,211,153,0.04),inset_0_2px_4px_rgba(0,0,0,0.02)] dark:shadow-[0_0_10px_rgba(52,211,153,0.07),inset_0_2px_4px_rgba(0,0,0,0.15)] focus:shadow-[0_0_15px_rgba(52,211,153,0.15)] placeholder:text-muted-foreground/60 font-medium"
          />
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/70 transition-colors duration-300" />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer flex items-center justify-center p-0.5 hover:scale-110 active:scale-95 transition-all duration-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter tabs + Select button */}
        <div className="flex items-center justify-between gap-4 w-full md:w-auto flex-shrink-0">
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
                        {highlightText(note.title || '', searchQuery)}
                      </h3>
                      {note.content && (
                        <p className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed break-words line-clamp-3 mt-1">
                          {highlightText(note.content, searchQuery)}
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
                        {/* Attachment viewer — styled in yellowish/amber */}
                        {note.attachment_url && note.attachment_type && (
                          <div onClick={(e) => e.stopPropagation()}>
                            <AttachmentViewer
                              url={note.attachment_url}
                              fileName={`${note.title}.${note.attachment_type === 'pdf' ? 'pdf' : note.attachment_type === 'pptx' ? 'pptx' : 'jpg'}`}
                            >
                              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold text-[#121214] bg-gradient-to-r from-amber-400 to-amber-500 shadow-[0_4px_12px_rgba(245,158,11,0.2)] hover:shadow-[0_6px_16px_rgba(245,158,11,0.35)] hover:from-amber-300 hover:to-amber-500 active:scale-[0.97] transition-all cursor-pointer whitespace-nowrap">
                                <FileText className="w-3 h-3 flex-shrink-0" />
                                <span>
                                  {note.attachment_type === 'pdf' 
                                    ? 'View PDF' 
                                    : note.attachment_type === 'pptx' 
                                    ? 'View PPTX' 
                                    : 'View Image'}
                                </span>
                              </button>
                            </AttachmentViewer>
                          </div>
                        )}

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

function escapeRegExp(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlightText(text: string, highlight: string) {
  if (!highlight.trim()) return <>{text}</>;
  const escapedHighlight = escapeRegExp(highlight.trim());
  const regex = new RegExp(`(${escapedHighlight})`, 'gi');
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark
            key={i}
            className="bg-emerald-500/20 text-[#34D399] dark:bg-emerald-500/25 dark:text-emerald-400 px-0.5 rounded-sm font-bold"
          >
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}
