'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft, Send, Loader2, Link as LinkIcon, Paperclip, X } from 'lucide-react';
import { createNote } from '@/lib/actions/notes';

function isRedirectError(err: any): boolean {
  return (
    err &&
    (err.message === 'NEXT_REDIRECT' ||
      err.message?.includes('NEXT_REDIRECT') ||
      err.digest?.startsWith('NEXT_REDIRECT'))
  );
}

export default function NewNotePage() {
  const pathname = usePathname();
  const isCR = pathname.startsWith('/cr');
  const notesPath = isCR ? '/cr/notes' : '/student/notes';

  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    if (attachmentFile) {
      formData.set('attachment', attachmentFile);
    }
    
    try {
      const res = await createNote(formData);
      if (res && res.error) {
        setError(res.error);
        setIsPending(false);
      }
    } catch (err: unknown) {
      if (
        isRedirectError(err) ||
        (err && typeof err === 'object' && ('digest' in err && String((err as any).digest).startsWith('NEXT_REDIRECT')))
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
          href={notesPath}
          className="flex items-center justify-center w-9 h-9 rounded-lg border border-border bg-background hover:bg-accent text-muted-foreground hover:text-foreground transition-all duration-200"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="page-header mb-0">
          <h1 className="page-title">New Resource</h1>
          <p className="page-subtitle">Add a new class resource or study link</p>
        </div>
      </div>

      <div className="glass-card p-6 md:p-8">
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {error && (
            <div role="alert" className="text-xs text-rose-400 font-medium leading-relaxed animate-fade-in">
              {error}
            </div>
          )}

          {/* Title */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="title" className="text-sm font-semibold text-foreground">
              Resource Title
            </label>
            <input
              id="title"
              name="title"
              type="text"
              required
              placeholder="e.g. CSE 302 Lecture Slides"
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
              Resource Description / Content
            </label>
            <textarea
              id="content"
              name="content"
              rows={8}
              placeholder="Write resource description, study outlines, or reminders here..."
              maxLength={10000}
              className="form-input resize-none"
              disabled={isPending}
            />
          </div>

          {/* File Attachment — CR only */}
          {isCR && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5 text-primary" />
                File Attachment (Optional)
              </label>
              <p className="text-xs text-muted-foreground -mt-0.5">
                Upload supporting materials (image, PDF, or PowerPoint presentation up to 5 MB). Public files will automatically be shared to the Telegram channel.
              </p>

              {attachmentFile ? (
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-primary/30 bg-primary/5">
                  <Paperclip className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-sm font-medium text-foreground flex-1 min-w-0 truncate">
                    {attachmentFile.name}
                  </span>
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {(attachmentFile.size / 1024 / 1024).toFixed(1)} MB
                  </span>
                  <button
                    type="button"
                    onClick={() => setAttachmentFile(null)}
                    disabled={isPending}
                    className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-rose-400 hover:bg-rose-400/10 transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <label
                  htmlFor="attachment-input"
                  className="flex items-center gap-3 px-4 py-3 rounded-lg border border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer group"
                >
                  <Paperclip className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                  <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                    Click to select a file (Image, PDF, or PPT/PPTX up to 5 MB)
                  </span>
                  <input
                    id="attachment-input"
                    name="attachment"
                    type="file"
                    accept="image/*,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.ms-powerpoint,.pptx,.ppt"
                    className="hidden"
                    disabled={isPending}
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      if (file && file.size > 5 * 1024 * 1024) {
                        setError('Attachment must be under 5 MB.');
                        e.target.value = '';
                        return;
                      }
                      setAttachmentFile(file);
                      setError(null);
                    }}
                  />
                </label>
              )}
            </div>
          )}

          {/* Make Public Checkbox */}
          <div className="flex items-center gap-2.5 py-1">
            <input
              id="is_public"
              name="is_public"
              type="checkbox"
              className="w-4.5 h-4.5 rounded border-border bg-background text-primary focus:ring-primary/20 accent-[#6366f1] cursor-pointer"
              disabled={isPending}
            />
            <label htmlFor="is_public" className="text-sm font-semibold text-foreground cursor-pointer select-none">
              Publish to Class
              {isCR && (
                <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                  (Automatically posts to Telegram channel)
                </span>
              )}
            </label>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Link
              href={notesPath}
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
                  Save Resource
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
