import { getCachedResults } from '@/lib/cache/queries';
import { getAuthUser } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ResultsList } from '@/components/features/ResultsList';

export const revalidate = 0;

export default async function CRResultsPage() {
  const { user } = await getAuthUser();
  if (!user) redirect('/login');

  const results = await getCachedResults();

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full animate-fade-in">
      <ResultsList results={(results || []) as any} />
    </div>
  );
}
