/**
 * Skeleton — reusable shimmer placeholder for loading states.
 * Usage: <Skeleton className="h-4 w-32" />
 */
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`shimmer rounded-lg ${className}`}
      aria-hidden="true"
    />
  );
}

/** Pre-built skeletons for common layout patterns */
export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="glass-card p-5 flex flex-col gap-3">
      <Skeleton className="h-4 w-1/2" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={`h-3 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`} />
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="glass-card overflow-hidden">
      <div className="p-4 border-b border-border">
        <Skeleton className="h-4 w-1/4" />
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4">
            <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
            <div className="flex-1 flex flex-col gap-2">
              <Skeleton className="h-3 w-1/3" />
              <Skeleton className="h-2.5 w-1/2" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      {/* Stat cards row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="stat-card">
            <Skeleton className="h-8 w-8 rounded-lg mb-2" />
            <Skeleton className="h-6 w-14" />
            <Skeleton className="h-3 w-20 mt-1" />
          </div>
        ))}
      </div>
      {/* Two column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SkeletonCard lines={4} />
        <SkeletonCard lines={4} />
      </div>
    </div>
  );
}
