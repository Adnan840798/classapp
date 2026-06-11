import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Plus } from 'lucide-react';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { ResourcesList } from '@/components/features/ResourcesList';
import { PendingResourceCard } from '@/components/features/PendingResourceCard';

export const revalidate = 0; // force dynamic rendering

export default async function CRNotesPage() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Fetch pending notes
  const { data: pendingNotes } = await supabase
    .from('notes')
    .select('*, creator:profiles!user_id(full_name)')
    .eq('is_pending', true)
    .order('created_at', { ascending: false });

  // Fetch main notes (own notes + public approved notes)
  const { data: notes, error } = await supabase
    .from('notes')
    .select('*, creator:profiles!user_id(full_name)')
    .or(`user_id.eq.${user.id},is_public.eq.true`)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Failed to load resources:', error);
  }

  return (
    <div className="flex flex-col gap-8 max-w-6xl mx-auto w-full animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="page-header mb-0">
          <h1 className="page-title">Class Resources</h1>
          <p className="page-subtitle">Your private study notebook and class-shared external links.</p>
        </div>
        <Link href="/cr/notes/new" className="btn-yellow self-start sm:self-auto">
          <Plus className="w-4 h-4" />
          Create Resource
        </Link>
      </div>

      {/* Pending Resources Queue */}
      {pendingNotes && pendingNotes.length > 0 && (
        <div className="flex flex-col gap-4 bg-amber-500/[0.02] border border-amber-500/10 p-6 rounded-2xl">
          <h2 className="text-sm font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            Pending Approval ({pendingNotes.length})
          </h2>
          <div className="flex flex-col gap-4">
            {pendingNotes.map((note) => (
              <PendingResourceCard key={note.id} note={note as any} />
            ))}
          </div>
        </div>
      )}

      {/* Main Resource List */}
      <ResourcesList
        initialNotes={(notes || []) as any}
        currentUserId={user.id}
        notesPath="/cr/notes"
      />
    </div>
  );
}
