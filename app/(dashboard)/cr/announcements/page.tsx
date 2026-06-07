import Link from 'next/link';
import {
  Plus,
  MessageSquare,
  Paperclip,
  FileText,
  Image as ImageIcon,
  Calendar,
  Globe,
  Lock,
  Send,
  Megaphone,
} from 'lucide-react';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { formatDateTime } from '@/lib/utils/formatters';
import { deleteAnnouncement } from '@/lib/actions/announcements';
import { DeleteButton } from '@/components/ui/DeleteButton';
import { UserAvatar } from '@/components/ui/UserAvatar';

export const revalidate = 0; // force dynamic rendering

export default async function CRAnnouncementsPage() {
  const supabase = await getSupabaseServerClient();

  const { data: announcements, error } = await supabase
    .from('announcements')
    .select('*, creator:profiles(full_name, profile_pic_url)')
    .order('is_important', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to load announcements:', error);
  }

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Announcements</h1>
          <p className="page-subtitle">Manage class announcements, notifications, and Telegram posts</p>
        </div>
        <Link href="/cr/announcements/new" className="btn-primary self-start sm:self-auto flex-shrink-0">
          <Plus className="w-4 h-4" />
          New Announcement
        </Link>
      </div>

      {!announcements || announcements.length === 0 ? (
        <div className="glass-card p-12 text-center flex flex-col items-center justify-center gap-3">
          <Megaphone className="w-12 h-12 text-muted-foreground opacity-30 animate-pulse" />
          <h2 className="text-lg font-semibold">No announcements yet</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            Create your first announcement to notify the class and post it to Telegram.
          </p>
          <Link href="/cr/announcements/new" className="btn-primary mt-2">
            <Plus className="w-4 h-4" />
            Create Announcement
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {announcements.map((announcement) => {
            const isImportant = announcement.is_important;
            return (
              <div
                key={announcement.id}
                className="relative rounded-xl overflow-hidden transition-all duration-150 hover:translate-x-0.5"
                style={{
                  background: isImportant
                    ? 'linear-gradient(90deg, rgba(239,68,68,0.06) 0%, rgba(11,14,30,0.6) 100%)'
                    : 'rgba(11,14,30,0.4)',
                  border: isImportant ? '1px solid rgba(239,68,68,0.25)' : '1px solid #1e2a4a',
                }}
              >
                {/* Left accent bar */}
                {isImportant && (
                  <div
                    className="absolute left-0 top-0 bottom-0 w-1"
                    style={{ background: 'linear-gradient(180deg, #ef4444, #f97316)' }}
                  />
                )}

                <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Left section: Icon + Title & Body */}
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{
                        background: isImportant ? 'rgba(239,68,68,0.1)' : 'rgba(99,102,241,0.1)',
                        border: isImportant ? '1px solid rgba(239,68,68,0.2)' : '1px solid rgba(99,102,241,0.2)',
                      }}
                    >
                      <Megaphone className={`w-4 h-4 ${isImportant ? 'text-red-400' : 'text-indigo-400'}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="text-sm font-extrabold text-white break-words leading-snug">
                          {announcement.title}
                        </h3>
                        {announcement.telegram_posted && (
                          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-[#38bdf8]/10 border border-[#38bdf8]/20 text-[#38bdf8]">
                            Telegram
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-2 whitespace-pre-line leading-relaxed break-words">
                        {announcement.body}
                      </p>
                    </div>
                  </div>

                  {/* Right section: Author, date, actions */}
                  <div className="flex items-center justify-between sm:justify-end gap-6 flex-shrink-0">
                    <div className="text-left sm:text-right flex flex-col items-start sm:items-end gap-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-400 font-bold">
                          {announcement.creator?.full_name || 'CR'}
                        </span>
                        {announcement.is_public ? (
                          <span className="text-[7px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/25 text-emerald-400">
                            Public
                          </span>
                        ) : (
                          <span className="text-[7px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                            Class
                          </span>
                        )}
                      </div>
                      <p className="text-[9px] text-slate-500 font-medium">
                        {formatDateTime(announcement.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {announcement.attachment_url && (
                        <a
                          href={announcement.attachment_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg bg-slate-800/40 hover:bg-slate-800 border border-slate-700/50 text-indigo-400 hover:text-white transition-colors"
                          title="View Attachment"
                        >
                          {announcement.attachment_type === 'image' ? (
                            <ImageIcon className="w-3.5 h-3.5" />
                          ) : (
                            <FileText className="w-3.5 h-3.5" />
                          )}
                        </a>
                      )}
                      <Link
                        href={`/cr/announcements/${announcement.id}`}
                        className="flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 rounded-lg text-indigo-400 border border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-500/10 transition-all"
                      >
                        Q&A Panel
                      </Link>
                      <DeleteButton
                        id={announcement.id}
                        onDelete={deleteAnnouncement}
                        confirmMessage="Are you sure you want to delete this announcement? This action cannot be undone."
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
