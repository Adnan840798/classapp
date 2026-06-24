'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Pencil, X, Loader2 } from 'lucide-react';
import { overlayStack } from '@/lib/utils/overlayStack';
import { updateAnnouncement } from '@/lib/actions/announcements';

interface EditAnnouncementModalProps {
  announcement: {
    id: string;
    title: string;
    body: string;
  };
}

export function EditAnnouncementModal({ announcement }: EditAnnouncementModalProps) {
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
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground border border-border hover:bg-muted/50 transition-all cursor-pointer"
        aria-label="Edit Announcement"
      >
        <Pencil className="w-3.5 h-3.5" />
        <span>Edit</span>
      </button>

      {isOpen && createPortal(
        <EditAnnouncementForm announcement={announcement} onClose={() => setIsOpen(false)} />,
        document.body
      )}
    </>
  );
}

interface EditAnnouncementFormProps {
  announcement: {
    id: string;
    title: string;
    body: string;
  };
  onClose: () => void;
}

function EditAnnouncementForm({ announcement, onClose }: EditAnnouncementFormProps) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(announcement.title);
  const [body, setBody] = useState(announcement.body);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsPending(true);
    setError(null);

    const formData = new FormData();
    formData.append('title', title);
    formData.append('body', body);

    try {
      const res = await updateAnnouncement(announcement.id, formData);
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
          <h3 className="text-lg font-bold text-foreground tracking-tight">Edit Announcement</h3>
          <p className="text-xs text-muted-foreground mt-1">Update the announcement details below.</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div role="alert" className="text-xs text-rose-400 font-medium leading-relaxed animate-fade-in">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="edit-title" className="text-xs font-semibold text-muted-foreground">
              Announcement Title
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
            <label htmlFor="edit-body" className="text-xs font-semibold text-muted-foreground">
              Content Body
            </label>
            <textarea
              id="edit-body"
              required
              rows={6}
              value={body}
              onChange={(e) => setBody(e.target.value)}
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

