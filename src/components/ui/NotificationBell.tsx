'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { Bell, X, CheckCheck, Megaphone, Clock, Trophy, MessageCircle, BookMarked } from 'lucide-react';
import { Notification, NotifType } from '@/types';
import { useNotifications } from '@/lib/hooks/useNotifications';
import { useProfile } from '@/context/ProfileContext';
import { timeAgo } from '@/lib/utils/formatters';
import { cn } from '@/lib/utils';

interface NotifTypeConfig {
  icon: React.ComponentType<{ className?: string }>;
  bg: string;
}

const notifTypeIcon: Record<NotifType, NotifTypeConfig> = {
  announcement: { icon: Megaphone,       bg: 'bg-rose-500/10 border-rose-500/20 text-rose-400' },
  deadline:     { icon: Clock,           bg: 'bg-amber-500/10 border-amber-500/20 text-amber-400' },
  result:       { icon: Trophy,          bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' },
  system:       { icon: Bell,            bg: 'bg-slate-500/10 border-slate-500/20 text-slate-400' },
  qna:          { icon: MessageCircle,   bg: 'bg-sky-500/10 border-sky-500/20 text-sky-400' },
  qna_announcement: { icon: MessageCircle, bg: 'bg-sky-500/10 border-sky-500/20 text-sky-400' },
  qna_deadline:     { icon: MessageCircle, bg: 'bg-sky-500/10 border-sky-500/20 text-sky-400' },
  qna_event:        { icon: MessageCircle, bg: 'bg-sky-500/10 border-sky-500/20 text-sky-400' },
  resource_pending: { icon: BookMarked,  bg: 'bg-amber-500/10 border-amber-500/20 text-amber-400' },
};

function getNotifHref(type: NotifType, refId: string | null, prefix: string): string {
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

function NotifItem({ notif, prefix, onClose }: { notif: Notification; prefix: string; onClose: () => void }) {
  const typeConfig = notifTypeIcon[notif.type] || notifTypeIcon.system;
  const IconComponent = typeConfig.icon;

  return (
    <Link
      href={getNotifHref(notif.type, notif.reference_id, prefix)}
      onClick={onClose}
      className={cn(
        'flex gap-3.5 px-4 py-3.5 transition-all duration-200 hover:bg-[#34D399]/5 relative border-b border-[#23262D]/50 last:border-b-0 group active:bg-[#34D399]/10',
        !notif.is_read && 'bg-[#34D399]/[0.03]'
      )}
    >
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center border flex-shrink-0 transition-transform group-hover:scale-105', typeConfig.bg)}>
        <IconComponent className="w-5 h-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-tight text-slate-100 truncate">{notif.title}</p>
        <p className="text-xs text-slate-400 mt-1 leading-normal line-clamp-2">{notif.message}</p>
        <p className="text-[10px] text-slate-500 mt-1.5 font-medium">{timeAgo(notif.created_at)}</p>
      </div>
      {!notif.is_read && (
        <span className="absolute right-4 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#34D399] shadow-[0_0_8px_#34D399]" />
      )}
    </Link>
  );
}

export function NotificationBell() {
  const { profile } = useProfile();
  const { notifications, unreadCount, markAllRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // ── Gesture state ──
  const dragState = useRef<{
    startY: number;
    startTime: number;
    lastY: number;
    lastTime: number;
    active: boolean;
    startScrollTop: number;
  } | null>(null);
  const [translateY, setTranslateY] = useState(0);
  const [dragging, setDragging] = useState(false);

  const handleSheetTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    const scrollTop = listRef.current?.scrollTop ?? 0;
    dragState.current = {
      startY: touch.clientY,
      startTime: Date.now(),
      lastY: touch.clientY,
      lastTime: Date.now(),
      active: false,
      startScrollTop: scrollTop,
    };
  }, []);

  const handleSheetTouchMove = useCallback((e: React.TouchEvent) => {
    if (!dragState.current) return;
    const touch = e.touches[0];
    const dy = touch.clientY - dragState.current.startY;
    const scrollTop = listRef.current?.scrollTop ?? 0;

    dragState.current.lastY = touch.clientY;
    dragState.current.lastTime = Date.now();

    // Only allow drag-down dismiss when scrolled to top and moving downward
    const canDrag = dy > 0 && scrollTop <= 2 && dragState.current.startScrollTop <= 2;

    if (!canDrag) return;

    // Activate drag once we've moved 10px to avoid false positives
    if (!dragState.current.active && dy > 10) {
      dragState.current.active = true;
      setDragging(true);
    }

    if (dragState.current.active) {
      // Add rubber-banding: full drag for first 150px, then dampen
      const damped = dy <= 150 ? dy : 150 + (dy - 150) * 0.25;
      setTranslateY(Math.max(0, damped));
    }
  }, []);

  const handleSheetTouchEnd = useCallback(() => {
    if (!dragState.current || !dragState.current.active) {
      dragState.current = null;
      setDragging(false);
      setTranslateY(0);
      return;
    }

    const { startY, startTime, lastY, lastTime } = dragState.current;
    const totalDy = lastY - startY;
    const totalTime = Math.max(1, lastTime - startTime);
    const velocity = totalDy / totalTime; // px/ms

    dragState.current = null;
    setDragging(false);

    // Dismiss if: velocity > 0.45 px/ms OR dragged more than 120px
    if (velocity > 0.45 || totalDy > 120) {
      // Animate out quickly, then close
      setTranslateY(window.innerHeight);
      setTimeout(() => {
        setIsOpen(false);
        setTranslateY(0);
      }, 240);
    } else {
      // Snap back
      setTranslateY(0);
    }
  }, []);

  useEffect(() => { setMounted(true); }, []);

  const prefix = profile?.role === 'cr' || profile?.role === 'admin' ? '/cr' : '/student';

  // Lock body scroll when open on mobile
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // Close on outside click (desktop only)
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      const bellBtn = document.getElementById('notification-bell-btn');
      if (
        (dropdownRef.current && dropdownRef.current.contains(target)) ||
        (bellBtn && bellBtn.contains(target))
      ) {
        return;
      }
      setIsOpen(false);
    }
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Escape to close
  useEffect(() => {
    function handleKey(e: KeyboardEvent) { if (e.key === 'Escape') setIsOpen(false); }
    if (isOpen) document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen]);

  function handleToggle() {
    setIsOpen((prev) => {
      const next = !prev;
      if (next && unreadCount > 0) markAllRead();
      return next;
    });
  }

  if (!profile?.notif_enabled) return null;

  // ── The panel content (shared between desktop dropdown and mobile sheet) ──
  const panelContent = (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#23262D] shrink-0">
        <div className="flex items-center gap-2.5">
          <Bell className="w-4 h-4 text-[#34D399]" />
          <h3 className="font-bold text-sm text-white">Notifications</h3>
          {unreadCount > 0 && (
            <span className="min-w-[20px] h-5 rounded-full bg-[#34D399]/15 border border-[#34D399]/30 text-[#34D399] text-[10px] font-black flex items-center justify-center px-1.5">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1 text-[11px] font-bold text-[#34D399] hover:text-[#43fca7] transition-colors cursor-pointer px-2 py-1 rounded-lg hover:bg-[#34D399]/10"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Mark all read</span>
            </button>
          )}
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer"
            aria-label="Close notifications"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-14 px-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-800/50 border border-slate-700/40 flex items-center justify-center">
              <Bell className="w-6 h-6 text-slate-600" />
            </div>
            <p className="text-sm font-semibold text-slate-400">All caught up</p>
            <p className="text-xs text-slate-600">No new notifications right now.</p>
          </div>
        ) : (
          <>
            {notifications.slice(0, 8).map((notif) => (
              <NotifItem key={notif.id} notif={notif} prefix={prefix} onClose={() => setIsOpen(false)} />
            ))}
            {notifications.length > 8 && (
              <div className="px-4 py-3.5 text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider bg-[#1A1D24]/40">
                + {notifications.length - 8} more
              </div>
            )}
          </>
        )}
      </div>
    </>
  );

  // ── Mobile bottom sheet via portal ──
  const mobileSheet = mounted && isOpen && createPortal(
    <div className="lg:hidden fixed inset-0 z-[9999] flex flex-col justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />
      {/* Sheet — touch handlers cover the ENTIRE sheet */}
      <div
        onTouchStart={handleSheetTouchStart}
        onTouchMove={handleSheetTouchMove}
        onTouchEnd={handleSheetTouchEnd}
        className={cn(
          "relative z-10 flex flex-col rounded-t-3xl overflow-hidden",
          // Only apply CSS transition when snapping back (not while actively dragging)
          !dragging && "transition-transform duration-[240ms] ease-out"
        )}
        style={{
          background: 'linear-gradient(180deg, #1A1D24 0%, #0E0F11 100%)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderBottom: 'none',
          maxHeight: '65dvh',
          boxShadow: '0 -20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(52,211,153,0.06)',
          transform: `translateY(${translateY}px)`,
          willChange: 'transform',
          animation: translateY === 0 && !dragging ? 'sheet-up 0.32s cubic-bezier(0.16,1,0.3,1) both' : undefined,
        }}
      >
        {/* Drag handle — purely visual, touch works on whole sheet */}
        <div className="flex justify-center pt-3 pb-1.5 shrink-0 select-none">
          <div className={cn(
            "rounded-full transition-all duration-150",
            dragging ? "w-12 h-1.5 bg-slate-500" : "w-10 h-1.5 bg-slate-700/80"
          )} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3 border-b border-[#23262D] shrink-0">
          <div className="flex items-center gap-2.5">
            <Bell className="w-4 h-4 text-[#34D399]" />
            <h3 className="font-bold text-sm text-white">Notifications</h3>
            {unreadCount > 0 && (
              <span className="min-w-[20px] h-5 rounded-full bg-[#34D399]/15 border border-[#34D399]/30 text-[#34D399] text-[10px] font-black flex items-center justify-center px-1.5">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-[11px] font-bold text-[#34D399] hover:text-[#43fca7] transition-colors cursor-pointer px-2 py-1 rounded-lg hover:bg-[#34D399]/10"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            )}
          </div>
        </div>

        {/* Notification list — uses listRef for scroll-position-aware gesture detection */}
        <div ref={listRef} className="flex-1 overflow-y-auto overscroll-contain">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-14 px-6 text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-800/50 border border-slate-700/40 flex items-center justify-center">
                <Bell className="w-6 h-6 text-slate-600" />
              </div>
              <p className="text-sm font-semibold text-slate-400">All caught up</p>
              <p className="text-xs text-slate-600">No new notifications right now.</p>
            </div>
          ) : (
            <>
              {notifications.slice(0, 8).map((notif) => (
                <NotifItem key={notif.id} notif={notif} prefix={prefix} onClose={() => setIsOpen(false)} />
              ))}
              {notifications.length > 8 && (
                <div className="px-4 py-3.5 text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider bg-[#1A1D24]/40">
                  + {notifications.length - 8} more
                </div>
              )}
            </>
          )}
        </div>

        {/* Safe area bottom spacer */}
        <div className="shrink-0" style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)' }} />
      </div>
      <style>{`
        @keyframes sheet-up {
          from { transform: translateY(100%); opacity: 0.6; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </div>,
    document.body
  );

  return (
    <>
      {/* Bell trigger button */}
      <button
        id="notification-bell-btn"
        onClick={handleToggle}
        className="relative flex items-center justify-center w-11 h-11 lg:w-9 lg:h-9 rounded-lg border border-[#23262D] bg-[#0E0F11] hover:bg-[#23262D]/60 hover:text-white transition-all duration-200 text-slate-400 cursor-pointer flex-shrink-0"
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 lg:-top-1.5 lg:-right-1.5 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center px-1 shadow-lg shadow-red-500/30">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Desktop dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="hidden lg:flex lg:flex-col absolute right-0 top-12 w-[360px] max-h-[520px] rounded-2xl overflow-hidden z-50"
          style={{
            background: 'linear-gradient(180deg, #1A1D24 0%, #0E0F11 100%)',
            border: '1px solid rgba(255,255,255,0.07)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.6), 0 0 40px -10px rgba(52,211,153,0.12)',
            animation: 'notif-dropdown 0.2s cubic-bezier(0.16,1,0.3,1) both',
          }}
          role="dialog"
          aria-label="Notifications"
        >
          {panelContent}
        </div>
      )}

      {/* Mobile bottom sheet */}
      {mobileSheet}

      <style>{`
        @keyframes notif-dropdown {
          from { opacity: 0; transform: translateY(-8px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }
      `}</style>
    </>
  );
}
