import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Plus, BookOpen, ExternalLink, Edit2, Calendar } from 'lucide-react';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { formatDateTime } from '@/lib/utils/formatters';
import { deleteNote } from '@/lib/actions/notes';
import { DeleteButton } from '@/components/ui/DeleteButton';

export const revalidate = 0; // force dynamic rendering

export default async function CRNotesPage() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: notes, error } = await supabase
    .from('notes')
    .select('*, creator:profiles!user_id(full_name)')
    .or(`user_id.eq.${user.id},is_public.eq.true`)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Failed to load resources:', error);
  }

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="page-header mb-0">
          <h1 className="page-title">Class Resources</h1>
          <p className="page-subtitle">Your private study notebook and class-shared external links.</p>
        </div>
        <Link href="/cr/notes/new" className="btn-primary self-start sm:self-auto">
          <Plus className="w-4 h-4" />
          Create Resource
        </Link>
      </div>

      {!notes || notes.length === 0 ? (
        <div className="glass-card p-12 text-center flex flex-col items-center justify-center gap-3">
          <BookOpen className="w-12 h-12 text-muted-foreground opacity-30 animate-pulse" />
          <h2 className="text-lg font-semibold">No resources yet</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            Create your first resource or link a Google Drive folder. You can also choose to share it class-wide.
          </p>
          <Link href="/cr/notes/new" className="btn-primary mt-2">
            <Plus className="w-4 h-4" />
            Create Resource
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {notes.map((note) => {
            const isOwner = note.user_id === user.id;

            return (
              <div
                key={note.id}
                className="glass-card p-5 flex flex-col justify-between hover:scale-[1.01] transition-transform duration-200"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex flex-col gap-1.5">
                      <h3 className="text-base font-bold text-foreground leading-snug">
                        {note.title}
                      </h3>
                      <div className="flex flex-wrap gap-1.5">
                        {isOwner ? (
                          note.is_public ? (
                            <span className="text-[9px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded font-bold">
                              Public (Owner)
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
                      </div>
                    </div>
                    {note.drive_link && (
                      <a
                        href={note.drive_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded font-bold hover:bg-emerald-500/20 flex-shrink-0"
                        title="Open Google Drive Link"
                      >
                        Drive
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
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
                        href={`/cr/notes/${note.id}`}
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
