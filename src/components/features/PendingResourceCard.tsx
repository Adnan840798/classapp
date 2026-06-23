'use client';

import { useState, useTransition } from 'react';
import { Check, Trash2, ExternalLink, FileText, Calendar, User } from 'lucide-react';
import { Note } from '@/types';
import { approveNote, deleteNote } from '@/lib/actions/notes';
import { timeAgo } from '@/lib/utils/formatters';

interface PendingResourceCardProps {
  note: Note;
}

export function PendingResourceCard({ note }: PendingResourceCardProps) {
  const [isPending, startTransition] = useTransition();
  const [isRejecting, setIsRejecting] = useState(false);

  const handleApprove = () => {
    startTransition(async () => {
      const res = await approveNote(note.id);
      if (res.error) {
        alert('Approval Failed: ' + res.error);
      } else {
        alert('Resource Approved: "' + note.title + '" is now visible to all students.');
      }
    });
  };

  const handleReject = () => {
    if (!window.confirm('Are you sure you want to reject and delete this resource?')) return;
    setIsRejecting(true);
    startTransition(async () => {
      const res = await deleteNote(note.id);
      setIsRejecting(false);
      if (res.error) {
        alert('Rejection Failed: ' + res.error);
      } else {
        alert('Resource Rejected: The resource has been deleted.');
      }
    });
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card/50 backdrop-blur-md p-5 transition-all duration-300 hover:border-primary/30 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_8px_30px_rgba(0,0,0,0.3)] flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
      <div className="flex-1 min-w-0 flex gap-4">
        <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
          <FileText className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-amber-500/10 border border-amber-500/25 text-zinc-800 dark:text-amber-400">
              Pending Review
            </span>
          </div>
          <h3 className="text-base font-semibold text-foreground mt-1 break-words line-clamp-2 leading-snug">
            {note.title}
          </h3>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground font-medium">
            <span className="flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-muted-foreground/80" />
              {note.creator?.full_name || 'Anonymous Student'}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground/80" />
              {timeAgo(note.created_at)}
            </span>
          </div>
          {note.content && (
            <p className="text-xs text-muted-foreground mt-3 line-clamp-2 leading-relaxed bg-muted/20 p-2.5 rounded-lg border border-border">
              {note.content}
            </p>
          )}
          {note.drive_link && (
            <a
              href={note.drive_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-sky-600 dark:text-sky-400 hover:text-sky-500 dark:hover:text-sky-300 mt-3 font-semibold transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              View Drive Document
            </a>
          )}
        </div>
      </div>
      
      {/* Actions */}
      <div className="flex items-center gap-2.5 w-full md:w-auto justify-end shrink-0 border-t border-border md:border-t-0 pt-3 md:pt-0">
        <button
          onClick={handleReject}
          disabled={isPending || isRejecting}
          className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/15 text-rose-600 dark:text-rose-400 disabled:opacity-50 disabled:pointer-events-none transition-all duration-200 cursor-pointer"
        >
          {isRejecting ? 'Rejecting...' : (
            <>
              <Trash2 className="w-4 h-4" />
              Reject
            </>
          )}
        </button>
        <button
          onClick={handleApprove}
          disabled={isPending || isRejecting}
          className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border border-primary/20 bg-primary/10 hover:bg-primary/15 text-primary disabled:opacity-50 disabled:pointer-events-none transition-all duration-200 cursor-pointer"
        >
          {isPending && !isRejecting ? 'Approving...' : (
            <>
              <Check className="w-4 h-4" />
              Approve
            </>
          )}
        </button>
      </div>
    </div>
  );
}
