import { SkeletonCard } from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <div className="flex flex-col gap-4">
      <div className="shimmer h-7 w-32 rounded-lg mb-2" />
      {Array.from({ length: 5 }).map((_, i) => (
        <SkeletonCard key={i} lines={3} />
      ))}
    </div>
  );
}
