import { getCachedDeadlines } from '@/lib/cache/queries';
import { DeadlinesList } from '@/components/features/DeadlinesList';

export const revalidate = 0;

export default async function CRDeadlinesPage() {
  const deadlines = await getCachedDeadlines();

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full animate-fade-in">
      <DeadlinesList deadlines={(deadlines || []) as any} />
    </div>
  );
}
