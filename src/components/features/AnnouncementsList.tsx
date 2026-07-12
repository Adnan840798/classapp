'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus, Megaphone, FileText, ArrowRight,
  Square, Trash2, Check, CheckSquare, Pin, X, AlertTriangle, Loader2,
  ChevronDown, ChevronUp,
} from 'lucide-react';
import { formatDateTime } from '@/lib/utils/formatters';
import {
  deleteAnnouncement,
  bulkDeleteAnnouncements,
  togglePinAnnouncement,
  bulkTogglePinAnnouncements,
} from '@/lib/actions/announcements';
import { DeleteButton } from '@/components/ui/DeleteButton';
import { AttachmentViewer } from '@/components/ui/AttachmentViewer';
import { EditAnnouncementModal } from '@/components/features/EditAnnouncementModal';

type Announcement = {
  id: string;
  title: string;
  body: string;
  is_important: boolean;
  telegram_posted: boolean;
  attachment_url: string | null;
  created_at: string;
  creator: { full_name: string } | null;
};

export function AnnouncementsList({ announcements }: { announcements: Announcement[] }) {
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pinned'>('all');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [pinningIds, setPinningIds] = useState<Set<string>>(new Set());
  const [qaNavigatingId, setQaNavigatingId] = useState<string | null>(null);
  const [isPinnedExpanded, setIsPinnedExpanded] = useState(true);
  const [isAnnouncementsExpanded, setIsAnnouncementsExpanded] = useState(true);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleTogglePin = (id: string, isPinned: boolean) => {
    if (pinningIds.has(id)) return;
    setPinningIds((prev) => new Set(prev).add(id));
    startTransition(async () => {
      const res = await togglePinAnnouncement(id, isPinned);
      if (res && res.error) {
        alert(res.error);
      }
      setPinningIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
    });
  };

  const handleBulkPin = (isPinned: boolean) => {
    startTransition(async () => {
      const ids = Array.from(selectedIds);
      const res = await bulkTogglePinAnnouncements(ids, isPinned);
      if (res && res.error) {
        alert(res.error);
      }
      setSelectedIds(new Set());
      setSelectMode(false);
    });
  };

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
    setIsDeleting(true);
    try {
      const ids = Array.from(selectedIds);
      await bulkDeleteAnnouncements(ids);
      setSelectedIds(new Set());
      setSelectMode(false);
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  }

  if (!announcements || announcements.length === 0) {
    return (
      <div className="glass-card p-12 text-center flex flex-col items-center justify-center gap-3">
        <Megaphone className="w-12 h-12 text-muted-foreground opacity-30 animate-pulse" />
        <h2 className="text-lg font-semibold">No announcements yet</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          Create your first announcement to notify the class and post it to Telegram.
        </p>
        <Link href="/cr/announcements/new" className="btn-yellow mt-2">
          <Plus className="w-4 h-4" />
          Create Announcement
        </Link>
      </div>
    );
  }

  // Pinned stay at top, sorted newest first
  const pinnedAnnouncements = (announcements || [])
    .filter((a) => a.is_important)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // All non-pinned merged into one list: newest first (future → present → old)
  const allNonPinnedAnnouncements = (announcements || [])
    .filter((a) => !a.is_important)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const hasAnyMatches =
    (filter === 'all' && announcements.length > 0) ||
    (filter === 'pinned' && pinnedAnnouncements.length > 0);

  return (
    <>
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Announcements</h1>
          <p className="page-subtitle">Manage class announcements, notifications, and Telegram posts</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={toggleSelectMode}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer flex-shrink-0 ${selectMode
              ? 'bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20'
              : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted/40'
              }`}
          >
            {selectMode ? (
              <><Trash2 className="w-3.5 h-3.5" /> Cancel Select</>
            ) : (
              <><CheckSquare className="w-3.5 h-3.5" /> Select</>
            )}
          </button>
          {!selectMode && (
            <Link href="/cr/announcements/new" className="btn-yellow justify-center flex-shrink-0">
              <Plus className="w-4 h-4" />
              New Announcement
            </Link>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 p-1 rounded-full border border-border bg-muted/30 w-full sm:w-auto self-start">
        {(['all', 'pinned'] as const).map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`flex-1 sm:flex-none text-center px-3.5 py-2 sm:px-5 sm:py-1.5 rounded-full text-[10px] sm:text-[11px] font-bold transition-all duration-200 uppercase tracking-wider cursor-pointer whitespace-nowrap active:scale-[0.97] ${
              filter === type
                ? 'bg-primary text-primary-foreground shadow-[0_4px_12px_rgba(16,185,129,0.35)] dark:shadow-[0_4px_12px_rgba(16,185,129,0.2)]'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {!hasAnyMatches ? (
        <div className="glass-card p-12 text-center flex flex-col items-center justify-center gap-3">
          <Megaphone className="w-12 h-12 text-muted-foreground opacity-30 animate-pulse" />
          <h2 className="text-lg font-semibold">No announcements found</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            No announcements match the selected filter. Try changing the filter.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {/* Pinned Section */}
          {(filter === 'all' || filter === 'pinned') && pinnedAnnouncements.length > 0 && (
          <div className="flex flex-col gap-3.5">
            <button
              onClick={() => setIsPinnedExpanded(!isPinnedExpanded)}
              className="flex items-center gap-2 px-1 py-1 hover:opacity-80 transition-opacity cursor-pointer text-left self-start"
            >
              <Pin className="w-4 h-4 text-cyan-500" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">Pinned</h2>
              {isPinnedExpanded ? (
                <ChevronUp className="w-4 h-4 text-cyan-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-cyan-500" />
              )}
            </button>
            {isPinnedExpanded && (
              <div className="flex flex-col gap-3">
                {pinnedAnnouncements.map((announcement) => {
                  const isSelected = selectedIds.has(announcement.id);
                return (
                  <div
                    key={`pinned-${announcement.id}`}
                    onClick={(e) => handleItemClick(e, announcement.id)}
                    onTouchStart={() => handleTouchStart(announcement.id)}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    className={`relative rounded-xl overflow-hidden transition-all duration-150 ${selectMode ? 'cursor-pointer' : 'hover:translate-x-0.5'
                      }`}
                    style={{
                      background: isSelected
                        ? 'linear-gradient(90deg, rgba(244,63,94,0.06) 0%, hsl(var(--card)) 100%)'
                        : 'linear-gradient(90deg, rgba(6,182,212,0.06) 0%, hsl(var(--card)) 100%)',
                      border: isSelected
                        ? '1px solid rgba(244, 63, 94, 0.4)'
                        : '1px solid rgba(6, 182, 212, 0.35)',
                      boxShadow: isSelected ? '0 0 14px rgba(244, 63, 94, 0.12)' : undefined,
                    }}
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-cyan-400 to-cyan-600" />
                    
                    <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      {/* Left section: Icon + Title */}
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
                        <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center flex-shrink-0">
                          <Pin className="w-5 h-5 text-cyan-500" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-extrabold text-foreground break-words leading-snug">
                            {announcement.title}
                          </h3>
                          <p className="text-xs text-zinc-700 dark:text-zinc-400 whitespace-pre-line leading-relaxed break-words mt-1.5">
                            {announcement.body}
                          </p>
                        </div>
                      </div>

                      {/* Actions */}
                      {!selectMode && (
                        <div className="flex flex-col gap-2.5 flex-shrink-0 w-full sm:w-auto mt-3 sm:mt-0 pt-3 sm:pt-0 border-t border-border/50 sm:border-0 sm:items-end">
                          <div className="flex flex-col items-start sm:items-end">
                            <span className="text-[10px] text-zinc-700 dark:text-zinc-400 font-bold leading-none">
                              {announcement.creator?.full_name || 'CR'}
                            </span>
                            <span className="text-[9px] text-zinc-500 dark:text-zinc-400 font-medium mt-1">
                              {formatDateTime(announcement.created_at)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            {announcement.attachment_url && (
                              <AttachmentViewer url={announcement.attachment_url} fileName={`${announcement.title}_attachment`}>
                                <button
                                  title="View Attachment"
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold text-[#121214] bg-gradient-to-r from-amber-400 to-amber-500 shadow-[0_4px_12px_rgba(245,158,11,0.2)] hover:shadow-[0_6px_16px_rgba(245,158,11,0.35)] hover:from-amber-300 hover:to-amber-500 active:scale-[0.97] transition-all cursor-pointer whitespace-nowrap"
                                >
                                  <FileText className="w-3 h-3 flex-shrink-0" />
                                  <span>Attachment</span>
                                </button>
                              </AttachmentViewer>
                            )}
                            <button
                              onClick={() => { setQaNavigatingId(announcement.id); router.push(`/cr/announcements/${announcement.id}`); }}
                              disabled={qaNavigatingId === announcement.id}
                              className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg text-zinc-800 dark:text-zinc-200 border border-border bg-muted/20 hover:bg-muted/40 transition-all whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                            >
                              Question &amp; Answer
                              {qaNavigatingId === announcement.id
                                ? <Loader2 className="w-3 h-3 flex-shrink-0 animate-spin" />
                                : <ArrowRight className="w-3 h-3 flex-shrink-0" />}
                            </button>
                            <button
                              onClick={() => handleTogglePin(announcement.id, false)}
                              title="Unpin from top"
                              disabled={pinningIds.has(announcement.id)}
                              className="flex items-center justify-center p-2 rounded-lg border border-cyan-500/30 dark:border-cyan-500/40 text-cyan-500 bg-cyan-500/10 hover:bg-cyan-500/20 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                            >
                              {pinningIds.has(announcement.id)
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : <Pin className="w-3.5 h-3.5" />}
                            </button>
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
        )}

        {/* ── All Announcements — merged current + past, newest first ──── */}
        {filter === 'all' && allNonPinnedAnnouncements.length > 0 && (
          <div className="flex flex-col gap-3.5 animate-fade-in">
            <button
              onClick={() => setIsAnnouncementsExpanded(!isAnnouncementsExpanded)}
              className="flex items-center gap-2 px-1 py-1 hover:opacity-80 transition-opacity cursor-pointer text-left self-start"
            >
              <h2 className="text-sm font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Announcements</h2>
              {isAnnouncementsExpanded ? (
                <ChevronUp className="w-4 h-4 text-emerald-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-emerald-500" />
              )}
            </button>
            {isAnnouncementsExpanded && (
              <div className="flex flex-col gap-3">
                {allNonPinnedAnnouncements.map((announcement) => {
                const isImportant = announcement.is_important;
                const isSelected = selectedIds.has(announcement.id);

                return (
                  <div
                    key={announcement.id}
                    onClick={(e) => handleItemClick(e, announcement.id)}
                    onTouchStart={() => handleTouchStart(announcement.id)}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    className={`relative rounded-xl overflow-hidden transition-all duration-150 ${selectMode ? 'cursor-pointer' : 'hover:translate-x-0.5'
                      } animate-fade-in`}
                    style={{
                      background: isSelected
                        ? 'linear-gradient(90deg, rgba(244,63,94,0.06) 0%, hsl(var(--card)) 100%)'
                        : isImportant
                          ? 'linear-gradient(90deg, rgba(6,182,212,0.08) 0%, hsl(var(--card)) 100%)'
                          : 'linear-gradient(90deg, rgba(16,185,129,0.08) 0%, hsl(var(--card)) 100%)',
                      border: isSelected
                        ? '1px solid rgba(244, 63, 94, 0.4)'
                        : isImportant
                          ? '1px solid rgba(6, 182, 212, 0.35)'
                          : '1px solid hsl(var(--primary) / 0.3)',
                      boxShadow: isSelected ? '0 0 14px rgba(244, 63, 94, 0.12)' : undefined,
                    }}
                  >
                    {/* Left accent bar */}
                    <div
                      className="absolute left-0 top-0 bottom-0 w-1"
                      style={{
                        background: isSelected
                          ? 'linear-gradient(180deg, #f43f5e, #be123c)'
                          : isImportant
                            ? 'linear-gradient(180deg, #22d3ee, #0891b2)'
                            : 'linear-gradient(180deg, #34D399, #059669)',
                      }}
                    />

                    <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      {/* Left: checkbox + icon + info */}
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
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{
                            background: isSelected
                              ? 'rgba(244, 63, 94, 0.12)'
                              : isImportant
                                ? 'rgba(6, 182, 212, 0.1)'
                                : 'rgba(16,185,129,0.1)',
                            border: isSelected
                              ? '1px solid rgba(244, 63, 94, 0.25)'
                              : isImportant
                                ? '1px solid rgba(6, 182, 212, 0.25)'
                                : '1px solid hsl(var(--primary) / 0.25)',
                          }}
                        >
                          <Megaphone className={`w-5 h-5 ${isSelected ? 'text-rose-600 dark:text-rose-400' : isImportant ? 'text-cyan-600 dark:text-cyan-400' : 'text-emerald-600 dark:text-emerald-400'}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1.5">
                            <h3 className="text-sm font-extrabold text-foreground break-words leading-snug">
                              {announcement.title}
                            </h3>
                          </div>
                          <p className="text-xs text-zinc-700 dark:text-zinc-400 whitespace-pre-line leading-relaxed break-words">
                            {announcement.body}
                          </p>
                        </div>
                      </div>

                      {/* Right: author/date + actions (hidden in select mode) */}
                      {!selectMode && (
                        <div className="flex flex-col gap-2.5 flex-shrink-0 w-full sm:w-auto mt-3 sm:mt-0 pt-3 sm:pt-0 border-t border-border/50 sm:border-0 sm:items-end">
                          <div className="flex flex-col items-start sm:items-end">
                            <span className="text-[10px] text-zinc-700 dark:text-zinc-400 font-bold leading-none">
                              {announcement.creator?.full_name || 'CR'}
                            </span>
                            <span className="text-[9px] text-zinc-500 dark:text-zinc-400 font-medium mt-1">
                              {formatDateTime(announcement.created_at)}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            {announcement.attachment_url && (
                              <AttachmentViewer url={announcement.attachment_url} fileName={`${announcement.title}_attachment`}>
                                <button
                                  title="View Attachment"
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold text-[#121214] bg-gradient-to-r from-amber-400 to-amber-500 shadow-[0_4px_12px_rgba(245,158,11,0.2)] hover:shadow-[0_6px_16px_rgba(245,158,11,0.35)] hover:from-amber-300 hover:to-amber-500 active:scale-[0.97] transition-all cursor-pointer whitespace-nowrap"
                                >
                                  <FileText className="w-3 h-3 flex-shrink-0" />
                                  <span>Attachment</span>
                                </button>
                              </AttachmentViewer>
                            )}
                            <button
                              onClick={() => { setQaNavigatingId(announcement.id); router.push(`/cr/announcements/${announcement.id}`); }}
                              disabled={qaNavigatingId === announcement.id}
                              className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg text-zinc-800 dark:text-zinc-200 border border-border bg-muted/20 hover:bg-muted/40 transition-all whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                            >
                              Question &amp; Answer
                              {qaNavigatingId === announcement.id
                                ? <Loader2 className="w-3 h-3 flex-shrink-0 animate-spin" />
                                : <ArrowRight className="w-3 h-3 flex-shrink-0" />}
                            </button>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <button
                                onClick={() => handleTogglePin(announcement.id, !announcement.is_important)}
                                title={announcement.is_important ? "Unpin from top" : "Pin to top"}
                                disabled={pinningIds.has(announcement.id)}
                                className={`flex items-center justify-center p-2 rounded-lg border transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                                  announcement.is_important
                                    ? 'border-cyan-500/30 dark:border-cyan-500/40 text-cyan-500 bg-cyan-500/10 hover:bg-cyan-500/20'
                                    : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted/40'
                                }`}
                              >
                                {pinningIds.has(announcement.id)
                                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  : <Pin className="w-3.5 h-3.5" />}
                              </button>
                              <EditAnnouncementModal announcement={announcement} />
                              <DeleteButton
                                id={announcement.id}
                                onDelete={deleteAnnouncement}
                                confirmMessage="Are you sure you want to delete this announcement?"
                              />
                            </div>
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
        )}
      </div>
      )}

      {mounted && selectMode && selectedIds.size > 0 && createPortal(
        <div
          className="fixed left-1/2 -translate-x-1/2 z-[10000] animate-slide-up w-[calc(100%-1.5rem)] xs:w-[calc(100%-2rem)] max-w-[540px]"
          style={{ bottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}
        >
          <div
            className="flex items-center justify-between gap-2 px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-2xl border"
            style={{
              background: 'linear-gradient(135deg, rgba(20,20,25,0.96) 0%, rgba(28,30,38,0.96) 100%)',
              borderColor: 'rgba(245, 158, 11, 0.3)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 12px 40px rgba(0,0,0,0.7), 0 0 0 1px rgba(245, 158, 11, 0.1)',
            }}
          >
            {/* Count badge */}
            <div className="flex items-center gap-2 flex-shrink-0 min-w-0">
              <span
                className="w-6.5 h-6.5 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-black text-white flex-shrink-0"
                style={{
                  background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.25) 0%, rgba(217, 119, 6, 0.25) 100%)',
                  border: '1px solid rgba(245, 158, 11, 0.4)',
                  boxShadow: '0 0 8px rgba(245, 158, 11, 0.15)'
                }}
              >
                {selectedIds.size}
              </span>
              <span className="text-[11px] sm:text-xs font-bold text-slate-300 truncate max-w-[85px] xs:max-w-none">
                {selectedIds.size === 1 ? '1 announcement' : `${selectedIds.size} announcements`}
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              <button
                onClick={toggleSelectMode}
                className="flex items-center justify-center w-9 h-9 sm:w-auto sm:h-auto px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-xl text-[10px] sm:text-xs font-bold text-slate-400 hover:text-white border border-white/[0.06] hover:bg-white/[0.06] transition-all cursor-pointer"
              >
                <X className="w-3.5 h-3.5" /><span className="hidden xs:inline">Cancel</span>
              </button>

              <button
                onClick={() => handleBulkPin(true)}
                className="flex items-center justify-center w-9 h-9 sm:w-auto sm:h-auto px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-xl text-[10px] sm:text-xs font-bold text-amber-400 hover:text-amber-350 border border-amber-500/20 hover:bg-amber-500/10 transition-all cursor-pointer"
              >
                <Pin className="w-3.5 h-3.5" /><span className="hidden xs:inline">Pin</span>
              </button>

              <button
                onClick={() => handleBulkPin(false)}
                className="flex items-center justify-center w-9 h-9 sm:w-auto sm:h-auto px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-xl text-[10px] sm:text-xs font-bold text-amber-500 hover:text-amber-400 border border-amber-500/35 hover:bg-amber-500/15 transition-all cursor-pointer"
              >
                <Pin className="w-3.5 h-3.5 rotate-180" /><span className="hidden xs:inline">Unpin</span>
              </button>

              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center justify-center w-9 h-9 sm:w-auto sm:h-auto px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl text-[10px] sm:text-xs font-bold text-white transition-all cursor-pointer active:scale-[0.97]"
                style={{
                  background: 'linear-gradient(135deg, #f43f5e, #e11d48)',
                  boxShadow: '0 4px 12px rgba(244,63,94,0.25)',
                  border: '1px solid rgba(244,63,94,0.15)',
                }}
              >
                <Trash2 className="w-3.5 h-3.5" /><span className="hidden xs:inline">Delete</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Delete Confirmation Modal ──────────────── */}
      {mounted && showDeleteConfirm && createPortal(
        <div
          className="fixed inset-0 z-[10001] flex items-end sm:items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowDeleteConfirm(false); }}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-5 animate-slide-up"
            style={{
              background: 'linear-gradient(135deg, rgba(18,18,22,0.98) 0%, rgba(26,28,36,0.98) 100%)',
              border: '1px solid rgba(244, 63, 94, 0.35)',
              boxShadow: '0 24px 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(244,63,94,0.08), 0 0 40px rgba(244,63,94,0.08)',
            }}
          >
            <div className="flex items-center justify-center mb-4">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, rgba(244,63,94,0.15), rgba(225,29,72,0.1))',
                  border: '1px solid rgba(244,63,94,0.3)',
                  boxShadow: '0 0 20px rgba(244,63,94,0.15)',
                }}
              >
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              </div>
            </div>
            <h3 className="text-sm font-black text-white text-center mb-1.5">
              Delete {selectedIds.size === 1 ? '1 announcement' : `${selectedIds.size} announcements`}?
            </h3>
            <p className="text-xs text-slate-400 text-center leading-relaxed mb-5">
              This action is permanent and cannot be undone. {selectedIds.size === 1 ? 'This announcement' : 'These announcements'} will be permanently removed.
            </p>
            <div className="flex gap-2.5">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white border border-white/[0.08] hover:bg-white/[0.05] transition-all cursor-pointer disabled:opacity-40"
              >
                Keep
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={isDeleting}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold text-white transition-all cursor-pointer disabled:opacity-60 active:scale-[0.98]"
                style={{
                  background: isDeleting ? 'rgba(244,63,94,0.4)' : 'linear-gradient(135deg, #f43f5e, #e11d48)',
                  boxShadow: '0 4px 16px rgba(244,63,94,0.3)',
                  border: '1px solid rgba(244,63,94,0.2)',
                }}
              >
                {isDeleting ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Deleting…</>
                ) : (
                  <><Trash2 className="w-3.5 h-3.5" /> Yes, Delete</>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
