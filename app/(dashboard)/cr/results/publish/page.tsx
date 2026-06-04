'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Send, Loader2, AlertTriangle, Paperclip, Award } from 'lucide-react';
import { publishResult } from '@/lib/actions/results';

export default function PublishResultPage() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    
    try {
      const res = await publishResult(formData);
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
          href="/cr/results"
          className="flex items-center justify-center w-9 h-9 rounded-lg border border-border bg-background hover:bg-accent text-muted-foreground hover:text-foreground transition-all duration-200"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="page-header mb-0">
          <h1 className="page-title">Publish Result</h1>
          <p className="page-subtitle">Record exam marks and upload answer sheets for a student</p>
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
            {/* Student University ID */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="university_id" className="text-sm font-semibold text-foreground">
                Student University ID
              </label>
              <input
                id="university_id"
                name="university_id"
                type="text"
                required
                placeholder="e.g. 200105180"
                className="form-input font-mono"
                disabled={isPending}
              />
            </div>

            {/* Exam Name */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="exam_name" className="text-sm font-semibold text-foreground">
                Exam Name
              </label>
              <input
                id="exam_name"
                name="exam_name"
                type="text"
                required
                placeholder="e.g. Midterm 1, Semester Final"
                maxLength={200}
                className="form-input"
                disabled={isPending}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Subject */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="subject" className="text-sm font-semibold text-foreground">
                Subject
              </label>
              <input
                id="subject"
                name="subject"
                type="text"
                required
                placeholder="e.g. CSE 302"
                maxLength={100}
                className="form-input"
                disabled={isPending}
              />
            </div>

            {/* Grade */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="grade" className="text-sm font-semibold text-foreground">
                Grade (Optional)
              </label>
              <input
                id="grade"
                name="grade"
                type="text"
                placeholder="e.g. A+, B, F"
                maxLength={10}
                className="form-input"
                disabled={isPending}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Marks */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="marks" className="text-sm font-semibold text-foreground">
                Marks Obtained (Optional)
              </label>
              <input
                id="marks"
                name="marks"
                type="number"
                step="0.01"
                placeholder="e.g. 18.5"
                className="form-input"
                disabled={isPending}
              />
            </div>

            {/* Total Marks */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="total_marks" className="text-sm font-semibold text-foreground">
                Total Marks (Optional)
              </label>
              <input
                id="total_marks"
                name="total_marks"
                type="number"
                step="0.01"
                placeholder="e.g. 20"
                className="form-input"
                disabled={isPending}
              />
            </div>
          </div>

          {/* Result Sheet Attachment */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-foreground">
              Answer Sheet (Image or PDF - Optional)
            </label>
            <div className="relative border border-dashed border-border rounded-lg p-6 flex flex-col items-center justify-center gap-2 hover:bg-accent/30 transition-colors cursor-pointer">
              <input
                type="file"
                name="result_sheet"
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
                  'Drag and drop or click to upload sheet (max 5MB)'
                )}
              </p>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Link
              href="/cr/results"
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
                  Publish Result
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
