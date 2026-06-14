import { Loader2 } from 'lucide-react';

/**
 * Full-page loading screen shown during route transitions.
 * Matches the CapacitorHandler native splash screen design exactly —
 * dark background, graduation cap icon on green gradient, ClassApp text.
 */
export function PageLoader() {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ background: '#080e0f' }}
    >
      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 60% 45% at 50% 50%, rgba(16,185,129,0.07) 0%, transparent 70%)' }}
      />

      <div className="relative flex flex-col items-center gap-5">
        {/* App icon — green rounded square with graduation cap */}
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-2xl"
          style={{
            background: 'linear-gradient(135deg, #065f46 0%, #10b981 100%)',
            boxShadow: '0 0 40px rgba(16,185,129,0.3)',
          }}
        >
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Graduation cap top */}
            <polygon points="24,10 6,20 24,30 42,20" fill="white" fillOpacity="0.95" />
            {/* Cap body */}
            <path d="M14 24.5V33C14 33 18 37 24 37C30 37 34 33 34 33V24.5L24 29.5L14 24.5Z" fill="white" fillOpacity="0.85" />
            {/* Tassel */}
            <line x1="42" y1="20" x2="42" y2="28" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
            <circle cx="42" cy="30" r="2" fill="white" fillOpacity="0.9" />
          </svg>
        </div>

        {/* App name */}
        <div
          className="text-3xl font-extrabold tracking-tight"
          style={{
            background: 'linear-gradient(135deg, #34d399, #6ee7b7)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          ClassApp
        </div>

        {/* Subtitle */}
        <div
          className="text-xs tracking-widest uppercase font-semibold animate-pulse"
          style={{ color: 'rgba(52,211,153,0.45)' }}
        >
          Loading...
        </div>
        <Loader2 className="h-5 w-5 animate-spin mt-1" style={{ color: '#10b981' }} />
      </div>

      {/* Bottom progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 overflow-hidden" style={{ background: 'rgba(16,185,129,0.1)' }}>
        <div
          className="h-full"
          style={{
            background: 'linear-gradient(90deg, transparent, #10b981, transparent)',
            animation: 'slide-progress 1.5s ease-in-out infinite',
          }}
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
