import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft, Megaphone, Calendar, HelpCircle, MessageSquare, CornerDownRight, Check, AlertCircle, Paperclip, FileText, Image as ImageIcon } from 'lucide-react';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { formatDateTime } from '@/lib/utils/formatters';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { AskQuestionForm } from '../../calendar/[id]/AskQuestionForm';
import { TimelineQuestion } from '@/types';

interface StudentAnnouncementDetailPageProps {
  params: Promise<{ id: string }>;
}

export const revalidate = 0; // force dynamic rendering

export default async function StudentAnnouncementDetailPage({ params }: StudentAnnouncementDetailPageProps) {
  const { id } = await params;
  const supabase = await getSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

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
      <div className="glass-card p-6 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
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
                <Calendar className="w-3.5 h-3.5" />
                {formatDateTime(announcement.created_at)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {announcement.is_public && (
              <span className="badge badge-public">Public</span>
            )}
          </div>
        </div>

        <div className="border-t border-border/50 pt-3 flex flex-col gap-2">
          <h2 className="text-lg font-bold text-foreground">
            {announcement.title}
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
            {announcement.body}
          </p>
        </div>

        {announcement.attachment_url && (
          <div className="mt-2 pt-3 border-t border-border/50">
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
              <span>View Attachment</span>
            </a>
          </div>
        )}
      </div>

      {/* Ask Question Input */}
      <div className="mt-2">
        {hasUnresolvedQuestion ? (
          <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 p-4 rounded-lg flex items-start gap-3 text-xs leading-normal">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Pending Question:</span> You currently have an unresolved question on this announcement.
              You can ask another question once your previous question has been answered and marked resolved by a CR.
            </div>
          </div>
        ) : (
          <AskQuestionForm entityId={announcement.id} entityType="announcement" />
        )}
      </div>

      {/* Q&A List */}
      <div className="border-t border-border pt-6 mt-2">
        <h3 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-primary" />
          Questions & Answers ({questions.length})
        </h3>

        {questions.length === 0 ? (
          <div className="glass-card p-10 text-center flex flex-col items-center justify-center gap-2">
            <MessageSquare className="w-10 h-10 text-muted-foreground opacity-30" />
            <h4 className="text-sm font-semibold">No questions yet</h4>
            <p className="text-xs text-muted-foreground">
              Have questions about this announcement? Ask them above to get answers from your CRs.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {questions.map((q) => (
              <div
                key={q.id}
                className={`glass-card p-5 flex flex-col gap-4 border ${
                  q.is_resolved ? 'border-emerald-500/20 bg-emerald-500/5' : ''
                }`}
              >
                {/* Question Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <UserAvatar
                      profile={{
                        full_name: q.asker?.full_name || 'Student',
                        profile_pic_url: q.asker?.profile_pic_url || null,
                      }}
                      size="sm"
                    />
                    <div>
                      <p className="text-xs font-semibold text-foreground">
                        {q.asker?.full_name || 'Student'}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {formatDateTime(q.created_at)}
                      </p>
                    </div>
                  </div>
                  {q.is_resolved && (
                    <span className="badge bg-emerald-500/10 text-emerald-400 border-emerald-500/20 px-2 py-0.5 rounded text-[10px] uppercase font-bold flex items-center gap-0.5">
                      <Check className="w-3 h-3" />
                      Resolved
                    </span>
                  )}
                </div>

                {/* Question text */}
                <p className="text-sm font-semibold text-foreground pl-1">
                  {q.question}
                </p>

                {/* Answers list */}
                {q.answers && q.answers.length > 0 && (
                  <div className="flex flex-col gap-3 pl-4 border-l border-border mt-1">
                    {q.answers.map((ans) => (
                      <div key={ans.id} className="flex items-start gap-2.5 text-xs">
                        <CornerDownRight className="w-3.5 h-3.5 text-muted-foreground mt-1 flex-shrink-0" />
                        <div className="flex-1 bg-accent/20 border border-border/30 rounded-xl p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-foreground">
                              {ans.answerer?.full_name || 'CR'}
                            </span>
                            <span className="text-[9px] text-muted-foreground">
                              {formatDateTime(ans.created_at)}
                            </span>
                          </div>
                          <p className="text-muted-foreground whitespace-pre-line leading-relaxed">
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
