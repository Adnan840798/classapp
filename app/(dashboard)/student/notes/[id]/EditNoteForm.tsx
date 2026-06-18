'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Send, Loader2, AlertCircle, Link as LinkIcon } from 'lucide-react';
import { updateNote } from '@/lib/actions/notes';

function isRedirectError(err: any): boolean {
  return (
    err &&
    (err.message === 'NEXT_REDIRECT' ||
      err.message?.includes('NEXT_REDIRECT') ||
      err.digest?.startsWith('NEXT_REDIRECT'))
  );
}
import { Note } from '@/types';

interface EditNoteFormProps {
  note: Note;
}

export function EditNoteForm({ note }: EditNoteFormProps) {
  const pathname = usePathname();
  const isCR = pathname.startsWith('/cr');
  const notesPath = isCR ? '/cr/notes' : '/student/notes';

  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    
    try {
      const res = await updateNote(note.id, formData);
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
          defaultValue={note.title}
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
            defaultValue={note.drive_link || ''}
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
          defaultValue={note.content || ''}
          placeholder="Write resource description, study outlines, or reminders here..."
          maxLength={10000}
          className="form-input resize-none"
          disabled={isPending}
        />
      </div>

      {/* Make Public Checkbox */}
      <div className="flex items-center gap-2.5 py-1">
        <input
          id="is_public"
          name="is_public"
          type="checkbox"
          defaultChecked={note.is_public}
          className="w-4.5 h-4.5 rounded border-border bg-background text-primary focus:ring-primary/20 accent-[#6366f1] cursor-pointer"
          disabled={isPending}
        />
        <label htmlFor="is_public" className="text-sm font-semibold text-foreground cursor-pointer select-none">
          Share with Class (Make Public)
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
              Save Changes
            </>
          )}
        </button>
      </div>
    </form>
  );
}
