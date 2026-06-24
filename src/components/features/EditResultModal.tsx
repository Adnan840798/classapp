'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Pencil, X, Loader2 } from 'lucide-react';
import { overlayStack } from '@/lib/utils/overlayStack';
import { updateResult } from '@/lib/actions/results';

interface EditResultModalProps {
  result: {
    id: string;
    exam_name: string;
  };
}

export function EditResultModal({ result }: EditResultModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const closeFn = () => setIsOpen(false);
    overlayStack.push(closeFn);
    return () => overlayStack.pop(closeFn);
  }, [isOpen]);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center justify-center p-2.5 rounded-lg text-amber-400 border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/15 disabled:opacity-50 transition-all cursor-pointer"
        aria-label="Edit Result Name"
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>

      {isOpen && createPortal(
        <EditResultForm result={result} onClose={() => setIsOpen(false)} />,
        document.body
      )}
    </>
  );
}

interface EditResultFormProps {
  result: {
    id: string;
    exam_name: string;
  };
  onClose: () => void;
}

function EditResultForm({ result, onClose }: EditResultFormProps) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [examName, setExamName] = useState(result.exam_name);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsPending(true);
    setError(null);

    const formData = new FormData();
    formData.append('exam_name', examName);

    try {
      const res = await updateResult(result.id, formData);
      if (res && res.error) {
        setError(res.error);
      } else {
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="glass-card max-w-md w-full p-6 sm:p-8 flex flex-col gap-5 relative animate-scale-in">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div>
          <h3 className="text-lg font-bold text-white tracking-tight">Edit Result Sheet</h3>
          <p className="text-xs text-muted-foreground mt-1">Update the examination title details below.</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div role="alert" className="text-xs text-rose-400 font-medium leading-relaxed animate-fade-in">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="edit-exam-name" className="text-xs font-semibold text-slate-300">
              Exam / Assessment Name
            </label>
            <input
              id="edit-exam-name"
              type="text"
              required
              value={examName}
              onChange={(e) => setExamName(e.target.value)}
              className="form-input text-xs"
              disabled={isPending}
            />
          </div>

          <div className="flex items-center justify-end gap-3 mt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-4 py-2 rounded-lg text-xs font-semibold border border-white/[0.08] hover:bg-white/[0.04] text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="btn-yellow text-xs !py-2 !px-4"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

