'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import {
  Plus, Megaphone, FileText, ArrowRight,
  Square, Trash2, Check, CheckSquare, Pin, X,
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

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleTogglePin = (id: string, isPinned: boolean) => {
    startTransition(async () => {
      const res = await togglePinAnnouncement(id, isPinned);
      if (res && res.error) {
        alert(res.error);
      }
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
    const ids = Array.from(selectedIds);
    await bulkDeleteAnnouncements(ids);
    setSelectedIds(new Set());
    setSelectMode(false);
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

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayOfWeek = now.getDay(); // Sunday=0, Monday=1, ..., Thursday=4, Friday=5, Saturday=6
  const activeThreshold = dayOfWeek === 5
    ? new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
    : startOfToday;

  const upcomingAnnouncements = (announcements || [])
    .filter((a) => new Date(a.created_at) >= activeThreshold)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  const pastAnnouncements = (announcements || [])
    .filter((a) => new Date(a.created_at) < activeThreshold)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const pinnedAnnouncements = (announcements || [])
    .filter((a) => a.is_important)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

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

      <div className="flex flex-col gap-8">
        {/* Pinned Section */}
        {pinnedAnnouncements.length > 0 && (
          <div className="flex flex-col gap-3.5">
            <div className="flex items-center gap-2 px-1">
              <Pin className="w-4 h-4 text-amber-500" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Pinned Notices</h2>
            </div>
            <div className="flex flex-col gap-3">
              {pinnedAnnouncements.map((announcement) => {
                const isSelected = selectedIds.has(announcement.id);
                return (
                  <div
                    key={`pinned-${announcement.id}`}
                    onClick={(e) => handleItemClick(e, announcement.id)}
                    className={`relative rounded-xl overflow-hidden transition-all duration-150 ${selectMode ? 'cursor-pointer' : 'hover:translate-x-0.5'
                      }`}
                    style={{
                      background: isSelected
                        ? 'linear-gradient(90deg, rgba(244,63,94,0.06) 0%, hsl(var(--card)) 100%)'
                        : 'linear-gradient(90deg, rgba(245,158,11,0.06) 0%, hsl(var(--card)) 100%)',
                      border: isSelected
                        ? '1px solid rgba(244, 63, 94, 0.4)'
                        : '1px solid rgba(245, 158, 11, 0.3)',
                      boxShadow: isSelected ? '0 0 14px rgba(244, 63, 94, 0.12)' : undefined,
                    }}
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-400 to-amber-600" />
                    
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
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center flex-shrink-0">
                          <Pin className="w-5 h-5 text-amber-500" />
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
                            <Link
                              href={`/cr/announcements/${announcement.id}`}
                              className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg text-zinc-800 dark:text-zinc-400 border border-border bg-muted/20 hover:bg-muted/40 transition-all whitespace-nowrap"
                            >
                              Question &amp; Answer
                              <ArrowRight className="w-3 h-3 flex-shrink-0" />
                            </Link>
                            <button
                              onClick={() => handleTogglePin(announcement.id, false)}
                              title="Unpin from top"
                              className="flex items-center justify-center p-2 rounded-lg border border-amber-500/30 dark:border-amber-500/40 text-amber-500 bg-amber-500/10 hover:bg-amber-500/20 cursor-pointer"
                            >
                              <Pin className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Announcements Section (Current & Upcoming) */}
        <div className="flex flex-col gap-3.5">

          {upcomingAnnouncements.length === 0 ? (
            <p className="text-xs text-muted-foreground italic pl-1 py-1">
              No active or upcoming announcements.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {upcomingAnnouncements.map((announcement) => {
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
                          ? 'linear-gradient(90deg, rgba(16,185,129,0.08) 0%, hsl(var(--card)) 100%)'
                          : 'linear-gradient(90deg, hsl(var(--muted)/0.15) 0%, hsl(var(--card)) 100%)',
                      border: isSelected
                        ? '1px solid rgba(244, 63, 94, 0.4)'
                        : isImportant
                          ? '1px solid hsl(var(--primary) / 0.3)'
                          : '1px solid hsl(var(--border))',
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
                            ? 'linear-gradient(180deg, #34D399, #059669)'
                            : 'linear-gradient(180deg, #71717a, #3f3f46)',
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
                                ? 'rgba(16,185,129,0.1)'
                                : 'hsl(var(--muted) / 0.3)',
                            border: isSelected
                              ? '1px solid rgba(244, 63, 94, 0.25)'
                              : isImportant
                                ? '1px solid hsl(var(--primary) / 0.25)'
                                : '1px solid hsl(var(--border))',
                          }}
                        >
                          <Megaphone className={`w-5 h-5 ${isSelected ? 'text-rose-600 dark:text-rose-400' : isImportant ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`} />
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
                            <Link
                              href={`/cr/announcements/${announcement.id}`}
                              className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg text-zinc-800 dark:text-zinc-400 border border-border bg-muted/20 hover:bg-muted/40 transition-all whitespace-nowrap"
                            >
                              Question &amp; Answer
                              <ArrowRight className="w-3 h-3 flex-shrink-0" />
                            </Link>
                            <button
                              onClick={() => handleTogglePin(announcement.id, !announcement.is_important)}
                              title={announcement.is_important ? "Unpin from top" : "Pin to top"}
                              className={`flex items-center justify-center p-2 rounded-lg border transition-all cursor-pointer ${
                                announcement.is_important
                                  ? 'border-amber-500/30 dark:border-amber-500/40 text-amber-500 bg-amber-500/10 hover:bg-amber-500/20'
                                  : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted/40'
                              }`}
                            >
                              <Pin className="w-3.5 h-3.5" />
                            </button>
                            <EditAnnouncementModal announcement={announcement} />
                            <DeleteButton
                              id={announcement.id}
                              onDelete={deleteAnnouncement}
                              confirmMessage="Are you sure you want to delete this announcement?"
                            />
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

        {/* Past Section */}
        {pastAnnouncements.length > 0 && (
          <div className="flex flex-col gap-3.5 animate-fade-in">
            <div className="flex items-center gap-2 px-1">
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Past Announcements</h2>
            </div>

            <div className="flex flex-col gap-3">
              {pastAnnouncements.map((announcement) => {
                const isSelected = selectedIds.has(announcement.id);

                return (
                  <div
                    key={announcement.id}
                    onClick={(e) => handleItemClick(e, announcement.id)}
                    onTouchStart={() => handleTouchStart(announcement.id)}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    className={`relative rounded-xl overflow-hidden transition-all duration-150 ${selectMode ? 'cursor-pointer' : 'opacity-75 hover:opacity-100 hover:translate-x-0.5'
                      } animate-fade-in`}
                    style={{
                      background: isSelected
                        ? 'linear-gradient(90deg, rgba(244,63,94,0.06) 0%, hsl(var(--card)) 100%)'
                        : 'linear-gradient(90deg, hsl(var(--muted)/0.08) 0%, hsl(var(--card)) 100%)',
                      border: isSelected
                        ? '1px solid rgba(244, 63, 94, 0.4)'
                        : '1px solid hsl(var(--border))',
                      boxShadow: isSelected ? '0 0 14px rgba(244, 63, 94, 0.12)' : undefined,
                    }}
                  >
                    {/* Left accent bar */}
                    <div
                      className="absolute left-0 top-0 bottom-0 w-1"
                      style={{
                        background: isSelected
                          ? 'linear-gradient(180deg, #f43f5e, #be123c)'
                          : 'linear-gradient(180deg, #71717a, #3f3f46)',
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
                              : 'hsl(var(--muted) / 0.15)',
                            border: isSelected
                              ? '1px solid rgba(244, 63, 94, 0.25)'
                              : '1px solid hsl(var(--border))',
                          }}
                        >
                          <Megaphone className={`w-5 h-5 ${isSelected ? 'text-rose-600 dark:text-rose-400' : 'text-muted-foreground'}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1.5">
                            <h3 className="text-sm font-bold text-foreground break-words leading-snug">
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
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold text-muted-foreground border border-border bg-muted/20 hover:bg-muted/40 active:scale-[0.97] transition-all cursor-pointer whitespace-nowrap"
                                >
                                  <FileText className="w-3 h-3 flex-shrink-0" />
                                  <span>Attachment</span>
                                </button>
                              </AttachmentViewer>
                            )}
                            <Link
                              href={`/cr/announcements/${announcement.id}`}
                              className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg text-muted-foreground border border-border bg-muted/20 hover:bg-muted/40 transition-all whitespace-nowrap"
                            >
                              Question &amp; Answer
                              <ArrowRight className="w-3 h-3 flex-shrink-0" />
                            </Link>
                            <button
                              onClick={() => handleTogglePin(announcement.id, !announcement.is_important)}
                              title={announcement.is_important ? "Unpin from top" : "Pin to top"}
                              className={`flex items-center justify-center p-2 rounded-lg border transition-all cursor-pointer ${
                                announcement.is_important
                                  ? 'border-amber-500/30 dark:border-amber-500/40 text-amber-500 bg-amber-500/10 hover:bg-amber-500/20'
                                  : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted/40'
                              }`}
                            >
                              <Pin className="w-3.5 h-3.5" />
                            </button>
                            <EditAnnouncementModal announcement={announcement} />
                            <DeleteButton
                              id={announcement.id}
                              onDelete={deleteAnnouncement}
                              confirmMessage="Are you sure you want to delete this announcement?"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

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
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] sm:text-xs font-bold text-slate-400 hover:text-white border border-white/[0.06] hover:bg-white/[0.06] transition-all cursor-pointer"
              >
                <X className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span>Cancel</span>
              </button>

              <button
                onClick={() => handleBulkPin(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] sm:text-xs font-bold text-amber-400 hover:text-amber-350 border border-amber-500/20 hover:bg-amber-500/10 transition-all cursor-pointer"
              >
                <Pin className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span>Pin</span>
              </button>

              <button
                onClick={() => handleBulkPin(false)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] sm:text-xs font-bold text-amber-500 hover:text-amber-400 border border-amber-500/35 hover:bg-amber-500/15 transition-all cursor-pointer"
              >
                <Pin className="w-3 h-3 sm:w-3.5 sm:h-3.5 rotate-180" />
                <span>Unpin</span>
              </button>

              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-[10px] sm:text-xs font-bold text-white transition-all cursor-pointer active:scale-[0.97]"
                style={{
                  background: 'linear-gradient(135deg, #f43f5e, #e11d48)',
                  boxShadow: '0 4px 12px rgba(244,63,94,0.25)',
                  border: '1px solid rgba(244,63,94,0.15)',
                }}
              >
                <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
