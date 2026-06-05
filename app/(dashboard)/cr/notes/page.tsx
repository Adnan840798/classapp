import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Plus } from 'lucide-react';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { ResourcesList } from '@/components/features/ResourcesList';

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

      <ResourcesList
        initialNotes={(notes || []) as any}
        currentUserId={user.id}
        notesPath="/cr/notes"
      />
    </div>
  );
}
