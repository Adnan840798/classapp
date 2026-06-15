'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  ExternalLink,
  Edit2,
  FileText,
  Globe,
  Lock,
} from 'lucide-react';
import { formatDateTime } from '@/lib/utils/formatters';
import { deleteNote } from '@/lib/actions/notes';
import { DeleteButton } from '@/components/ui/DeleteButton';
import { Note } from '@/types';

interface ResourcesListProps {
  initialNotes: Note[];
  currentUserId: string;
  notesPath: string;
}

export function ResourcesList({ initialNotes, currentUserId, notesPath }: ResourcesListProps) {
  const [filter, setFilter] = useState<'all' | 'private' | 'public'>('all');

  const filteredNotes = initialNotes.filter((note) => {
    const isOwner = note.user_id === currentUserId;
    if (filter === 'private') return isOwner && !note.is_public;
    if (filter === 'public') return note.is_public;
    return true;
  });

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Filter tabs */}
      <div className="flex items-center gap-2 self-start p-1 rounded-xl border border-white/[0.06] bg-white/[0.03] max-w-full overflow-x-auto scrollbar-none scroll-smooth-ios">
        {(['all', 'private', 'public'] as const).map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-4 py-1.5 rounded-lg text-[11px] font-bold transition-all uppercase tracking-wider cursor-pointer ${
              filter === type
                ? 'bg-primary text-primary-foreground shadow-[0_0_12px_rgba(52,211,153,0.35)]'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            {type === 'all' ? 'All Resources' : type === 'private' ? 'Private' : 'Public'}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {filteredNotes.length === 0 ? (
        <div className="glass-card p-12 text-center flex flex-col items-center justify-center gap-3">
          <BookOpen className="w-12 h-12 text-muted-foreground opacity-30" />
          <h2 className="text-lg font-semibold">No resources found</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            No resources match the selected filter. Try changing filters or create a new resource.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredNotes.map((note) => {
            const isOwner = note.user_id === currentUserId;
            const isPublic = note.is_public;

            return (
              <div
                key={note.id}
                className="relative rounded-xl overflow-hidden transition-all duration-150 hover:translate-x-0.5"
                style={{
                  background: isPublic
                    ? 'linear-gradient(90deg, rgba(52,211,153,0.08) 0%, rgba(26,29,36,0.65) 100%)'
                    : 'linear-gradient(90deg, rgba(148,163,184,0.04) 0%, rgba(26,29,36,0.45) 100%)',
                  border: isPublic
                    ? '1px solid rgba(52,211,153,0.25)'
                    : '1px solid rgba(148,163,184,0.13)',
                }}
              >
                {/* Left accent bar */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-1"
                  style={{
                    background: isPublic
                      ? 'linear-gradient(180deg, #34D399, #059669)'
                      : 'linear-gradient(180deg, #475569, #1e293b)',
                  }}
                />

                <div className="pl-5 pr-4 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">

                  {/* ── Left section: icon + title + body ── */}
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {/* Icon badge */}
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{
                        background: isPublic ? 'rgba(52,211,153,0.12)' : 'rgba(148,163,184,0.08)',
                        border: isPublic
                          ? '1px solid rgba(52,211,153,0.25)'
                          : '1px solid rgba(148,163,184,0.15)',
                      }}
                    >
                      <FileText className={`w-4 h-4 ${isPublic ? 'text-emerald-400' : 'text-slate-400'}`} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-extrabold text-white break-words leading-snug">
                        {note.title}
                      </h3>
                      {note.content && (
                        <p className="text-xs text-slate-400 whitespace-pre-line leading-relaxed break-words line-clamp-3 mt-1">
                          {note.content}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* ── Right section: meta + drive + edit/delete ── */}
                  <div className="flex items-center justify-between sm:justify-end gap-4 flex-shrink-0 w-full sm:w-auto mt-2.5 sm:mt-0 pt-2.5 sm:pt-0 border-t border-white/[0.04] sm:border-0">

                    {/* Metadata: badge + timestamp */}
                    <div className="text-left sm:text-right flex flex-col items-start sm:items-end gap-1 min-w-[80px]">
                      {isOwner ? (
                        note.is_pending ? (
                          <span className="inline-flex items-center gap-1 text-[7px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            Pending Approval
                          </span>
                        ) : isPublic ? (
                          <span className="inline-flex items-center gap-1 text-[7px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                            <Globe className="w-2.5 h-2.5" />
                            Public
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[7px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-500/10 border border-slate-500/20 text-slate-400">
                            <Lock className="w-2.5 h-2.5" />
                            Private
                          </span>
                        )
                      ) : (
                        <span className="text-[10px] text-slate-400 font-bold">
                          {note.creator?.full_name || 'Classmate'}
                        </span>
                      )}
                      <p className="text-[9px] text-slate-500 font-medium">
                        {formatDateTime(note.updated_at)}
                      </p>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2">
                      {/* Drive link — always shown when present */}
                      {note.drive_link && (
                        <a
                          href={note.drive_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Open Google Drive"
                          className="flex items-center justify-center p-2.5 sm:px-3 sm:py-1.5 rounded-lg text-[11px] font-bold text-sky-400 border border-sky-400/25 bg-sky-400/8 hover:bg-sky-400/15 transition-all cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span className="ml-1">View</span>
                        </a>
                      )}

                      {/* Edit + Delete — owner only */}
                      {isOwner && (
                        <>
                          <Link
                            href={`${notesPath}/${note.id}`}
                            title="Edit Resource"
                            className="flex items-center justify-center p-2.5 sm:px-3 sm:py-1.5 rounded-lg text-[11px] font-bold text-indigo-400 border border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-500/10 transition-all"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline ml-1">Edit</span>
                          </Link>
                          <DeleteButton
                            id={note.id}
                            onDelete={deleteNote}
                            confirmMessage="Are you sure you want to delete this resource?"
                          />
                        </>
                      )}
                    </div>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
