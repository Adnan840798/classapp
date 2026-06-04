'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Send, Loader2, AlertTriangle, Link as LinkIcon } from 'lucide-react';
import { createNote } from '@/lib/actions/notes';

export default function NewNotePage() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    
    try {
      const res = await createNote(formData);
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

  return (
    <div className="max-w-2xl mx-auto w-full flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link
          href="/student/notes"
          className="flex items-center justify-center w-9 h-9 rounded-lg border border-border bg-background hover:bg-accent text-muted-foreground hover:text-foreground transition-all duration-200"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="page-header mb-0">
          <h1 className="page-title">New Note</h1>
          <p className="page-subtitle">Add a new note or study folder reference</p>
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
              Note Title
            </label>
            <input
              id="title"
              name="title"
              type="text"
              required
              placeholder="e.g. CSE 302 Lecture Notes"
              maxLength={200}
              className="form-input"
              disabled={isPending}
            />
          </div>

          {/* Drive Link */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="drive_link" className="text-sm font-semibold text-foreground">
              Google Drive / External Resource Link (Optional)
            </label>
            <div className="relative">
              <input
                id="drive_link"
                name="drive_link"
                type="url"
                placeholder="e.g. https://drive.google.com/drive/folders/..."
                className="form-input pl-10"
                disabled={isPending}
              />
              <LinkIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            </div>
          </div>

          {/* Content */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="content" className="text-sm font-semibold text-foreground">
              Note Content
            </label>
            <textarea
              id="content"
              name="content"
              rows={8}
              placeholder="Write your study notes, reminders, or outlines here..."
              maxLength={10000}
              className="form-input resize-none"
              disabled={isPending}
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Link
              href="/student/notes"
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
                  Saving...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Save Note
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
