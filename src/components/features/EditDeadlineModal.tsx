'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Pencil, X, Loader2 } from 'lucide-react';
import { updateDeadline } from '@/lib/actions/deadlines';

interface EditDeadlineModalProps {
  deadline: {
    id: string;
    title: string;
    subject: string;
    due_date: string;
    description: string | null;
  };
}

export function EditDeadlineModal({ deadline }: EditDeadlineModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground border border-border hover:bg-muted/50 transition-all cursor-pointer"
        aria-label="Edit Deadline"
      >
        <Pencil className="w-3.5 h-3.5" />
        <span>Edit</span>
      </button>

      {isOpen && createPortal(
        <EditDeadlineForm deadline={deadline} onClose={() => setIsOpen(false)} />,
        document.body
      )}
    </>
  );
}

interface EditDeadlineFormProps {
  deadline: {
    id: string;
    title: string;
    subject: string;
    due_date: string;
    description: string | null;
  };
  onClose: () => void;
}

function EditDeadlineForm({ deadline, onClose }: EditDeadlineFormProps) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(deadline.title);
  const [subject, setSubject] = useState(deadline.subject);
  
  // Format initial ISO date into HTML local datetime format (YYYY-MM-DDTHH:MM)
  const initialDate = (() => {
    try {
      if (!deadline.due_date) return '';
      const d = new Date(deadline.due_date);
      // Adjust to local time of the client browser
      const offset = d.getTimezoneOffset() * 60000;
      return new Date(d.getTime() - offset).toISOString().slice(0, 16);
    } catch {
      return '';
    }
  })();
  const [dueDate, setDueDate] = useState(initialDate);
  const [description, setDescription] = useState(deadline.description || '');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsPending(true);
    setError(null);

    const formData = new FormData();
    formData.append('title', title);
    formData.append('subject', subject);
    formData.append('due_date', dueDate);
    formData.append('description', description);

    try {
      const res = await updateDeadline(deadline.id, formData);
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
      <div className="glass-card max-w-lg w-full p-6 sm:p-8 flex flex-col gap-5 relative animate-scale-in">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div>
          <h3 className="text-lg font-bold text-foreground tracking-tight">Edit Deadline</h3>
          <p className="text-xs text-muted-foreground mt-1">Update the assignment or exam deadline details below.</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div role="alert" className="text-xs text-rose-400 font-medium leading-relaxed animate-fade-in">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="edit-title" className="text-xs font-semibold text-muted-foreground">
                Deadline Title
              </label>
              <input
                id="edit-title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="form-input text-xs"
                disabled={isPending}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="edit-subject" className="text-xs font-semibold text-muted-foreground">
                Subject / Course Code
              </label>
              <input
                id="edit-subject"
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="form-input text-xs"
                disabled={isPending}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="edit-due-date" className="text-xs font-semibold text-muted-foreground">
              Due Date and Time
            </label>
            <input
              id="edit-due-date"
              type="datetime-local"
              required
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="form-input text-xs"
              disabled={isPending}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="edit-description" className="text-xs font-semibold text-muted-foreground">
              Description (Optional)
            </label>
            <textarea
              id="edit-description"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="form-input text-xs resize-none"
              disabled={isPending}
            />
          </div>

          <div className="flex items-center justify-end gap-3 mt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-4 py-2 rounded-lg text-xs font-semibold border border-border hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="btn-primary text-xs !py-2 !px-4"
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

