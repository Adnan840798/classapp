'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Send, Loader2, AlertTriangle } from 'lucide-react';
import { createAnnouncement } from '@/lib/actions/announcements';
import { FileUpload } from '@/components/ui/FileUpload';

export default function NewAnnouncementPage() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customDate, setCustomDate] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const dateParam = searchParams.get('date');
      if (dateParam) {
        setCustomDate(dateParam);
      }
    }
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setError(null);

    const formData = new FormData(event.currentTarget);

    try {
      const res = await createAnnouncement(formData);
      // res is only returned when there is an error; on success the action redirects
      if (res && res.error) {
        setError(res.error);
        setIsPending(false);
      }
    } catch (err: unknown) {
      // Next.js redirect() throws a special internal error — ignore it, the
      // redirect already happened and no error should be shown to the user.
      if (
        err instanceof Error &&
        (err.message === 'NEXT_REDIRECT' || (err as { digest?: string }).digest?.startsWith('NEXT_REDIRECT'))
      ) {
        return;
      }
      console.error(err);
      setError('An unexpected error occurred. Please try again.');
      setIsPending(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto w-full flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link
          href={customDate ? "/cr/timeline" : "/cr/announcements"}
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

          {customDate && (
            <>
              <input type="hidden" name="custom_created_at" value={customDate} />
              <input type="hidden" name="redirect_to" value="timeline" />
              <div className="bg-violet-500/10 border border-violet-500/20 text-violet-300 p-3.5 rounded-lg flex items-start gap-2 text-xs">
                <span>Adding this announcement directly to the timeline day: <strong className="text-white">{customDate}</strong></span>
              </div>
            </>
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
              placeholder="Write the announcement details here..."
              maxLength={5000}
              className="form-input resize-none"
              disabled={isPending}
            />
          </div>

          {/* Attachment — reusable component */}
          <FileUpload
            name="attachment"
            accept="image/*,application/pdf"
            label="Attachment (Image or PDF)"
            disabled={isPending}
          />



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
              className="btn-yellow"
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
