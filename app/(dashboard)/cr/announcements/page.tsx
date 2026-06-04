import Link from 'next/link';
import { Plus, MessageSquare, Paperclip, FileText, Image as ImageIcon, Calendar } from 'lucide-react';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { formatDateTime } from '@/lib/utils/formatters';
import { deleteAnnouncement } from '@/lib/actions/announcements';
import { DeleteButton } from '@/components/ui/DeleteButton';
import { UserAvatar } from '@/components/ui/UserAvatar';

export const revalidate = 0; // force dynamic rendering

export default async function CRAnnouncementsPage() {
  const supabase = await getSupabaseServerClient();

  // Query announcements with creator profiles
  const { data: announcements, error } = await supabase
    .from('announcements')
    .select('*, creator:profiles(full_name, profile_pic_url)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to load announcements:', error);
  }

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="page-header mb-0">
          <h1 className="page-title">Announcements</h1>
          <p className="page-subtitle">Manage class announcements, notifications, and Telegram posts</p>
        </div>
        <Link href="/cr/announcements/new" className="btn-primary self-start sm:self-auto">
          <Plus className="w-4 h-4" />
          New Announcement
        </Link>
      </div>

      {!announcements || announcements.length === 0 ? (
        <div className="glass-card p-12 text-center flex flex-col items-center justify-center gap-3">
          <MessageSquare className="w-12 h-12 text-muted-foreground opacity-30 animate-pulse" />
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {announcements.map((announcement) => {
            const isImportant = announcement.is_important;
            return (
              <div
                key={announcement.id}
                className={`announcement-card relative flex flex-col justify-between ${
                  isImportant ? 'important border-l-4 border-l-red-500' : ''
                }`}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <UserAvatar
                        profile={{
                          full_name: announcement.creator?.full_name || 'CR',
                          profile_pic_url: announcement.creator?.profile_pic_url || null,
                        }}
                        size="sm"
                      />
                      <div>
                        <p className="text-xs font-semibold text-foreground">
                          {announcement.creator?.full_name || 'Class Representative'}
                        </p>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDateTime(announcement.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {isImportant && (
                        <span className="badge badge-important">
                          Important
                        </span>
                      )}
                      {announcement.is_public && (
                        <span className="badge badge-public">
                          Public
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Body Content */}
                  <h3 className="text-base font-bold text-foreground mb-2 leading-snug">
                    {announcement.title}
                  </h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed mb-4">
                    {announcement.body}
                  </p>
                </div>

                {/* Attachment & Action Footer */}
                <div className="mt-4 pt-4 border-t border-border flex items-center justify-between gap-4">
                  {announcement.attachment_url ? (
                    <a
                      href={announcement.attachment_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-xs font-medium text-primary hover:underline"
                    >
                      {announcement.attachment_type === 'image' ? (
                        <ImageIcon className="w-4 h-4" />
                      ) : (
                        <FileText className="w-4 h-4" />
                      )}
                      <span className="truncate max-w-[200px]">View Attachment</span>
                    </a>
                  ) : (
                    <div className="text-[10px] text-muted-foreground italic flex items-center gap-1">
                      <Paperclip className="w-3 h-3" />
                      No attachment
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    {announcement.telegram_posted && (
                      <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full font-semibold">
                        Telegram Posted
                      </span>
                    )}
                    <DeleteButton
                      id={announcement.id}
                      onDelete={deleteAnnouncement}
                      confirmMessage="Are you sure you want to delete this announcement? This action cannot be undone."
                    />
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
