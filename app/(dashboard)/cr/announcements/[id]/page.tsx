import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Megaphone, Calendar, HelpCircle, MessageSquare, Paperclip, FileText, Image as ImageIcon } from 'lucide-react';
import { getSupabaseServerClient, getAuthUser } from '@/lib/supabase/server';
import { formatDateTime } from '@/lib/utils/formatters';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { QuestionCard } from '@/components/features/QuestionCard';
import { TimelineQuestion } from '@/types';
import { AttachmentViewer } from '@/components/ui/AttachmentViewer';
import { EditAnnouncementModal } from '@/components/features/EditAnnouncementModal';

interface CRAnnouncementDetailPageProps {
  params: Promise<{ id: string }>;
}

export const revalidate = 0; // force dynamic rendering

export default async function CRAnnouncementDetailPage({ params }: CRAnnouncementDetailPageProps) {
  const { id } = await params;
  const supabase = await getSupabaseServerClient();

  // Fetch announcement details
  const { data: announcement, error: announcementError } = await supabase
    .from('announcements')
    .select('*, creator:profiles(full_name, profile_pic_url)')
    .eq('id', id)
    .single();

  if (announcementError || !announcement) {
    notFound();
  }

  // Fetch questions for this announcement
  const { data: rawQuestions, error: questionsError } = await supabase
    .from('timeline_questions')
    .select(`
      *,
      asker:profiles!asked_by(full_name, profile_pic_url),
      answers:timeline_answers(
        *,
        answerer:profiles!answered_by(full_name, profile_pic_url)
      )
    `)
    .eq('announcement_id', id)
    .order('created_at', { ascending: false });

  if (questionsError) {
    console.error('Failed to load questions:', questionsError);
  }

  const questions = (rawQuestions || []) as TimelineQuestion[];

  // Get current user ID via cached helper — no extra auth network call
  const { user } = await getAuthUser();

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/cr/announcements"
          className="flex items-center justify-center w-9 h-9 rounded-lg border border-border bg-background hover:bg-accent text-muted-foreground hover:text-foreground transition-all duration-200"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="page-header mb-0">
          <h1 className="page-title">Announcement Q&A Panel</h1>
          <p className="page-subtitle">Answer and resolve questions from students regarding this announcement</p>
        </div>
      </div>

      {/* Announcement Details Card */}
      <div className="glass-card p-6 sm:p-8 flex flex-col gap-6 relative overflow-hidden rounded-2xl shadow-xl border border-border bg-card">
        {/* Card Glow Effect */}
        <div className="absolute top-0 left-0 w-full h-[4px] bg-gradient-to-r from-emerald-500 to-teal-500" />
        
        {/* Header Section */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <UserAvatar
              profile={{
                full_name: announcement.creator?.full_name || 'CR',
                profile_pic_url: announcement.creator?.profile_pic_url || null,
              }}
              size="md"
            />
            <div>
              <p className="text-sm font-bold text-foreground leading-none">
                {announcement.creator?.full_name || 'Class Representative'}
              </p>
              <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1.5 font-medium">
                <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                {formatDateTime(announcement.created_at)}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            {announcement.attachment_url && (
              <AttachmentViewer url={announcement.attachment_url} fileName={`${announcement.title}_attachment`}>
                <button
                  title="View Attachment"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold text-[#121214] bg-gradient-to-r from-amber-400 to-amber-500 shadow-[0_4px_12px_rgba(245,158,11,0.2)] hover:shadow-[0_6px_16px_rgba(245,158,11,0.35)] hover:from-amber-300 hover:to-amber-500 active:scale-[0.97] transition-all cursor-pointer whitespace-nowrap"
                >
                  {announcement.attachment_type === 'image' ? (
                    <ImageIcon className="w-3.5 h-3.5 flex-shrink-0 text-[#121214]" />
                  ) : (
                    <FileText className="w-3.5 h-3.5 flex-shrink-0 text-[#121214]" />
                  )}
                  <span>Attachment</span>
                </button>
              </AttachmentViewer>
            )}
            
            <EditAnnouncementModal announcement={announcement} />
          </div>
        </div>

        {/* Content Section */}
        <div className="flex flex-col gap-4">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight leading-tight">
            {announcement.title}
          </h2>
          <div className="bg-muted/10 border-l-3 border-emerald-500/40 p-4 rounded-r-xl text-zinc-800 dark:text-zinc-200 text-sm sm:text-base leading-relaxed whitespace-pre-line shadow-inner">
            {announcement.body}
          </div>
        </div>
      </div>

      <div className="border-t border-border pt-6 mt-4">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2.5">
            <HelpCircle className="w-5.5 h-5.5 text-emerald-500" />
            <span>
              Questions
              {questions.length > 0 && (
                <span className="text-muted-foreground font-normal text-sm ml-2">
                  • {questions.length}
                </span>
              )}
            </span>
          </h3>
        </div>

        {questions.length === 0 ? (
          <div className="glass-card p-10 text-center flex flex-col items-center justify-center gap-2">
            <MessageSquare className="w-10 h-10 text-muted-foreground opacity-30" />
            <h4 className="text-sm font-semibold">No questions yet</h4>
            <p className="text-xs text-muted-foreground">
              Students haven&apos;t asked any questions about this announcement.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {questions.map((question) => (
              <QuestionCard
                key={question.id}
                question={question}
                currentUserId={user?.id || ''}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
