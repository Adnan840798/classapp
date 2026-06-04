'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Send, Loader2, AlertTriangle, Calendar } from 'lucide-react';
import { createCalendarEvent } from '@/lib/actions/calendar';

export default function NewCalendarEventPage() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    
    try {
      const res = await createCalendarEvent(formData);
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
          href="/cr/calendar"
          className="flex items-center justify-center w-9 h-9 rounded-lg border border-border bg-background hover:bg-accent text-muted-foreground hover:text-foreground transition-all duration-200"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="page-header mb-0">
          <h1 className="page-title">New Event</h1>
          <p className="page-subtitle">Schedule exams, classes, holidays, or submissions</p>
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
              Event Title
            </label>
            <input
              id="title"
              name="title"
              type="text"
              required
              placeholder="e.g. Theory of Computation midterm exam"
              maxLength={200}
              className="form-input"
              disabled={isPending}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Event Date */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="event_date" className="text-sm font-semibold text-foreground">
                Event Date
              </label>
              <div className="relative">
                <input
                  id="event_date"
                  name="event_date"
                  type="date"
                  required
                  className="form-input pl-10"
                  disabled={isPending}
                />
                <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              </div>
            </div>

            {/* Event Type */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="event_type" className="text-sm font-semibold text-foreground">
                Event Type
              </label>
              <select
                id="event_type"
                name="event_type"
                required
                defaultValue="other"
                className="form-input bg-background"
                disabled={isPending}
              >
                <option value="class">Class</option>
                <option value="exam">Exam</option>
                <option value="submission">Submission</option>
                <option value="holiday">Holiday</option>
                <option value="other">Other Event</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="description" className="text-sm font-semibold text-foreground">
              Description / Details (Optional)
            </label>
            <textarea
              id="description"
              name="description"
              rows={4}
              placeholder="e.g. Room 402, 10:00 AM. Syllabus: Chapters 1-4."
              maxLength={1000}
              className="form-input resize-none"
              disabled={isPending}
            />
          </div>

          {/* Settings */}
          <div className="flex flex-col gap-4 border-t border-border pt-4">
            <div className="flex items-center gap-3">
              <div className="relative flex items-center">
                <input
                  id="is_public"
                  name="is_public"
                  value="true"
                  type="checkbox"
                  defaultChecked
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20 bg-background"
                  disabled={isPending}
                />
              </div>
              <label htmlFor="is_public" className="text-sm font-medium text-foreground cursor-pointer select-none">
                Make <span className="text-emerald-400 font-semibold">Public</span> (Visible to unauthenticated visitors)
              </label>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative flex items-center">
                <input
                  id="qa_enabled"
                  name="qa_enabled"
                  value="true"
                  type="checkbox"
                  defaultChecked
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary/20 bg-background"
                  disabled={isPending}
                />
              </div>
              <label htmlFor="qa_enabled" className="text-sm font-medium text-foreground cursor-pointer select-none">
                Enable <span className="text-primary font-semibold">Timeline Q&A</span> (Allows students to ask questions about this event)
              </label>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Link
              href="/cr/calendar"
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
                  Scheduling...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Schedule Event
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
