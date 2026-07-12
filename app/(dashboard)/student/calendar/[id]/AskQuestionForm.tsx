'use client';

import { useState } from 'react';
import { Send, Loader2, AlertTriangle } from 'lucide-react';
import { askQuestion } from '@/lib/actions/calendar';

interface AskQuestionFormProps {
  entityId: string;
  entityType?: 'event' | 'announcement' | 'deadline';
}

export function AskQuestionForm({ entityId, entityType = 'event' }: AskQuestionFormProps) {
  const [inputText, setInputText] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!inputText.trim() || inputText.length > 500) return;

    setIsPending(true);
    setError(null);

    const formData = new FormData();
    formData.append('question', inputText);

    try {
      const res = await askQuestion(entityId, entityType, formData);
      if (res && res.error) {
        setError(res.error);
      } else {
        setInputText('');
        window.location.reload();
      }
    } catch (err) {
      console.error(err);
      setError('Failed to post question. Please try again.');
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="glass-card p-5.5 rounded-2xl border border-border bg-card shadow-xl relative overflow-hidden">
      {/* Glow highlight */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500/50 to-teal-500/50" />
      <h4 className="text-sm font-bold text-foreground mb-3 tracking-wide">Ask a Question</h4>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3.5 rounded-xl text-xs flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            required
            placeholder="Ask a question about room, syllabus, materials, or schedules..."
            maxLength={500}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isPending}
            className="form-input text-xs flex-1 rounded-xl"
          />
          <button
            type="submit"
            disabled={isPending || !inputText.trim() || inputText.length > 500}
            className="btn-primary py-2 px-4 text-xs flex-shrink-0 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center"
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>

        <div className="flex justify-between items-center text-[10px] text-muted-foreground px-1">
          <span>Your question will be visible to classmates and answered by CRs.</span>
          <span className={`font-semibold ${inputText.length > 450 ? 'text-red-400 font-bold' : 'text-muted-foreground'}`}>
            {inputText.length} / 500
          </span>
        </div>
      </form>
    </div>
  );
}
