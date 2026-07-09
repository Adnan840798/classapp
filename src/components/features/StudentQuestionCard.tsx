'use client';

import { useState } from 'react';
import { Check, CornerDownRight, Loader2, Pencil } from 'lucide-react';
import { TimelineQuestion } from '@/types';
import { formatDateTime } from '@/lib/utils/formatters';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { editQuestion } from '@/lib/actions/calendar';

interface StudentQuestionCardProps {
  question: TimelineQuestion;
  currentUserId: string;
}

export function StudentQuestionCard({ question: initialQuestion, currentUserId }: StudentQuestionCardProps) {
  const [question, setQuestion] = useState<TimelineQuestion>(initialQuestion);
  const [editingQuestion, setEditingQuestion] = useState(false);
  const [editedQuestionText, setEditedQuestionText] = useState(question.question);
  const [isSaving, setIsSaving] = useState(false);

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
            <span className="text-xs font-semibold text-foreground">
              {question.asker?.full_name || 'Student'}
            </span>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {formatDateTime(question.created_at)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {currentUserId === question.asked_by && !question.is_resolved && !editingQuestion && (
            <button
              type="button"
              onClick={() => {
                setEditingQuestion(true);
                setEditedQuestionText(question.question);
              }}
              className="text-[10px] font-bold px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-all active:scale-[0.98] flex items-center gap-1.5 cursor-pointer touch-compact"
              title="Edit Question"
            >
              <Pencil className="w-3 h-3" />
              <span>Edit</span>
            </button>
          )}

          {question.is_resolved && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-300 shadow-sm animate-fade-in">
              <Check className="w-3.5 h-3.5" />
              Resolved
            </span>
          )}
        </div>
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
              <CornerDownRight className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-550 mt-1.5 flex-shrink-0" />
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
                  <span className="text-[10px] text-muted-foreground">
                    {formatDateTime(ans.created_at)}
                  </span>
                </div>
                <p className="text-zinc-800 dark:text-zinc-200 whitespace-pre-line text-xs">
                  {ans.answer}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
