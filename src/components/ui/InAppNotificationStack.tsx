'use client';

import { useState, useRef, useEffect } from 'react';
import { useNotifications } from '@/lib/hooks/useNotifications';
import { useProfile } from '@/context/ProfileContext';
import {
  Megaphone, Clock, Trophy, Bell, MessageCircle, BookMarked, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const AUTO_DISMISS_MS = 30_000; // 30 s

// ── Type → style map ─────────────────────────────────────────────────────────
interface NotifStyle {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  iconBg: string;
  iconColor: string;
  borderColor: string;
  glow: string;
  tag: string;
  tagColor: string;
  bar: string;
}

const TYPE_MAP: Record<string, NotifStyle> = {
  announcement: {
    icon: Megaphone,
    iconBg: 'rgba(139,92,246,0.12)',
    iconColor: '#a78bfa',
    borderColor: 'rgba(139,92,246,0.25)',
    glow: '0 12px 40px rgba(0,0,0,0.55), 0 0 28px -6px rgba(139,92,246,0.3)',
    tag: 'Announcement', tagColor: '#a78bfa',
    bar: '#a78bfa',
  },
  deadline: {
    icon: Clock,
    iconBg: 'rgba(245,158,11,0.12)',
    iconColor: '#fbbf24',
    borderColor: 'rgba(245,158,11,0.25)',
    glow: '0 12px 40px rgba(0,0,0,0.55), 0 0 28px -6px rgba(245,158,11,0.3)',
    tag: 'Deadline', tagColor: '#fbbf24',
    bar: '#fbbf24',
  },
  result: {
    icon: Trophy,
    iconBg: 'rgba(56,189,248,0.12)',
    iconColor: '#38bdf8',
    borderColor: 'rgba(56,189,248,0.25)',
    glow: '0 12px 40px rgba(0,0,0,0.55), 0 0 28px -6px rgba(56,189,248,0.28)',
    tag: 'Result', tagColor: '#38bdf8',
    bar: '#38bdf8',
  },
  system: {
    icon: Bell,
    iconBg: 'rgba(100,116,139,0.12)',
    iconColor: '#94a3b8',
    borderColor: 'rgba(100,116,139,0.22)',
    glow: '0 12px 40px rgba(0,0,0,0.5)',
    tag: 'System', tagColor: '#94a3b8',
    bar: '#94a3b8',
  },
  resource_pending: {
    icon: BookMarked,
    iconBg: 'rgba(245,158,11,0.12)',
    iconColor: '#fbbf24',
    borderColor: 'rgba(245,158,11,0.25)',
    glow: '0 12px 40px rgba(0,0,0,0.55), 0 0 28px -6px rgba(245,158,11,0.3)',
    tag: 'Resource', tagColor: '#fbbf24',
    bar: '#fbbf24',
  },
};

// qna variants all share the MessageCircle style
const QNA_STYLE: NotifStyle = {
  icon: MessageCircle,
  iconBg: 'rgba(14,165,233,0.12)',
  iconColor: '#38bdf8',
  borderColor: 'rgba(14,165,233,0.25)',
  glow: '0 12px 40px rgba(0,0,0,0.55), 0 0 28px -6px rgba(14,165,233,0.28)',
  tag: 'Q&A', tagColor: '#38bdf8',
  bar: '#38bdf8',
};

function getStyle(type: string): NotifStyle {
  if (type.startsWith('qna')) return QNA_STYLE;
  return TYPE_MAP[type] ?? TYPE_MAP.system;
}

// ── Routing helper ────────────────────────────────────────────────────────────
function getHref(type: string, refId: string | null, prefix: string): string {
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

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

// ── Thresholds ────────────────────────────────────────────────────────────────
const DISMISS_DIST = 80;   // px to trigger dismiss
const DISMISS_VEL  = 0.35; // px/ms velocity to trigger dismiss

// ── Card component ────────────────────────────────────────────────────────────
function NotificationCard({
  popup,
  onDismiss,
}: {
  popup: any;
  onDismiss: () => void;
}) {
  const { profile } = useProfile();
  const prefix = profile?.role === 'cr' || profile?.role === 'admin' ? '/cr' : '/student';
  const href   = getHref(popup.type, popup.reference_id, prefix);
  const style  = getStyle(popup.type);
  const Icon   = style.icon;

  // ── Gesture refs (sync, never stale) ─────────────────────────────────────
  const isDraggingRef = useRef(false);
  const dragStart     = useRef({ x: 0, y: 0 });
  const dragTime      = useRef(0);
  const offsetXRef    = useRef(0);
  const offsetYRef    = useRef(0);
  const isPaused      = useRef(false);

  // ── Render state ─────────────────────────────────────────────────────────
  const [ox, setOx]             = useState(0);   // current x offset
  const [oy, setOy]             = useState(0);   // current y offset
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(0);

  // exit: null = idle, 'right'|'left'|'up'|'fade'
  type ExitDir = 'right' | 'left' | 'up' | 'fade' | null;
  const [exitDir, setExitDir] = useState<ExitDir>(null);

  // ── Auto-dismiss timer ────────────────────────────────────────────────────
  useEffect(() => {
    const start = Date.now();
    let pauseAccum = 0, pauseAt = 0, raf: number;
    const tick = () => {
      if (isPaused.current) {
        if (!pauseAt) pauseAt = Date.now();
        raf = requestAnimationFrame(tick);
        return;
      }
      if (pauseAt) { pauseAccum += Date.now() - pauseAt; pauseAt = 0; }
      const ratio = Math.min((Date.now() - start - pauseAccum) / AUTO_DISMISS_MS, 1);
      setProgress(ratio);
      if (ratio >= 1) { triggerExit('up'); return; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Exit helper ───────────────────────────────────────────────────────────
  function triggerExit(dir: ExitDir) {
    setExitDir(dir);
    setTimeout(() => onDismiss(), 350);
  }

  // ── Drag handlers ─────────────────────────────────────────────────────────
  function onStart(cx: number, cy: number) {
    isDraggingRef.current = true;
    isPaused.current      = true;
    dragStart.current     = { x: cx, y: cy };
    dragTime.current      = Date.now();
    offsetXRef.current    = 0;
    offsetYRef.current    = 0;
    setDragging(true);
    setOx(0);
    setOy(0);
  }

  function onMove(cx: number, cy: number) {
    if (!isDraggingRef.current) return;
    const dx         = cx - dragStart.current.x;
    const dy         = cy - dragStart.current.y;
    const clampedDy  = dy < 0 ? dy : dy * 0.15; // free up, rubber-band down
    offsetXRef.current = dx;
    offsetYRef.current = clampedDy;
    setOx(dx);
    setOy(clampedDy);
  }

  function onEnd() {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    isPaused.current      = false;
    setDragging(false);

    const dx  = offsetXRef.current;
    const dy  = offsetYRef.current;
    const dt  = Math.max(Date.now() - dragTime.current, 1);
    const vx  = Math.abs(dx) / dt;
    const vy  = Math.abs(dy) / dt;

    // Tap (tiny movement, quick)
    if (Math.abs(dx) < 8 && Math.abs(dy) < 8 && dt < 200) {
      setExitDir('fade');
      setTimeout(() => { window.location.href = href; onDismiss(); }, 100);
      return;
    }
    // Swipe right
    if (dx > DISMISS_DIST || (dx > 30 && vx > DISMISS_VEL)) {
      setOx(600); offsetXRef.current = 600;
      triggerExit('right');
      return;
    }
    // Swipe left
    if (dx < -DISMISS_DIST || (dx < -30 && vx > DISMISS_VEL)) {
      setOx(-600); offsetXRef.current = -600;
      triggerExit('left');
      return;
    }
    // Swipe up
    if (dy < -DISMISS_DIST || (dy < -30 && vy > DISMISS_VEL)) {
      setOy(-280); offsetYRef.current = -280;
      triggerExit('up');
      return;
    }
    // Snap back
    setOx(0); setOy(0);
    offsetXRef.current = 0; offsetYRef.current = 0;
  }

  // Window-level mouse listeners (attached once)
  useEffect(() => {
    const mv = (e: MouseEvent) => onMove(e.clientX, e.clientY);
    const up = ()              => { if (isDraggingRef.current) onEnd(); };
    window.addEventListener('mousemove', mv);
    window.addEventListener('mouseup',   up);
    return () => { window.removeEventListener('mousemove', mv); window.removeEventListener('mouseup', up); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Visual derivations ────────────────────────────────────────────────────
  const dist     = Math.sqrt(ox * ox + oy * oy);
  const rotate   = dragging ? clamp((ox / 320) * 7, -7, 7) : 0;
  const opacity  = dragging ? clamp(1 - dist / 280, 0.25, 1) : 1;

  // Edge glow intensities — drives the coloured strips
  const rightGlow = dragging && ox > 12 ? clamp((ox - 12) / 68, 0, 1) : 0;
  const leftGlow  = dragging && ox < -12 ? clamp((-ox - 12) / 68, 0, 1) : 0;
  const upGlow    = dragging && oy < -12 && Math.abs(ox) < 55
                    ? clamp((-oy - 12) / 58, 0, 1) : 0;

  // Exit overrides
  let finalX = ox, finalY = oy, finalRot = rotate, finalOp = opacity;
  if (exitDir === 'right') { finalX = 600; finalRot =  10; finalOp = 0; }
  if (exitDir === 'left')  { finalX = -600; finalRot = -10; finalOp = 0; }
  if (exitDir === 'up')    { finalX = ox; finalY = -280; finalRot = 0; finalOp = 0; }
  if (exitDir === 'fade')  { finalOp = 0; }

  const isExiting = exitDir !== null;

  return (
    <div
      onMouseDown={(e) => onStart(e.clientX, e.clientY)}
      onTouchStart={(e) => onStart(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchMove={(e)  => onMove(e.touches[0].clientX,  e.touches[0].clientY)}
      onTouchEnd={onEnd}
      className="w-full rounded-2xl select-none relative pointer-events-auto overflow-hidden cursor-grab active:cursor-grabbing"
      style={{
        background:    'rgba(22, 26, 35, 0.96)',
        border:        `1px solid ${style.borderColor}`,
        boxShadow:     style.glow,
        backdropFilter:'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        transform: `translate3d(${finalX}px, ${finalY}px, 0) rotate(${finalRot}deg)`,
        opacity:   finalOp,
        transition: dragging
          ? 'none'
          : isExiting
            ? 'transform 0.32s cubic-bezier(0.4, 0, 1, 1), opacity 0.28s ease-out'
            : 'transform 0.42s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s ease',
        touchAction:  'none',
        willChange:   'transform, opacity',
        animation: isExiting ? 'none' : 'notif-in 0.38s cubic-bezier(0.22, 1, 0.36, 1) both',
      }}
    >
      {/* ── Directional edge glows ─────────────────────────────────────── */}
      {/* Right edge — green */}
      <div
        aria-hidden
        className="absolute inset-y-0 right-0 w-14 pointer-events-none rounded-r-2xl"
        style={{
          background: 'linear-gradient(to left, rgba(52,211,153,0.55), transparent)',
          opacity: rightGlow,
          transition: dragging ? 'none' : 'opacity 0.15s',
        }}
      />
      {/* Left edge — rose */}
      <div
        aria-hidden
        className="absolute inset-y-0 left-0 w-14 pointer-events-none rounded-l-2xl"
        style={{
          background: 'linear-gradient(to right, rgba(251,113,133,0.55), transparent)',
          opacity: leftGlow,
          transition: dragging ? 'none' : 'opacity 0.15s',
        }}
      />
      {/* Top edge — slate */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-10 pointer-events-none rounded-t-2xl"
        style={{
          background: 'linear-gradient(to bottom, rgba(148,163,184,0.45), transparent)',
          opacity: upGlow,
          transition: dragging ? 'none' : 'opacity 0.15s',
        }}
      />

      {/* ── Card content ──────────────────────────────────────────────── */}
      <div className="flex items-start gap-3.5 px-4 pt-4 pb-3 pr-12">
        {/* Icon */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: style.iconBg, border: `1px solid ${style.borderColor}` }}
        >
          <Icon className="w-5 h-5" style={{ color: style.iconColor }} />
        </div>

        {/* Text */}
        <div className="min-w-0 flex-1 pt-0.5">
          <p
            className="text-[9px] font-black uppercase tracking-widest mb-1"
            style={{ color: style.tagColor }}
          >
            {style.tag}
          </p>
          <h4 className="text-[13px] font-bold leading-snug text-white truncate">
            {popup.title}
          </h4>
          <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed line-clamp-2">
            {popup.message}
          </p>
        </div>

        {/* ✕ */}
        <button
          onClick={(e) => { e.stopPropagation(); triggerExit('fade'); }}
          className="absolute right-2.5 top-2.5 w-7 h-7 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
          aria-label="Dismiss"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ── Swipe direction hint (appears mid-drag) ───────────────────── */}
      {dragging && dist > 28 && (
        <div
          className="absolute bottom-5 inset-x-0 flex justify-center pointer-events-none"
          style={{
            opacity: clamp((dist - 28) / 52, 0, 0.75),
            transition: 'none',
          }}
        >
          <span
            className="text-[9px] font-black uppercase tracking-[0.18em] px-2.5 py-0.5 rounded-full"
            style={{
              color: ox > 12 ? '#34d399' : ox < -12 ? '#fb7185' : '#94a3b8',
              background: ox > 12
                ? 'rgba(52,211,153,0.12)'
                : ox < -12
                ? 'rgba(251,113,133,0.12)'
                : 'rgba(148,163,184,0.1)',
            }}
          >
            {oy < -12 && Math.abs(ox) < 55
              ? 'Release to dismiss'
              : ox > 12
              ? 'Release to dismiss'
              : ox < -12
              ? 'Release to dismiss'
              : ''}
          </span>
        </div>
      )}

      {/* ── Progress bar ──────────────────────────────────────────────── */}
      <div className="h-[2.5px] w-full bg-white/5">
        <div
          className="h-full rounded-full transition-none"
          style={{
            width: `${(1 - progress) * 100}%`,
            background: style.bar,
            opacity: 0.7,
            transition: dragging ? 'none' : 'width 0.25s linear',
          }}
        />
      </div>

      <style>{`
        @keyframes notif-in {
          from { opacity: 0; transform: translate3d(0, -52px, 0) scale(0.92); }
          to   { opacity: 1; transform: translate3d(0, 0, 0)    scale(1); }
        }
      `}</style>
    </div>
  );
}

// ── Stack wrapper ─────────────────────────────────────────────────────────────
export function InAppNotificationStack() {
  const { activePopups, dismissPopup } = useNotifications();
  if (!activePopups || activePopups.length === 0) return null;

  return (
    <div className="fixed top-safe-or-4 left-1/2 -translate-x-1/2 z-[99999] flex flex-col gap-2.5 w-full max-w-[360px] px-4 pointer-events-none"
      style={{ top: 'max(env(safe-area-inset-top, 0px) + 12px, 16px)' }}
    >
      {activePopups.map((popup) => (
        <NotificationCard
          key={popup.id}
          popup={popup}
          onDismiss={() => dismissPopup(popup.id)}
        />
      ))}
    </div>
  );
}
