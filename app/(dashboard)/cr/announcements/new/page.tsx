'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Send, Loader2, Paperclip, AlertTriangle } from 'lucide-react';
import { createAnnouncement } from '@/lib/actions/announcements';

export default function NewAnnouncementPage() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    
    try {
      const res = await createAnnouncement(formData);
      if (res && res.error) {
        setError(res.error);
        setIsPending(false);
      }
    } catch (err) {
      console.error(err);
      setError('An unexpected error occurred. Please try again.');
      setIsPending(false);
    }
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('File must be under 5MB.');
        event.target.value = '';
        setFileName(null);
        return;
      }
      setFileName(file.name);
    } else {
      setFileName(null);
    }
  }

  return (
    <div className="max-w-2xl mx-auto w-full flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link
          href="/cr/announcements"
          className="flex items-center justify-center w-9 h-9 rounded-lg border border-border bg-background hover:bg-accent text-muted-foreground hover:text-foreground transition-all duration-200"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="page-header mb-0">
          <h1 className="page-title">New Announcement</h1>
          <p className="page-subtitle">Publish announcement to students and Telegram channel</p>
        </div>
      </div>

      <div className="glass-card p-6 md:p-8">
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg flex items-start gap-3 text-sm">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="title" className="text-sm font-semibold text-foreground">
              Title
            </label>
            <input
              id="title"
              name="title"
              type="text"
              required
              placeholder="e.g. Midterm exam scheduling updates"
              maxLength={200}
              className="form-input"
              disabled={isPending}
            />
          </div>

          {/* Body */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="body" className="text-sm font-semibold text-foreground">
              Announcement Body
            </label>
            <textarea
              id="body"
              name="body"
              required
              rows={6}
              placeholder="Write the announcements details here..."
              maxLength={5000}
              className="form-input resize-none"
              disabled={isPending}
            />
          </div>

          {/* Attachment */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-foreground">
              Attachment (Image or PDF)
            </label>
            <div className="relative border border-dashed border-border rounded-lg p-6 flex flex-col items-center justify-center gap-2 hover:bg-accent/30 transition-colors cursor-pointer">
              <input
                type="file"
                name="attachment"
                accept="image/*,application/pdf"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={handleFileChange}
                disabled={isPending}
              />
              <Paperclip className="w-8 h-8 text-muted-foreground opacity-50" />
              <p className="text-xs text-muted-foreground text-center">
                {fileName ? (
                  <span className="font-semibold text-primary">{fileName}</span>
                ) : (
                  'Drag and drop or click to upload (max 5MB)'
                )}
              </p>
            </div>
          </div>

          {/* Checkboxes */}
          <div className="flex flex-col gap-4 border-t border-border pt-4">
            <div className="flex items-center gap-3">
              <div className="relative flex items-center">
                <input
                  id="is_important"
                  name="is_important"
                  value="true"
                  type="checkbox"
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20 bg-background"
                  disabled={isPending}
                />
              </div>
              <label htmlFor="is_important" className="text-sm font-medium text-foreground cursor-pointer select-none">
                Mark as <span className="text-red-400 font-semibold">Important</span> (Red accent & highlighted)
              </label>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative flex items-center">
                <input
                  id="is_public"
                  name="is_public"
                  value="true"
                  type="checkbox"
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20 bg-background"
                  disabled={isPending}
                />
              </div>
              <label htmlFor="is_public" className="text-sm font-medium text-foreground cursor-pointer select-none">
                Make <span className="text-emerald-400 font-semibold">Public</span> (Visible to unauthenticated visitors)
              </label>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Link
              href="/cr/announcements"
              className="px-4 py-2.5 rounded-lg border border-border hover:bg-accent text-sm font-semibold transition-all"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isPending}
              className="btn-primary"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Publishing...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Publish Announcement
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
