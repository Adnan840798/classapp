import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, Megaphone, Calendar, HelpCircle, MessageSquare, CornerDownRight, Check, AlertCircle, Paperclip, FileText, Image as ImageIcon } from 'lucide-react';
import { getSupabaseServerClient, getAuthUser } from '@/lib/supabase/server';
import { formatDateTime } from '@/lib/utils/formatters';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { AskQuestionForm } from '../../calendar/[id]/AskQuestionForm';
import { TimelineQuestion } from '@/types';
import { AttachmentViewer } from '@/components/ui/AttachmentViewer';

interface StudentAnnouncementDetailPageProps {
  params: Promise<{ id: string }>;
}

export const revalidate = 0; // force dynamic rendering

export default async function StudentAnnouncementDetailPage({ params }: StudentAnnouncementDetailPageProps) {
  const { id } = await params;
  const { user } = await getAuthUser();
  if (!user) redirect('/login');
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

  // Fetch all questions for this announcement
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

  // Check if this student has an unresolved question
  const hasUnresolvedQuestion = questions.some(
    (q) => q.asked_by === user.id && !q.is_resolved
  );

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/student/announcements"
          className="flex items-center justify-center w-9 h-9 rounded-lg border border-border bg-background hover:bg-accent text-muted-foreground hover:text-foreground transition-all duration-200"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="page-header mb-0">
          <h1 className="page-title">Announcement Q&A</h1>
          <p className="page-subtitle">Ask questions and discuss this announcement</p>
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
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-foreground bg-muted/20 border border-border hover:bg-muted/50 hover:border-border/80 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                >
                  {announcement.attachment_type === 'image' ? (
                    <ImageIcon className="w-3.5 h-3.5 flex-shrink-0 text-emerald-500" />
                  ) : (
                    <FileText className="w-3.5 h-3.5 flex-shrink-0 text-emerald-500" />
                  )}
                  <span>Attachment</span>
                </button>
              </AttachmentViewer>
            )}
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

      {/* Ask Question Input */}
      <div className="mt-2">
        {hasUnresolvedQuestion ? (
          <div className="relative overflow-hidden bg-amber-500/[0.04] border border-amber-500/20 rounded-2xl p-5 flex items-start gap-3.5 shadow-lg backdrop-blur-sm">
            <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-amber-500" />
            <AlertCircle className="w-5 h-5 text-amber-450 flex-shrink-0 mt-0.5 animate-pulse" />
            <div className="flex flex-col gap-1">
              <span className="font-bold text-sm text-zinc-800 dark:text-amber-400">Unresolved Question Pending</span>
              <p className="text-zinc-700 dark:text-zinc-300 text-xs leading-relaxed">
                You have a pending question on this announcement. You can ask another once it is resolved by a Class Representative.
              </p>
            </div>
          </div>
        ) : (
          <AskQuestionForm entityId={announcement.id} entityType="announcement" />
        )}
      </div>

      {/* Q&A List */}
      <div className="border-t border-border pt-6 mt-4">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2.5">
            <HelpCircle className="w-5.5 h-5.5 text-zinc-500 dark:text-zinc-400" />
            <span>
              Discussion Feed
              {questions.length > 0 && (
                <span className="text-muted-foreground font-normal text-sm ml-2">
                  • {questions.length}
                </span>
              )}
            </span>
          </h3>
        </div>

        {questions.length === 0 ? (
          <div className="glass-card p-10 text-center flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card">
            <div className="w-12 h-12 rounded-2xl bg-muted/10 border border-border flex items-center justify-center text-muted-foreground">
              <MessageSquare className="w-6 h-6 opacity-60" />
            </div>
            <div className="flex flex-col gap-1">
              <h4 className="text-sm font-bold text-foreground">No questions posted yet</h4>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
                Have questions about this announcement? Post your query above to get a response directly from your Class Representatives.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {questions.map((q) => (
              <div
                key={q.id}
                className={`glass-card p-5.5 flex flex-col gap-4 rounded-2xl border transition-all duration-200 hover:border-muted-foreground/30 ${
                  q.is_resolved 
                    ? 'border-emerald-500/30 bg-emerald-500/[0.02] dark:bg-emerald-500/[0.04] shadow-md shadow-emerald-950/5' 
                    : 'border-border bg-card'
                }`}
              >
                {/* Question Header */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <UserAvatar
                      profile={{
                        full_name: q.asker?.full_name || 'Student',
                        profile_pic_url: q.asker?.profile_pic_url || null,
                      }}
                      size="sm"
                    />
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-foreground">
                        {q.asker?.full_name || 'Student'}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatDateTime(q.created_at)}
                      </span>
                    </div>
                  </div>
                  {q.is_resolved && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-300 shadow-sm animate-fade-in">
                      <Check className="w-3 h-3" />
                      Resolved
                    </span>
                  )}
                </div>

                {/* Question text */}
                <p className="text-sm font-medium text-foreground leading-relaxed pl-1">
                  {q.question}
                </p>

                {/* Answers list */}
                {q.answers && q.answers.length > 0 && (
                  <div className="flex flex-col gap-3 pl-4 border-l border-border mt-1">
                    {q.answers.map((ans) => (
                      <div key={ans.id} className="flex items-start gap-2.5 text-xs">
                        <CornerDownRight className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-550 mt-1.5 flex-shrink-0" />
                        <div className="flex-1 bg-muted/20 border border-border rounded-xl p-4 shadow-sm">
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-foreground">
                                {ans.answerer?.full_name || 'CR'}
                              </span>
                              <span className="text-[10px] text-zinc-800 dark:text-zinc-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md font-bold uppercase tracking-widest scale-90">
                                CR
                              </span>
                            </div>
                            <span className="text-[10px] text-muted-foreground">
                              {formatDateTime(ans.created_at)}
                            </span>
                          </div>
                          <p className="text-zinc-800 dark:text-zinc-200 whitespace-pre-line leading-relaxed text-xs">
                            {ans.answer}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
