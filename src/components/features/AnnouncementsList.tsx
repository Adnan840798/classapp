'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import {
  Plus, Megaphone, FileText, ArrowRight,
  Square, Trash2, Check, CheckSquare,
} from 'lucide-react';
import { formatDateTime } from '@/lib/utils/formatters';
import { deleteAnnouncement, bulkDeleteAnnouncements } from '@/lib/actions/announcements';
import { DeleteButton } from '@/components/ui/DeleteButton';
import { AttachmentViewer } from '@/components/ui/AttachmentViewer';
import { EditAnnouncementModal } from '@/components/features/EditAnnouncementModal';
import { BulkDeleteBar } from '@/components/ui/BulkDeleteBar';

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
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer flex-shrink-0 ${
              selectMode
                ? 'bg-rose-500/15 border-rose-500/30 text-rose-400 hover:bg-rose-500/20'
                : 'border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/[0.04]'
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

      {/* List */}
      <div className="flex flex-col gap-3">
        {announcements.map((announcement) => {
          const isImportant = announcement.is_important;
          const isSelected = selectedIds.has(announcement.id);

          return (
            <div
              key={announcement.id}
              onClick={selectMode ? () => toggleItem(announcement.id) : undefined}
              className={`relative rounded-xl overflow-hidden transition-all duration-150 ${
                selectMode ? 'cursor-pointer' : 'hover:translate-x-0.5'
              } animate-fade-in`}
              style={{
                background: isSelected
                  ? 'linear-gradient(90deg, rgba(244,63,94,0.06) 0%, rgba(26,29,36,0.65) 100%)'
                  : isImportant
                    ? 'linear-gradient(90deg, rgba(52,211,153,0.09) 0%, rgba(26,29,36,0.65) 100%)'
                    : 'linear-gradient(90deg, rgba(148,163,184,0.04) 0%, rgba(26,29,36,0.45) 100%)',
                border: isSelected
                  ? '1px solid rgba(244, 63, 94, 0.4)'
                  : isImportant
                    ? '1px solid rgba(52,211,153,0.28)'
                    : '1px solid rgba(148,163,184,0.15)',
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
                      : 'linear-gradient(180deg, #475569, #1e293b)',
                }}
              />

              <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                {/* Left: checkbox (select mode) + icon + info */}
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
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{
                      background: isSelected
                        ? 'rgba(244, 63, 94, 0.12)'
                        : isImportant
                          ? 'rgba(52,211,153,0.12)'
                          : 'rgba(148,163,184,0.08)',
                      border: isSelected
                        ? '1px solid rgba(244, 63, 94, 0.25)'
                        : isImportant
                          ? '1px solid rgba(52,211,153,0.25)'
                          : '1px solid rgba(148,163,184,0.15)',
                    }}
                  >
                    <Megaphone className={`w-5 h-5 ${isSelected ? 'text-rose-400' : isImportant ? 'text-emerald-400' : 'text-slate-400'}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <h3 className="text-sm font-extrabold text-white break-words leading-snug">
                        {announcement.title}
                      </h3>
                      {announcement.telegram_posted && (
                        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-[#38bdf8]/10 border border-[#38bdf8]/20 text-[#38bdf8] uppercase tracking-wider">
                          Telegram
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 whitespace-pre-line leading-relaxed break-words">
                      {announcement.body}
                    </p>
                  </div>
                </div>

                {/* Right: author/date + actions (hidden in select mode) */}
                {!selectMode && (
                  <div className="flex flex-col gap-2.5 flex-shrink-0 w-full sm:w-auto mt-3 sm:mt-0 pt-3 sm:pt-0 border-t border-white/[0.04] sm:border-0 sm:items-end">
                    <div className="flex flex-col items-start sm:items-end">
                      <span className="text-[10px] text-slate-400 font-bold leading-none">
                        {announcement.creator?.full_name || 'CR'}
                      </span>
                      <span className="text-[9px] text-slate-500 font-medium mt-1">
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
                        className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg text-emerald-400 border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 transition-all whitespace-nowrap"
                      >
                        Question &amp; Answer
                        <ArrowRight className="w-3 h-3 flex-shrink-0" />
                      </Link>
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

      <BulkDeleteBar
        count={selectedIds.size}
        onCancel={toggleSelectMode}
        onDelete={handleBulkDelete}
        label="announcements"
      />
    </>
  );
}
