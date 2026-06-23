'use client';

import { useState } from 'react';
import { Check, CornerDownRight, Loader2, Send, Pencil } from 'lucide-react';
import { TimelineQuestion } from '@/types';
import { formatDateTime } from '@/lib/utils/formatters';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { answerQuestion, resolveQuestion, editQuestion, editAnswer } from '@/lib/actions/calendar';

interface QuestionCardProps {
  question: TimelineQuestion;
  currentUserId: string;
}

export function QuestionCard({ question: initialQuestion, currentUserId }: QuestionCardProps) {
  const [question, setQuestion] = useState<TimelineQuestion>(initialQuestion);
  const [answerText, setAnswerText] = useState('');
  const [isAnswering, setIsAnswering] = useState(false);
  const [isResolving, setIsResolving] = useState(false);

  // Editing Q&A states
  const [editingQuestion, setEditingQuestion] = useState(false);
  const [editedQuestionText, setEditedQuestionText] = useState(question.question);
  const [editingAnswerId, setEditingAnswerId] = useState<string | null>(null);
  const [editedAnswerText, setEditedAnswerText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  async function handleAnswerSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!answerText.trim()) return;

    setIsAnswering(true);
    const formData = new FormData();
    formData.append('answer', answerText);

    try {
      const res = await answerQuestion(question.id, formData);
      if (res && res.error) {
        alert(res.error);
      } else {
        setAnswerText('');
        // Reload answers page or mock insert in local state
        window.location.reload();
      }
    } catch (err) {
      console.error(err);
      alert('Failed to submit answer.');
    } finally {
      setIsAnswering(false);
    }
  }

  async function handleResolve() {
    if (!window.confirm('Mark this question as resolved? Students will no longer see inputs for this.')) return;

    setIsResolving(true);
    try {
      const res = await resolveQuestion(question.id);
      if (res && res.error) {
        alert(res.error);
      } else {
        setQuestion((prev) => ({
          ...prev,
          is_resolved: true,
        }));
        window.location.reload();
      }
    } catch (err) {
      console.error(err);
      alert('Failed to resolve question.');
    } finally {
      setIsResolving(false);
    }
  }

  async function handleEditQuestionSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editedQuestionText.trim()) return;

    setIsSaving(true);
    const formData = new FormData();
    formData.append('question', editedQuestionText);

    try {
      const res = await editQuestion(question.id, formData);
      if (res && res.error) {
        alert(res.error);
      } else {
        setQuestion((prev) => ({ ...prev, question: editedQuestionText }));
        setEditingQuestion(false);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to edit question.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleEditAnswerSubmit(e: React.FormEvent, answerId: string) {
    e.preventDefault();
    if (!editedAnswerText.trim()) return;

    setIsSaving(true);
    const formData = new FormData();
    formData.append('answer', editedAnswerText);

    try {
      const res = await editAnswer(answerId, formData);
      if (res && res.error) {
        alert(res.error);
      } else {
        setQuestion((prev) => ({
          ...prev,
          answers: (prev.answers || []).map((ans) =>
            ans.id === answerId ? { ...ans, answer: editedAnswerText } : ans
          ),
        }));
        setEditingAnswerId(null);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to edit answer.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className={`glass-card p-5.5 flex flex-col gap-4 rounded-2xl border transition-all duration-200 hover:border-muted-foreground/30 ${
      question.is_resolved 
        ? 'border-emerald-500/30 bg-emerald-500/[0.02] dark:bg-emerald-500/[0.04] shadow-md shadow-emerald-950/5' 
        : 'border-border bg-card'
    }`}>
      {/* Question Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <UserAvatar
            profile={{
              full_name: question.asker?.full_name || 'Student',
              profile_pic_url: question.asker?.profile_pic_url || null,
            }}
            size="sm"
          />
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-semibold text-foreground">
                {question.asker?.full_name || 'Student'}
              </span>
              {currentUserId === question.asked_by && !question.is_resolved && !editingQuestion && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingQuestion(true);
                    setEditedQuestionText(question.question);
                  }}
                  className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer touch-compact"
                  title="Edit Question"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {formatDateTime(question.created_at)}
            </p>
          </div>
        </div>

        {question.is_resolved ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-300 shadow-sm">
            <Check className="w-3.5 h-3.5" />
            Resolved
          </span>
        ) : (
          <button
            onClick={handleResolve}
            disabled={isResolving}
            className="text-[10px] uppercase font-bold px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 disabled:opacity-50 transition-all active:scale-[0.98] flex items-center gap-1 cursor-pointer touch-compact"
          >
            {isResolving ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Check className="w-3 h-3" />
            )}
            Resolve
          </button>
        )}
      </div>

      {/* Question Text */}
      <div className="text-sm font-medium text-foreground pl-1 leading-relaxed">
        {editingQuestion ? (
          <form onSubmit={handleEditQuestionSubmit} className="flex flex-col gap-2 w-full mt-1">
            <textarea
              required
              rows={2}
              maxLength={500}
              value={editedQuestionText}
              onChange={(e) => setEditedQuestionText(e.target.value)}
              disabled={isSaving}
              className="form-input text-xs w-full py-2 px-3 rounded-lg"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingQuestion(false)}
                disabled={isSaving}
                className="px-3 py-1 rounded-lg text-[10px] font-semibold border border-border hover:bg-muted/50 text-muted-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving || !editedQuestionText.trim()}
                className="btn-yellow text-[10px] !py-1 !px-3"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        ) : (
          question.question
        )}
      </div>

      {/* Answers Section */}
      {question.answers && question.answers.length > 0 && (
        <div className="flex flex-col gap-3 pl-4 border-l border-border mt-2">
          {question.answers.map((ans) => (
            <div key={ans.id} className="flex items-start gap-3 text-xs leading-relaxed">
              <CornerDownRight className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 mt-1.5 flex-shrink-0" />
              <div className="flex-1 bg-muted/20 border border-border rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between mb-1.5 gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">
                      {ans.answerer?.full_name || 'CR'}
                    </span>
                    <span className="text-[10px] text-zinc-800 dark:text-zinc-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md font-bold uppercase tracking-widest scale-90">
                      CR
                    </span>
                  </div>
                  {currentUserId === ans.answered_by && !question.is_resolved && editingAnswerId !== ans.id && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingAnswerId(ans.id);
                        setEditedAnswerText(ans.answer);
                      }}
                      className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer touch-compact"
                      title="Edit Answer"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                  )}
                </div>
                {editingAnswerId === ans.id ? (
                  <form onSubmit={(e) => handleEditAnswerSubmit(e, ans.id)} className="flex flex-col gap-2 w-full mt-1">
                    <textarea
                      required
                      rows={2}
                      maxLength={1000}
                      value={editedAnswerText}
                      onChange={(e) => setEditedAnswerText(e.target.value)}
                      disabled={isSaving}
                      className="form-input text-xs w-full py-2 px-3 rounded-lg"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingAnswerId(null)}
                        disabled={isSaving}
                        className="px-3 py-1 rounded-lg text-[10px] font-semibold border border-border hover:bg-muted/50 text-muted-foreground transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSaving || !editedAnswerText.trim()}
                        className="btn-yellow text-[10px] !py-1 !px-3"
                      >
                        {isSaving ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <p className="text-zinc-800 dark:text-zinc-200 whitespace-pre-line text-xs">
                    {ans.answer}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Answer Form */}
      {!question.is_resolved && (
        <form onSubmit={handleAnswerSubmit} className="flex gap-2 pl-4 border-l border-border mt-1">
          <input
            type="text"
            required
            placeholder="Type your answer here..."
            maxLength={1000}
            value={answerText}
            onChange={(e) => setAnswerText(e.target.value)}
            disabled={isAnswering}
            className="form-input flex-1 py-2 text-xs rounded-xl"
          />
          <button
            type="submit"
            disabled={isAnswering || !answerText.trim()}
            className="btn-primary py-2 px-4 flex-shrink-0 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center"
          >
            {isAnswering ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
          </button>
        </form>
      )}
    </div>
  );
}
