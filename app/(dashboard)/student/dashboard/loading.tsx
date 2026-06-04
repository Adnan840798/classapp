import { SkeletonDashboard } from '@/components/ui/Skeleton';

export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="shimmer h-7 w-36 rounded-lg mb-2" />
      <SkeletonDashboard />
    </div>
  );
}
