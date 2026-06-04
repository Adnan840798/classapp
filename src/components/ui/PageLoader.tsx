import { GraduationCap } from 'lucide-react';

/**
 * Full-page loading screen shown during route transitions.
 * Used as app/loading.tsx or (dashboard)/loading.tsx in Next.js.
 */
export function PageLoader() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background">
      <div
        className="flex items-center justify-center w-14 h-14 rounded-2xl animate-pulse"
        style={{ background: 'linear-gradient(135deg, hsl(220 91% 58%), hsl(260 80% 60%))' }}
      >
        <GraduationCap className="w-7 h-7 text-white" />
      </div>
      <div className="flex flex-col items-center gap-1.5">
        <span className="text-lg font-bold gradient-text">ClassApp</span>
        <span className="text-xs text-muted-foreground tracking-wide">Loading...</span>
      </div>
      {/* Animated progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-muted overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-transparent via-primary to-transparent"
          style={{ animation: 'slide-progress 1.5s ease-in-out infinite' }}
        />
      </div>
    </div>
  );
}

/**
 * Inline content loading indicator — use inside a page area, not full-screen.
 */
export function ContentLoader({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
      <div className="relative w-10 h-10">
        <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
        <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
      <span className="text-sm">{label}</span>
    </div>
  );
}
