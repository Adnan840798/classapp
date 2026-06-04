import { SkeletonTable } from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <div className="flex flex-col gap-4">
      <div className="shimmer h-7 w-24 rounded-lg mb-2" />
      <SkeletonTable rows={5} />
    </div>
  );
}
