'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Calendar, Edit2, ExternalLink, BookOpen, Plus } from 'lucide-react';
import { formatDateTime } from '@/lib/utils/formatters';
import { deleteNote } from '@/lib/actions/notes';
import { DeleteButton } from '@/components/ui/DeleteButton';
import { Note } from '@/types';

interface ResourcesListProps {
  initialNotes: Note[];
  currentUserId: string;
  notesPath: string; // '/student/notes' or '/cr/notes'
}

export function ResourcesList({ initialNotes, currentUserId, notesPath }: ResourcesListProps) {
  const [filter, setFilter] = useState<'all' | 'private' | 'public'>('all');

  const filteredNotes = initialNotes.filter((note) => {
    const isOwner = note.user_id === currentUserId;
    if (filter === 'private') {
      return isOwner && !note.is_public;
    }
    if (filter === 'public') {
      return note.is_public;
    }
    return true;
  });

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Filter Bar */}
      <div className="flex items-center gap-2 bg-accent/10 border border-border/40 p-1 rounded-xl self-start">
        {(['all', 'private', 'public'] as const).map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-4 py-1.5 rounded-lg text-[11px] font-bold transition-all uppercase tracking-wider cursor-pointer ${
              filter === type
                ? 'bg-[#6366f1] text-white shadow-[0_0_12px_rgba(99,102,241,0.3)]'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.03]'
            }`}
          >
            {type === 'all' ? 'All Resources' : type === 'private' ? 'Private' : 'Public'}
          </button>
        ))}
      </div>

      {filteredNotes.length === 0 ? (
        <div className="glass-card p-12 text-center flex flex-col items-center justify-center gap-3">
          <BookOpen className="w-12 h-12 text-muted-foreground opacity-30" />
          <h2 className="text-lg font-semibold">No resources found</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            No resources match the selected filter. Try changing filters or create a new resource.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredNotes.map((note) => {
            const isOwner = note.user_id === currentUserId;

            return (
              <div
                key={note.id}
                className="glass-card p-5 flex flex-col justify-between hover:scale-[1.01] transition-transform duration-200"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <h3 className="text-base font-bold text-foreground leading-snug">
                      {note.title}
                    </h3>
                    
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {/* Public/Private Badge beside Drive Link */}
                      {isOwner ? (
                        note.is_public ? (
                          <span className="text-[9px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded font-bold">
                            Public
                          </span>
                        ) : (
                          <span className="text-[9px] bg-slate-500/10 text-slate-400 border border-slate-500/20 px-2 py-0.5 rounded font-bold">
                            Private
                          </span>
                        )
                      ) : (
                        <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-bold">
                          Public
                        </span>
                      )}

                      {note.drive_link && (
                        <a
                          href={note.drive_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded font-bold hover:bg-emerald-500/20"
                          title="Open Google Drive Link"
                        >
                          Drive
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>

                  {note.content && (
                    <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed mb-4 line-clamp-4">
                      {note.content}
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      Updated {formatDateTime(note.updated_at)}
                    </span>
                    {!isOwner && (
                      <span className="text-[10px] text-slate-400 font-semibold">
                        Shared by {note.creator?.full_name || 'Classmate'}
                      </span>
                    )}
                  </div>
                  
                  {isOwner && (
                    <div className="flex items-center gap-1.5">
                      <Link
                        href={`${notesPath}/${note.id}`}
                        className="p-2 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                        title="Edit Resource"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Link>
                      <DeleteButton
                        id={note.id}
                        onDelete={deleteNote}
                        confirmMessage="Are you sure you want to delete this resource?"
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
