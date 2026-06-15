// Full-page loading screen shown during route transitions.
// Typography-based branding: class in white, app in green shade.
export function PageLoader() {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ background: '#080e0f' }}
    >
      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 60% 45% at 50% 50%, rgba(52,211,153,0.07) 0%, transparent 70%)' }}
      />

      <div className="relative flex flex-col items-center gap-4">
        {/* App name - white and green shade */}
        <div className="text-4xl font-black tracking-tight text-white select-none">
          Class<span className="text-[#34D399] drop-shadow-[0_0_12px_rgba(52,211,153,0.35)]">App</span>
        </div>

        {/* Circular professional spinner */}
        <div className="relative w-8 h-8 mt-2">
          <div className="absolute inset-0 rounded-full border-[3px] border-emerald-500/10" />
          <div className="absolute inset-0 rounded-full border-[3px] border-[#34D399] border-t-transparent animate-spin" />
        </div>

        {/* Subtitle */}
        <div
          className="text-[10px] tracking-[0.25em] uppercase font-bold mt-1"
          style={{ color: 'rgba(52,211,153,0.45)' }}
        >
          Loading
        </div>
      </div>

      {/* Bottom progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 overflow-hidden" style={{ background: 'rgba(52,211,153,0.05)' }}>
        <div
          className="h-full"
          style={{
            background: 'linear-gradient(90deg, transparent, #34D399, transparent)',
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
