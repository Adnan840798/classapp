import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { EditNoteForm } from './EditNoteForm';

interface EditNotePageProps {
  params: Promise<{ id: string }>;
}

export const revalidate = 0; // force dynamic rendering

export default async function EditNotePage({ params }: EditNotePageProps) {
  const { id } = await params;
  const supabase = await getSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Fetch note and make sure it belongs to the logged-in student
  const { data: note, error } = await supabase
    .from('notes')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error || !note) {
    notFound();
  }

  return (
    <div className="max-w-2xl mx-auto w-full flex flex-col gap-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Link
          href="/student/notes"
          className="flex items-center justify-center w-9 h-9 rounded-lg border border-border bg-background hover:bg-accent text-muted-foreground hover:text-foreground transition-all duration-200"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="page-header mb-0">
          <h1 className="page-title">Edit Note</h1>
          <p className="page-subtitle">Update your personal study note details</p>
        </div>
      </div>

      <div className="glass-card p-6 md:p-8">
        <EditNoteForm note={note} />
      </div>
    </div>
  );
}
