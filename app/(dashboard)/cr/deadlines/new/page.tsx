'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Send, Loader2, AlertTriangle, Calendar } from 'lucide-react';
import { createDeadline } from '@/lib/actions/deadlines';

export default function NewDeadlinePage() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    
    try {
      const res = await createDeadline(formData);
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
          href="/cr/deadlines"
          className="flex items-center justify-center w-9 h-9 rounded-lg border border-border bg-background hover:bg-accent text-muted-foreground hover:text-foreground transition-all duration-200"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="page-header mb-0">
          <h1 className="page-title">New Deadline</h1>
          <p className="page-subtitle">Publish a new assignment or exam deadline to the class</p>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Title */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="title" className="text-sm font-semibold text-foreground">
                Deadline Title
              </label>
              <input
                id="title"
                name="title"
                type="text"
                required
                placeholder="e.g. Assignment 2"
                maxLength={200}
                className="form-input"
                disabled={isPending}
              />
            </div>

            {/* Subject */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="subject" className="text-sm font-semibold text-foreground">
                Subject / Course
              </label>
              <input
                id="subject"
                name="subject"
                type="text"
                required
                placeholder="e.g. CSE 301"
                maxLength={100}
                className="form-input"
                disabled={isPending}
              />
            </div>
          </div>

          {/* Due Date */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="due_date" className="text-sm font-semibold text-foreground">
              Due Date & Time
            </label>
            <div className="relative">
              <input
                id="due_date"
                name="due_date"
                type="datetime-local"
                required
                className="form-input pl-10"
                disabled={isPending}
              />
              <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            </div>
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="description" className="text-sm font-semibold text-foreground">
              Description / Submission Instructions (Optional)
            </label>
            <textarea
              id="description"
              name="description"
              rows={4}
              placeholder="e.g. Submit on Google Classroom. Max PDF size 10MB."
              maxLength={1000}
              className="form-input resize-none"
              disabled={isPending}
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Link
              href="/cr/deadlines"
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
                  Creating...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Create Deadline
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
