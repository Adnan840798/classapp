'use client';

import { useState } from 'react';
import { Check, CornerDownRight, Loader2, Send } from 'lucide-react';
import { TimelineQuestion } from '@/types';
import { formatDateTime } from '@/lib/utils/formatters';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { answerQuestion, resolveQuestion } from '@/lib/actions/calendar';

interface QuestionCardProps {
  question: TimelineQuestion;
  currentUserId: string;
}

export function QuestionCard({ question: initialQuestion, currentUserId }: QuestionCardProps) {
  const [question, setQuestion] = useState<TimelineQuestion>(initialQuestion);
  const [answerText, setAnswerText] = useState('');
  const [isAnswering, setIsAnswering] = useState(false);
  const [isResolving, setIsResolving] = useState(false);

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

  return (
    <div className={`glass-card p-5 flex flex-col gap-4 border ${question.is_resolved ? 'border-emerald-500/30 bg-emerald-500/5' : ''}`}>
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
            <p className="text-xs font-semibold text-foreground">
              {question.asker?.full_name || 'Student'}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {formatDateTime(question.created_at)}
            </p>
          </div>
        </div>

        {question.is_resolved ? (
          <span className="badge bg-emerald-500/10 text-emerald-400 border-emerald-500/20 px-2.5 py-1 rounded-md text-[10px] uppercase font-bold flex items-center gap-1">
            <Check className="w-3.5 h-3.5" />
            Resolved
          </span>
        ) : (
          <button
            onClick={handleResolve}
            disabled={isResolving}
            className="text-[10px] uppercase font-bold px-3 py-1.5 rounded-lg border border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10 disabled:opacity-50 transition-colors flex items-center gap-1"
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
      <div className="text-sm font-medium text-foreground pl-1">
        {question.question}
      </div>

      {/* Answers Section */}
      {question.answers && question.answers.length > 0 && (
        <div className="flex flex-col gap-3 pl-4 border-l border-border mt-2">
          {question.answers.map((ans) => (
            <div key={ans.id} className="flex items-start gap-3 text-xs leading-relaxed">
              <CornerDownRight className="w-3.5 h-3.5 text-muted-foreground mt-1 flex-shrink-0" />
              <div className="flex-1 bg-accent/20 border border-border/30 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-foreground">
                    {ans.answerer?.full_name || 'CR'}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {formatDateTime(ans.created_at)}
                  </span>
                </div>
                <p className="text-muted-foreground whitespace-pre-line">
                  {ans.answer}
                </p>
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
            className="form-input flex-1 py-1.5 text-xs"
          />
          <button
            type="submit"
            disabled={isAnswering || !answerText.trim()}
            className="btn-primary py-1.5 px-3 flex-shrink-0"
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
