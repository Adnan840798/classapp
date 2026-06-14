'use client';

import { useState, useRef, useEffect } from 'react';
import { useNotifications } from '@/lib/hooks/useNotifications';
import { useProfile } from '@/context/ProfileContext';
import { Megaphone, Clock, Trophy, Bell, MessageCircle, BookMarked, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const AUTO_DISMISS_MS = 30_000; // 30 seconds

interface NotifTypeConfig {
  icon: React.ComponentType<{ className?: string }>;
  bg: string;
}

const notifTypeIcon: Record<string, NotifTypeConfig> = {
  announcement:     { icon: Megaphone,     bg: 'bg-rose-500/10 border-rose-500/20 text-rose-400' },
  deadline:         { icon: Clock,         bg: 'bg-amber-500/10 border-amber-500/20 text-amber-400' },
  result:           { icon: Trophy,        bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' },
  system:           { icon: Bell,          bg: 'bg-slate-500/10 border-slate-500/20 text-slate-400' },
  qna:              { icon: MessageCircle, bg: 'bg-sky-500/10 border-sky-500/20 text-sky-400' },
  qna_announcement: { icon: MessageCircle, bg: 'bg-sky-500/10 border-sky-500/20 text-sky-400' },
  qna_deadline:     { icon: MessageCircle, bg: 'bg-sky-500/10 border-sky-500/20 text-sky-400' },
  qna_event:        { icon: MessageCircle, bg: 'bg-sky-500/10 border-sky-500/20 text-sky-400' },
  resource_pending: { icon: BookMarked,    bg: 'bg-amber-500/10 border-amber-500/20 text-amber-400' },
};

function getNotifHref(type: string, refId: string | null, prefix: string): string {
  switch (type) {
    case 'announcement':     return refId ? `${prefix}/announcements/${refId}` : `${prefix}/announcements`;
    case 'deadline':         return refId ? `${prefix}/deadlines/${refId}` : `${prefix}/deadlines`;
    case 'result':           return `${prefix}/results`;
    case 'qna':              return `${prefix}/timeline`;
    case 'qna_announcement': return refId ? `${prefix}/announcements/${refId}` : `${prefix}/announcements`;
    case 'qna_deadline':     return refId ? `${prefix}/deadlines/${refId}` : `${prefix}/deadlines`;
    case 'qna_event':        return refId ? `${prefix}/calendar/${refId}` : `${prefix}/calendar`;
    case 'resource_pending': return `${prefix}/notes`;
    default:                 return `${prefix}/timeline`;
  }
}

function InAppPopupCard({ popup, onDismiss }: { popup: any; onDismiss: () => void }) {
  const { profile } = useProfile();
  const prefix = profile?.role === 'cr' || profile?.role === 'admin' ? '/cr' : '/student';
  const href = getNotifHref(popup.type, popup.reference_id, prefix);

  const typeConfig = notifTypeIcon[popup.type] || notifTypeIcon.system;
  const IconComponent = typeConfig.icon;

  // Gesture states
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);

  // Progress 0 → 1 over 30 seconds (drives the countdown bar)
  const [progress, setProgress] = useState(0);

  const dragStart = useRef({ x: 0, y: 0 });
  const dragTime = useRef(0);
  // True while the user is holding/touching the card → timer pauses
  const isPaused = useRef(false);

  // ── 30-second auto-dismiss via requestAnimationFrame ──────────────
  useEffect(() => {
    const startTime = Date.now();
    let accumulatedPause = 0;
    let pauseStart = 0;
    let rafId: number;

    const tick = () => {
      if (isPaused.current) {
        // Start counting pause duration once we enter paused state
        if (pauseStart === 0) pauseStart = Date.now();
        rafId = requestAnimationFrame(tick);
        return;
      }

      // User released — add the paused duration so it doesn't count down
      if (pauseStart > 0) {
        accumulatedPause += Date.now() - pauseStart;
        pauseStart = 0;
      }

      const elapsed = Date.now() - startTime - accumulatedPause;
      const ratio = Math.min(elapsed / AUTO_DISMISS_MS, 1);
      setProgress(ratio);

      if (ratio >= 1) {
        // Slide up and fade out
        setIsDismissing(true);
        setOffsetY(-160);
        setTimeout(() => onDismiss(), 240);
        return;
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Drag / swipe helpers ──────────────────────────────────────────
  const handleStart = (clientX: number, clientY: number) => {
    isPaused.current = true; // Pause countdown while finger is down
    setIsDragging(true);
    dragStart.current = { x: clientX, y: clientY };
    dragTime.current = Date.now();
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (!isDragging) return;
    const dx = clientX - dragStart.current.x;
    const dy = clientY - dragStart.current.y;
    setOffsetX(dx);
    // Allow swipe-up freely; rubber-band downward
    setOffsetY(dy < 0 ? dy : dy * 0.2);
  };

  const handleEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    isPaused.current = false; // Resume countdown

    const duration = Date.now() - dragTime.current;
    const distanceX = Math.abs(offsetX);
    const distanceY = offsetY;
    const velocityX = distanceX / Math.max(duration, 1);
    const velocityY = Math.abs(distanceY) / Math.max(duration, 1);

    // Detect tap (tiny movement, short duration)
    const isClick =
      distanceX < 8 && Math.abs(distanceY) < 8 && duration < 220;

    if (isClick) {
      setIsDismissing(true);
      setTimeout(() => {
        window.location.href = href;
        onDismiss();
      }, 100);
      return;
    }

    const DIST = 80;
    const VEL = 0.35;

    if (
      offsetX > DIST || (offsetX > 0 && velocityX > VEL) ||
      offsetX < -DIST || (offsetX < 0 && velocityX > VEL) ||
      offsetY < -DIST || (distanceY < 0 && velocityY > VEL)
    ) {
      setIsDismissing(true);
      if (offsetY < -DIST || (distanceY < 0 && velocityY > VEL)) {
        setOffsetY(-180);
      } else {
        setOffsetX(offsetX > 0 ? 450 : -450);
      }
      setTimeout(() => onDismiss(), 200);
    } else {
      setOffsetX(0);
      setOffsetY(0);
    }
  };

  // Touch handlers
  const onTouchStart = (e: React.TouchEvent) =>
    handleStart(e.touches[0].clientX, e.touches[0].clientY);
  const onTouchMove = (e: React.TouchEvent) =>
    handleMove(e.touches[0].clientX, e.touches[0].clientY);

  // Mouse handlers (desktop / dev)
  const onMouseDown = (e: React.MouseEvent) =>
    handleStart(e.clientX, e.clientY);
  const onMouseMove = (e: React.MouseEvent) =>
    handleMove(e.clientX, e.clientY);

  // Release mouse anywhere on the page
  useEffect(() => {
    const up = () => { if (isDragging) handleEnd(); };
    window.addEventListener('mouseup', up);
    return () => window.removeEventListener('mouseup', up);
  }, [isDragging, offsetX, offsetY]);

  // Countdown bar shrinks from 100 % → 0 % as timer runs
  const barWidth = `${(1 - progress) * 100}%`;

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={handleEnd}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      className={cn(
        'w-full rounded-2xl select-none relative pointer-events-auto border border-emerald-500/20 overflow-hidden cursor-grab active:cursor-grabbing',
        isDragging ? 'transition-none' : 'transition-all duration-300 ease-out',
        isDismissing && 'opacity-0 scale-95'
      )}
      style={{
        background: 'linear-gradient(180deg, #1A1D24 0%, #0E0F11 100%)',
        boxShadow:
          '0 10px 30px rgba(0,0,0,0.65), 0 0 25px -5px rgba(52,211,153,0.12)',
        transform: `translate3d(${offsetX}px, ${offsetY}px, 0)`,
        touchAction: 'none',
        willChange: 'transform, opacity',
        animation: 'popup-slide-down 0.38s cubic-bezier(0.16, 1, 0.3, 1) both',
      }}
    >
      {/* Card body */}
      <div className="p-4 flex gap-3.5 pr-10 items-start">
        {/* Type icon */}
        <div
          className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center border flex-shrink-0',
            typeConfig.bg
          )}
        >
          <IconComponent className="w-5 h-5" />
        </div>

        {/* Text */}
        <div className="min-w-0 flex-1">
          <p className="font-bold text-emerald-400 uppercase tracking-wider text-[9px] mb-0.5">
            {popup.type.replace(/_/g, ' ')}
          </p>
          <h4 className="text-sm font-bold leading-snug text-white truncate">
            {popup.title}
          </h4>
          <p className="text-xs text-slate-400 mt-1 leading-normal line-clamp-2">
            {popup.message}
          </p>
        </div>

        {/* ✕ dismiss button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsDismissing(true);
            setTimeout(() => onDismiss(), 180);
          }}
          className="absolute right-2.5 top-2.5 w-8 h-8 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800/60 flex items-center justify-center transition-colors cursor-pointer"
          aria-label="Dismiss notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Auto-dismiss countdown progress bar (emerald → shrinks to nothing) */}
      <div className="w-full h-[3px] bg-slate-800/40">
        <div
          className="h-full bg-emerald-500/70"
          style={{
            width: barWidth,
            transition: isDragging ? 'none' : 'width 0.25s linear',
          }}
        />
      </div>

      <style>{`
        @keyframes popup-slide-down {
          from { opacity: 0; transform: translate3d(0, -40px, 0) scale(0.96); }
          to   { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
        }
      `}</style>
    </div>
  );
}

export function InAppNotificationStack() {
  const { activePopups, dismissPopup } = useNotifications();

  if (!activePopups || activePopups.length === 0) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[99999] flex flex-col gap-3 w-full max-w-sm px-4 pointer-events-none">
      {activePopups.map((popup) => (
        <InAppPopupCard
          key={popup.id}
          popup={popup}
          onDismiss={() => dismissPopup(popup.id)}
        />
      ))}
    </div>
  );
}
