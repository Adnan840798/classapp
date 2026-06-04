import { SkeletonDashboard } from '@/components/ui/Skeleton';

export default function DashboardLoading() {
  return (
    <div className="max-w-6xl mx-auto w-full p-4 lg:p-6">
      <div className="mb-6">
        <div className="shimmer h-7 w-40 rounded-lg mb-2" />
        <div className="shimmer h-4 w-56 rounded" />
      </div>
      <SkeletonDashboard />
    </div>
  );
}
