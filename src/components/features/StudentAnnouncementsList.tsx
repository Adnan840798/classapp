'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Megaphone,
  FileText,
  ArrowRight,
  Pin,
  Loader2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { formatDateTime } from '@/lib/utils/formatters';
import { AttachmentViewer } from '@/components/ui/AttachmentViewer';

type Announcement = {
  id: string;
  title: string;
  body: string;
  is_important: boolean;
  attachment_url: string | null;
  attachment_type: 'image' | 'pdf' | null;
  telegram_posted: boolean;
  created_at: string;
  creator: { full_name: string; profile_pic_url: string | null } | null;
};

export function StudentAnnouncementsList({ announcements }: { announcements: Announcement[] }) {
  const router = useRouter();
  const [qaNavigatingId, setQaNavigatingId] = useState<string | null>(null);
  const [isPinnedExpanded, setIsPinnedExpanded] = useState(true);
  const [isAnnouncementsExpanded, setIsAnnouncementsExpanded] = useState(true);

  // Pinned stay at top, sorted newest first
  const pinnedAnnouncements = (announcements || [])
    .filter((a) => a.is_important)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // All non-pinned merged into one list: newest first (future → present → old)
  const allNonPinnedAnnouncements = (announcements || [])
    .filter((a) => !a.is_important)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div className="flex flex-col gap-6 w-full animate-fade-in">
      {/* Page Header */}
      <div className="page-header mb-0">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="page-title">Announcements</h1>
            <p className="page-subtitle">Academic notices, official messages, and updates from your CRs</p>
          </div>
        </div>
      </div>

      {!announcements || announcements.length === 0 ? (
        <div className="glass-card p-12 text-center flex flex-col items-center justify-center gap-3">
          <Megaphone className="w-12 h-12 text-muted-foreground opacity-30" />
          <h2 className="text-lg font-semibold">No announcements found</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            All quiet here. We will display announcements once your class representatives publish them.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">

          {/* ── Pinned Section ─────────────────────────────────────────────── */}
          {pinnedAnnouncements.length > 0 && (
            <div className="flex flex-col gap-3.5 animate-fade-in">
              <button
                onClick={() => setIsPinnedExpanded(!isPinnedExpanded)}
                className="flex items-center gap-2 px-1 py-1 hover:opacity-80 transition-opacity cursor-pointer text-left self-start"
              >
                <Pin className="w-4 h-4 text-cyan-500" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">Pinned</h2>
                {isPinnedExpanded ? (
                  <ChevronDown className="w-4 h-4 text-cyan-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-cyan-500" />
                )}
              </button>
              {isPinnedExpanded && (
                <div className="flex flex-col gap-3 animate-fade-in">

                {pinnedAnnouncements.map((announcement) => (
                  <div
                    key={`pinned-${announcement.id}`}
                    className="relative rounded-xl overflow-hidden transition-all duration-150 hover:translate-x-0.5"
                    style={{
                      background: 'linear-gradient(90deg, rgba(6,182,212,0.06) 0%, hsl(var(--card)) 100%)',
                      border: '1px solid rgba(6, 182, 212, 0.35)',
                    }}
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-cyan-400 to-cyan-600" />

                    <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
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
                            onClick={() => {
                              setQaNavigatingId(announcement.id);
                              router.push(`/student/announcements/${announcement.id}`);
                            }}
                            disabled={qaNavigatingId === announcement.id}
                            className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg text-zinc-800 dark:text-zinc-200 border border-border bg-muted/20 hover:bg-muted/40 transition-all whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                          >
                            Question &amp; Answer
                            {qaNavigatingId === announcement.id ? (
                              <Loader2 className="w-3 h-3 flex-shrink-0 animate-spin" />
                            ) : (
                              <ArrowRight className="w-3 h-3 flex-shrink-0" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              )}
            </div>
          )}

          {/* ── All Announcements — merged, newest first ────────────────────── */}
          {allNonPinnedAnnouncements.length > 0 && (
            <div className="flex flex-col gap-3.5 animate-fade-in">
              <button
                onClick={() => setIsAnnouncementsExpanded(!isAnnouncementsExpanded)}
                className="flex items-center gap-2 px-1 py-1 hover:opacity-80 transition-opacity cursor-pointer text-left self-start"
              >
                <h2 className="text-sm font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Announcements
                </h2>
                {isAnnouncementsExpanded ? (
                  <ChevronDown className="w-4 h-4 text-emerald-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-emerald-500" />
                )}
              </button>
              {isAnnouncementsExpanded && (
                <div className="flex flex-col gap-3 animate-fade-in">
                  {allNonPinnedAnnouncements.map((announcement) => (
                    <div
                      key={announcement.id}
                      className="relative rounded-xl overflow-hidden transition-all duration-150 hover:translate-x-0.5 animate-fade-in"
                      style={{
                        background: 'linear-gradient(90deg, rgba(16,185,129,0.08) 0%, hsl(var(--card)) 100%)',
                        border: '1px solid hsl(var(--primary) / 0.3)',
                      }}
                    >
                      {/* Left accent bar — emerald for all */}
                      <div
                        className="absolute left-0 top-0 bottom-0 w-1"
                        style={{ background: 'linear-gradient(180deg, #34D399, #059669)' }}
                      />

                      <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        {/* Left: Icon + Info */}
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{
                              background: 'rgba(16,185,129,0.1)',
                              border: '1px solid hsl(var(--primary) / 0.25)',
                            }}
                          >
                            <Megaphone className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
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

                        {/* Right: Author/Date + Actions */}
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
                              onClick={() => {
                                setQaNavigatingId(announcement.id);
                                router.push(`/student/announcements/${announcement.id}`);
                              }}
                              disabled={qaNavigatingId === announcement.id}
                              className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg text-zinc-800 dark:text-zinc-200 border border-border bg-muted/20 hover:bg-muted/40 transition-all whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                            >
                              Question &amp; Answer
                              {qaNavigatingId === announcement.id ? (
                                <Loader2 className="w-3 h-3 flex-shrink-0 animate-spin" />
                              ) : (
                                <ArrowRight className="w-3 h-3 flex-shrink-0" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  );
}
