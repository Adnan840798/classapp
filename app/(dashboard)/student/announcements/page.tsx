import Link from 'next/link';
import {
  Megaphone,
  FileText,
  ArrowRight,
} from 'lucide-react';
import { formatDateTime } from '@/lib/utils/formatters';
import { AttachmentViewer } from '@/components/ui/AttachmentViewer';
import { getCachedAnnouncements } from '@/lib/cache/queries';

// revalidate = 0 kept because this page reads cookies for auth context
export const revalidate = 0;

export default async function StudentAnnouncementsPage() {
  // Uses tenant-scoped unstable_cache internally — DB query is shared
  // across all students for 60s instead of 60 individual queries.
  const announcements = await getCachedAnnouncements();

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
                className="relative rounded-xl overflow-hidden transition-all duration-150 hover:translate-x-0.5 animate-fade-in"
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

                <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Left section: Icon + Info */}
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{
                        background: isImportant ? 'rgba(139, 92, 246, 0.12)' : 'rgba(148,163,184,0.08)',
                        border: isImportant ? '1px solid rgba(139, 92, 246, 0.25)' : '1px solid rgba(148,163,184,0.15)',
                      }}
                    >
                      <Megaphone className={`w-5 h-5 ${isImportant ? 'text-brand-purple' : 'text-slate-400'}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <h3 className="text-sm font-extrabold text-white break-words leading-snug">
                          {announcement.title}
                        </h3>
                      </div>
                      <p className="text-xs text-slate-400 whitespace-pre-line leading-relaxed break-words">
                        {announcement.body}
                      </p>
                    </div>
                  </div>

                  {/* Right section: Author/Date + Actions */}
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
                        href={`/student/announcements/${announcement.id}`}
                        className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg text-emerald-400 border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 transition-all whitespace-nowrap"
                      >
                        Question &amp; Answer
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
