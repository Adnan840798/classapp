'use client';

import { useState, useRef, useEffect } from 'react';
import { useNotifications } from '@/lib/hooks/useNotifications';
import { useProfile } from '@/context/ProfileContext';
import { Megaphone, Clock, Trophy, Bell, MessageCircle, BookMarked, X, ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

const AUTO_DISMISS_MS = 30_000; // 30 seconds

interface NotifTypeConfig {
  icon: React.ComponentType<{ className?: string }>;
  bg: string;
  borderColor: string;
  glowShadow: string;
  textClass: string;
  progressBarClass: string;
}

const notifTypeIcon: Record<string, NotifTypeConfig> = {
  announcement: {
    icon: Megaphone,
    bg: 'bg-brand-purple/15 border-brand-purple/30 text-brand-purple',
    borderColor: 'border-brand-purple/40',
    glowShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 30px -4px rgba(139,92,246,0.35)',
    textClass: 'text-purple-300',
    progressBarClass: 'bg-purple-400/80',
  },
  deadline: {
    icon: Clock,
    bg: 'bg-amber-500/15 border-amber-500/30 text-amber-400',
    borderColor: 'border-amber-500/40',
    glowShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 30px -4px rgba(245,158,11,0.35)',
    textClass: 'text-amber-300',
    progressBarClass: 'bg-amber-400/80',
  },
  result: {
    icon: Trophy,
    bg: 'bg-brand-cyan/15 border-brand-cyan/30 text-brand-cyan',
    borderColor: 'border-sky-400/40',
    glowShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 30px -4px rgba(56,189,248,0.35)',
    textClass: 'text-sky-300',
    progressBarClass: 'bg-sky-400/80',
  },
  system: {
    icon: Bell,
    bg: 'bg-slate-500/15 border-slate-500/30 text-slate-400',
    borderColor: 'border-slate-500/40',
    glowShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 30px -4px rgba(100,116,139,0.3)',
    textClass: 'text-slate-300',
    progressBarClass: 'bg-slate-400/80',
  },
  qna: {
    icon: MessageCircle,
    bg: 'bg-sky-500/15 border-sky-500/30 text-sky-400',
    borderColor: 'border-sky-400/40',
    glowShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 30px -4px rgba(14,165,233,0.35)',
    textClass: 'text-sky-300',
    progressBarClass: 'bg-sky-400/80',
  },
  qna_announcement: {
    icon: MessageCircle,
    bg: 'bg-sky-500/15 border-sky-500/30 text-sky-400',
    borderColor: 'border-sky-400/40',
    glowShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 30px -4px rgba(14,165,233,0.35)',
    textClass: 'text-sky-300',
    progressBarClass: 'bg-sky-400/80',
  },
  qna_deadline: {
    icon: MessageCircle,
    bg: 'bg-sky-500/15 border-sky-500/30 text-sky-400',
    borderColor: 'border-sky-400/40',
    glowShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 30px -4px rgba(14,165,233,0.35)',
    textClass: 'text-sky-300',
    progressBarClass: 'bg-sky-400/80',
  },
  qna_event: {
    icon: MessageCircle,
    bg: 'bg-sky-500/15 border-sky-500/30 text-sky-400',
    borderColor: 'border-sky-400/40',
    glowShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 30px -4px rgba(14,165,233,0.35)',
    textClass: 'text-sky-300',
    progressBarClass: 'bg-sky-400/80',
  },
  resource_pending: {
    icon: BookMarked,
    bg: 'bg-amber-500/15 border-amber-500/30 text-amber-400',
    borderColor: 'border-amber-500/40',
    glowShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 30px -4px rgba(245,158,11,0.35)',
    textClass: 'text-amber-300',
    progressBarClass: 'bg-amber-400/80',
  },
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

// ── Clamp helper ─────────────────────────────────────────────────────────────
const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

// ── Thresholds ─────────────────────────────────────────────────────────────────
const DISMISS_DIST = 90;   // px needed to trigger dismiss
const DISMISS_VEL  = 0.40; // px/ms velocity threshold
const MAX_ROTATE   = 12;   // max card tilt in degrees while dragging

function InAppPopupCard({ popup, onDismiss }: { popup: any; onDismiss: () => void }) {
  const { profile } = useProfile();
  const prefix = profile?.role === 'cr' || profile?.role === 'admin' ? '/cr' : '/student';
  const href = getNotifHref(popup.type, popup.reference_id, prefix);

  const typeConfig = notifTypeIcon[popup.type] || notifTypeIcon.system;
  const IconComponent = typeConfig.icon;

  // ── Gesture state ────────────────────────────────────────────────────────
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  // 'idle' | 'exiting-right' | 'exiting-left' | 'exiting-up' | 'exiting-x'
  const [exitDir, setExitDir] = useState<'idle' | 'right' | 'left' | 'up' | 'x'>('idle');

  // Progress 0 → 1 over 30 seconds (drives the countdown bar)
  const [progress, setProgress] = useState(0);

  const dragStart = useRef({ x: 0, y: 0 });
  const dragTime  = useRef(0);
  const isPaused  = useRef(false);

  // Derive opacity and rotation from drag position (live during drag)
  const dragDist    = Math.sqrt(offsetX * offsetX + offsetY * offsetY);
  const dragOpacity = isDragging ? clamp(1 - dragDist / 220, 0.3, 1) : 1;
  const dragRotate  = isDragging ? clamp((offsetX / 280) * MAX_ROTATE, -MAX_ROTATE, MAX_ROTATE) : 0;

  // What direction hint to show while dragging
  const showHintRight = isDragging && offsetX > 20;
  const showHintLeft  = isDragging && offsetX < -20;
  const showHintUp    = isDragging && offsetY < -20 && Math.abs(offsetX) < 40;

  // ── 30-second auto-dismiss ───────────────────────────────────────────────
  useEffect(() => {
    const startTime = Date.now();
    let accumulatedPause = 0;
    let pauseStart = 0;
    let rafId: number;

    const tick = () => {
      if (isPaused.current) {
        if (pauseStart === 0) pauseStart = Date.now();
        rafId = requestAnimationFrame(tick);
        return;
      }

      if (pauseStart > 0) {
        accumulatedPause += Date.now() - pauseStart;
        pauseStart = 0;
      }

      const elapsed = Date.now() - startTime - accumulatedPause;
      const ratio = Math.min(elapsed / AUTO_DISMISS_MS, 1);
      setProgress(ratio);

      if (ratio >= 1) {
        triggerExit('up');
        return;
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Exit animation helper ────────────────────────────────────────────────
  function triggerExit(dir: 'right' | 'left' | 'up' | 'x') {
    setExitDir(dir);
    setTimeout(() => onDismiss(), 320);
  }

  // ── Drag helpers ─────────────────────────────────────────────────────────
  const handleStart = (clientX: number, clientY: number) => {
    isPaused.current = true;
    setIsDragging(true);
    dragStart.current = { x: clientX, y: clientY };
    dragTime.current  = Date.now();
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (!isDragging) return;
    const dx = clientX - dragStart.current.x;
    const dy = clientY - dragStart.current.y;
    setOffsetX(dx);
    // Swipe-up freely; rubber-band if pulled down
    setOffsetY(dy < 0 ? dy : dy * 0.18);
  };

  const handleEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    isPaused.current = false;

    const duration  = Math.max(Date.now() - dragTime.current, 1);
    const absX      = Math.abs(offsetX);
    const velX      = absX / duration;
    const velY      = Math.abs(offsetY) / duration;

    // Tap: very small movement and short time
    const isClick = absX < 8 && Math.abs(offsetY) < 8 && duration < 220;
    if (isClick) {
      setExitDir('x');
      setTimeout(() => { window.location.href = href; onDismiss(); }, 120);
      return;
    }

    // Swipe right
    if (offsetX > DISMISS_DIST || (offsetX > 30 && velX > DISMISS_VEL)) {
      setOffsetX(460);
      triggerExit('right');
      return;
    }
    // Swipe left
    if (offsetX < -DISMISS_DIST || (offsetX < -30 && velX > DISMISS_VEL)) {
      setOffsetX(-460);
      triggerExit('left');
      return;
    }
    // Swipe up
    if (offsetY < -DISMISS_DIST || (offsetY < -30 && velY > DISMISS_VEL)) {
      setOffsetY(-220);
      triggerExit('up');
      return;
    }

    // Not enough — snap back with spring feel
    setOffsetX(0);
    setOffsetY(0);
  };

  // Touch events
  const onTouchStart = (e: React.TouchEvent) =>
    handleStart(e.touches[0].clientX, e.touches[0].clientY);
  const onTouchMove  = (e: React.TouchEvent) =>
    handleMove(e.touches[0].clientX, e.touches[0].clientY);

  // Mouse events (desktop)
  const onMouseDown = (e: React.MouseEvent) => handleStart(e.clientX, e.clientY);
  const onMouseMove = (e: React.MouseEvent) => handleMove(e.clientX, e.clientY);

  useEffect(() => {
    const up = () => { if (isDragging) handleEnd(); };
    window.addEventListener('mouseup', up);
    return () => window.removeEventListener('mouseup', up);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDragging, offsetX, offsetY]);

  // ── Exit transform (overrides live drag once we commit to an exit) ────────
  const isExiting = exitDir !== 'idle';
  let exitTranslateX = offsetX;
  let exitTranslateY = offsetY;
  let exitOpacity    = dragOpacity;
  let exitRotate     = dragRotate;

  if (isExiting) {
    if (exitDir === 'right') { exitTranslateX = 520; exitRotate = 15; exitOpacity = 0; }
    if (exitDir === 'left')  { exitTranslateX = -520; exitRotate = -15; exitOpacity = 0; }
    if (exitDir === 'up')    { exitTranslateY = -200; exitOpacity = 0; exitRotate = 0; }
    if (exitDir === 'x')     { exitOpacity = 0; }
  }

  const barWidth = `${(1 - progress) * 100}%`;

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={handleEnd}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      className={cn(
        'w-full rounded-2xl select-none relative pointer-events-auto border overflow-hidden cursor-grab active:cursor-grabbing',
        typeConfig.borderColor,
      )}
      style={{
        background: 'rgba(30, 34, 44, 0.92)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        boxShadow: typeConfig.glowShadow,
        transform: `translate3d(${exitTranslateX}px, ${exitTranslateY}px, 0) rotate(${exitRotate}deg)`,
        opacity: exitOpacity,
        // During drag: no transition so it tracks finger immediately.
        // When snapping back or exiting: smooth spring/ease.
        transition: isDragging
          ? 'none'
          : isExiting
          ? 'transform 0.30s cubic-bezier(0.4, 0, 0.8, 0.2), opacity 0.28s ease'
          : 'transform 0.36s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s ease',
        touchAction: 'none',
        willChange: 'transform, opacity',
        animation: isExiting ? 'none' : 'popup-slide-down 0.38s cubic-bezier(0.16, 1, 0.3, 1) both',
      }}
    >
      {/* ── Directional swipe hint overlays ─────────────────────────── */}
      {/* Right swipe hint */}
      <div
        className="absolute inset-0 flex items-center justify-end pr-5 pointer-events-none z-10 rounded-2xl"
        style={{
          background: 'linear-gradient(to left, rgba(52,211,153,0.25), transparent)',
          opacity: showHintRight ? clamp((offsetX - 20) / 60, 0, 1) : 0,
          transition: isDragging ? 'none' : 'opacity 0.2s',
        }}
      >
        <ChevronRight className="w-8 h-8 text-emerald-400 drop-shadow-lg" strokeWidth={2.5} />
        <ChevronRight className="w-6 h-6 text-emerald-400/50 -ml-3" strokeWidth={2.5} />
      </div>

      {/* Left swipe hint */}
      <div
        className="absolute inset-0 flex items-center justify-start pl-5 pointer-events-none z-10 rounded-2xl"
        style={{
          background: 'linear-gradient(to right, rgba(248,113,113,0.25), transparent)',
          opacity: showHintLeft ? clamp((-offsetX - 20) / 60, 0, 1) : 0,
          transition: isDragging ? 'none' : 'opacity 0.2s',
        }}
      >
        <ChevronLeft className="w-6 h-6 text-red-400/50 -mr-3" strokeWidth={2.5} />
        <ChevronLeft className="w-8 h-8 text-red-400 drop-shadow-lg" strokeWidth={2.5} />
      </div>

      {/* Up swipe hint */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-start pt-3 pointer-events-none z-10 rounded-2xl"
        style={{
          background: 'linear-gradient(to bottom, rgba(148,163,184,0.2), transparent 60%)',
          opacity: showHintUp ? clamp((-offsetY - 20) / 60, 0, 1) : 0,
          transition: isDragging ? 'none' : 'opacity 0.2s',
        }}
      >
        <ChevronUp className="w-5 h-5 text-slate-300 -mb-3" strokeWidth={2.5} />
        <ChevronUp className="w-7 h-7 text-slate-300 drop-shadow-lg" strokeWidth={2.5} />
      </div>

      {/* ── Card body ─────────────────────────────────────────────────── */}
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
          <p className={cn("font-bold uppercase tracking-wider text-[9px] mb-0.5", typeConfig.textClass)}>
            {popup.type.replace(/_/g, ' ')}
          </p>
          <h4 className="text-sm font-bold leading-snug text-white truncate">
            {popup.title}
          </h4>
          <p className="text-xs text-slate-400 mt-1 leading-normal line-clamp-2">
            {popup.message}
          </p>
        </div>

        {/* ✕ dismiss */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setExitDir('x');
            setTimeout(() => onDismiss(), 200);
          }}
          className="absolute right-2.5 top-2.5 w-8 h-8 rounded-lg text-slate-500 hover:text-white hover:bg-slate-800/60 flex items-center justify-center transition-colors cursor-pointer"
          aria-label="Dismiss notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ── Swipe hint label (shows when mid-swipe) ────────────────── */}
      <div
        className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap pointer-events-none"
        style={{
          opacity: isDragging && dragDist > 35 ? clamp((dragDist - 35) / 50, 0, 0.7) : 0,
          color: offsetX > 20 ? '#34d399' : offsetX < -20 ? '#f87171' : '#94a3b8',
          transition: isDragging ? 'none' : 'opacity 0.15s',
        }}
      >
        {offsetY < -20 && Math.abs(offsetX) < 40
          ? '↑ Release to dismiss'
          : offsetX > 20
          ? 'Release to dismiss →'
          : offsetX < -20
          ? '← Release to dismiss'
          : ''}
      </div>

      {/* ── Auto-dismiss countdown progress bar ───────────────────── */}
      <div className="w-full h-[3px] bg-slate-800/40">
        <div
          className={cn("h-full", typeConfig.progressBarClass)}
          style={{
            width: barWidth,
            transition: isDragging ? 'none' : 'width 0.25s linear',
          }}
        />
      </div>

      <style>{`
        @keyframes popup-slide-down {
          from { opacity: 0; transform: translate3d(0, -48px, 0) scale(0.94); }
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
