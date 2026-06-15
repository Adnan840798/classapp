import Link from 'next/link';
import {
  Megaphone,
  FileText,
  Image as ImageIcon,
  ArrowRight,
} from 'lucide-react';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { formatDateTime } from '@/lib/utils/formatters';
import { AttachmentViewer } from '@/components/ui/AttachmentViewer';

export const revalidate = 0;

export default async function StudentAnnouncementsPage() {
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
      <div className="page-header">
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
          <h2 className="text-lg font-semibold">No announcements yet</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            All quiet here. We will display announcements once your class representatives publish them.
          </p>
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
                    ? 'linear-gradient(90deg, rgba(52,211,153,0.09) 0%, rgba(26,29,36,0.65) 100%)'
                    : 'linear-gradient(90deg, rgba(148,163,184,0.04) 0%, rgba(26,29,36,0.45) 100%)',
                  border: isImportant ? '1px solid rgba(52,211,153,0.28)' : '1px solid rgba(148,163,184,0.15)',
                }}
              >
                {/* Left accent bar */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-1"
                  style={{
                    background: isImportant
                      ? 'linear-gradient(180deg, #34D399, #059669)'
                      : 'linear-gradient(180deg, #475569, #1e293b)',
                  }}
                />

                <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Left section: File Icon + Title & Description */}
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{
                        background: isImportant ? 'rgba(139, 92, 246, 0.12)' : 'rgba(148,163,184,0.08)',
                        border: isImportant ? '1px solid rgba(139, 92, 246, 0.25)' : '1px solid rgba(148,163,184,0.15)',
                      }}
                    >
                      <Megaphone className={`w-4 h-4 ${isImportant ? 'text-brand-purple' : 'text-slate-400'}`} />
                    </div>
                    <div className="min-w-0 flex-1 pr-[100px] sm:pr-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="text-sm font-extrabold text-white break-words leading-snug">
                          {announcement.title}
                        </h3>
                      </div>
                      <p className="text-xs text-slate-400 mt-2 whitespace-pre-line leading-relaxed break-words">
                        {announcement.body}
                      </p>
                      {announcement.attachment_url && (
                        <div className="absolute top-3.5 right-3.5 sm:static sm:mt-3 sm:block">
                          <AttachmentViewer url={announcement.attachment_url} fileName={`${announcement.title}_attachment`}>
                            <button
                              title="View Attachment"
                              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[10px] font-bold text-[#121214] bg-gradient-to-r from-amber-400 to-amber-500 shadow-[0_4px_12px_rgba(245,158,11,0.2)] hover:shadow-[0_6px_16px_rgba(245,158,11,0.35)] hover:from-amber-300 hover:to-amber-500 active:scale-[0.97] transition-all cursor-pointer"
                            >
                              {announcement.attachment_type === 'image' ? (
                                <ImageIcon className="w-3.5 h-3.5 flex-shrink-0" />
                              ) : (
                                <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                              )}
                              <span>Attachment</span>
                            </button>
                          </AttachmentViewer>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right section: Author + Date + Action Button */}
                  <div className="flex items-center justify-between sm:justify-end gap-6 flex-shrink-0">
                    <div className="text-left sm:text-right flex flex-col items-start sm:items-end gap-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-400 font-bold">
                          {announcement.creator?.full_name || 'CR'}
                        </span>
                        {announcement.is_public ? (
                          <span className="text-[7px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-sky-500/10 border border-sky-500/25 text-sky-400">
                            Public
                          </span>
                        ) : (
                          <span className="text-[7px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-600/20 border border-slate-600/30 text-slate-400">
                            Class
                          </span>
                        )}
                      </div>
                      <p className="text-[9px] text-slate-500 font-medium">
                        {formatDateTime(announcement.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/student/announcements/${announcement.id}`}
                        className="flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 rounded-lg text-emerald-400 border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 transition-all"
                      >
                        Question & Answer
                        <ArrowRight className="w-3 h-3 flex-shrink-0" />
                      </Link>
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
