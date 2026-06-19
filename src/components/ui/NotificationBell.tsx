'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, X, CheckCheck, Megaphone, Clock, Trophy, MessageCircle, BookMarked, ChevronDown, Check, Lock, CheckSquare } from 'lucide-react';
import { Notification, NotifType } from '@/types';
import { useNotifications } from '@/lib/hooks/useNotifications';
import { useProfile } from '@/context/ProfileContext';
import { timeAgo } from '@/lib/utils/formatters';
import { cn } from '@/lib/utils';
import { bulkDeleteNotifications } from '@/lib/actions/notifications';
import { BulkDeleteBar } from '@/components/ui/BulkDeleteBar';

interface NotifTypeConfig {
  icon: React.ComponentType<{ className?: string }>;
  bg: string;
}

const notifTypeIcon: Record<NotifType, NotifTypeConfig> = {
  announcement: { icon: Megaphone,       bg: 'bg-brand-purple/10 border-brand-purple/20 text-brand-purple' },
  deadline:     { icon: Clock,           bg: 'bg-amber-500/10 border-amber-500/20 text-amber-400' },
  result:       { icon: Trophy,          bg: 'bg-brand-cyan/10 border-brand-cyan/20 text-brand-cyan' },
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

const DELETABLE_TYPES: NotifType[] = ['announcement', 'deadline', 'result', 'system'];

function NotifItem({ 
  notif, 
  prefix, 
  onClose,
  selectMode,
  isSelected,
  onToggle
}: { 
  notif: Notification; 
  prefix: string; 
  onClose: () => void;
  selectMode: boolean;
  isSelected: boolean;
  onToggle: () => void;
}) {
  const typeConfig = notifTypeIcon[notif.type] || notifTypeIcon.system;
  const IconComponent = typeConfig.icon;
  const href = getNotifHref(notif.type, notif.reference_id, prefix);
  const isDeletable = DELETABLE_TYPES.includes(notif.type);

  // Track touch position and start time to differentiate a fast tap/click from scrolling/dragging
  const touchStart = useRef<{ x: number; y: number; time: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStart.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;

    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStart.current.x;
    const dy = touch.clientY - touchStart.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    // eslint-disable-next-line react-hooks/purity
    const duration = Date.now() - touchStart.current.time;

    // Reset touch tracking
    touchStart.current = null;

    // If moved more than 8 pixels, or touch duration is longer than 250ms,
    // count it as a drag, scroll, or hold — not a clean click tap.
    if (distance > 8 || duration > 250) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    
    if (selectMode) {
      if (isDeletable) onToggle();
    } else {
      navigate();
    }
  };

  const handleTouchCancel = () => {
    touchStart.current = null;
  };

  const handleMouseClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (selectMode) {
      if (isDeletable) onToggle();
    } else {
      navigate();
    }
  };

  const navigate = () => {
    // Direct native browser redirect (highly robust for mobile web and native app portals)
    window.location.href = href;
    
    // Close panel after a tiny delay
    setTimeout(() => {
      onClose();
    }, 100);
  };

  return (
    <a
      href={href}
      onClick={handleMouseClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      className={cn(
        'flex gap-3.5 px-4 py-3.5 transition-all duration-200 hover:bg-brand-purple/5 relative border-b border-[#23262D]/50 last:border-b-0 group active:bg-brand-purple/10 cursor-pointer items-center',
        !notif.is_read && !selectMode && 'bg-brand-purple/[0.03]'
      )}
    >
      {/* Checkbox for selection */}
      {selectMode && isDeletable && (
        <div className="flex-shrink-0 mr-1">
          {isSelected ? (
            <div className="w-5 h-5 rounded-md bg-gradient-to-br from-rose-400 to-rose-600 flex items-center justify-center text-white shadow-[0_0_10px_rgba(244,63,94,0.4)] border border-rose-400/20">
              <Check className="w-3.5 h-3.5 stroke-[3.5]" />
            </div>
          ) : (
            <div className="w-5 h-5 rounded-md border border-slate-700 bg-white/[0.02] hover:border-slate-500 transition-colors flex items-center justify-center" />
          )}
        </div>
      )}
      
      {/* Locked icon for non-deletable items in selection mode */}
      {selectMode && !isDeletable && (
        <div className="flex-shrink-0 mr-1 w-5 h-5 opacity-25 flex items-center justify-center">
          <Lock className="w-3.5 h-3.5 text-slate-500" />
        </div>
      )}

      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center border flex-shrink-0 transition-transform group-hover:scale-105', typeConfig.bg)}>
        <IconComponent className="w-5 h-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-tight text-slate-100 truncate">{notif.title}</p>
        <p className="text-xs text-slate-400 mt-1 leading-normal line-clamp-2">{notif.message}</p>
        <p className="text-[10px] text-slate-500 mt-1.5 font-medium">{timeAgo(notif.created_at)}</p>
      </div>
      {!notif.is_read && !selectMode && (
        <span className="absolute right-4 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-brand-purple shadow-[0_0_8px_#8B5CF6]" />
      )}
    </a>
  );
}

export function NotificationBell() {
  const { profile } = useProfile();
  const { notifications, unreadCount, markAllRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Reset selection states when bell panel opens or closes
  useEffect(() => {
    if (!isOpen) {
      setSelectMode(false);
      setSelectedIds(new Set());
    }
  }, [isOpen]);

  const INITIAL_COUNT = 8;
  const visibleNotifs = showAll ? notifications : notifications.slice(0, INITIAL_COUNT);
  const hiddenCount = notifications.length - INITIAL_COUNT;

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

  // Close notifications panel automatically on route transition
  useEffect(() => {
    setIsOpen(false);
    setShowAll(false);
  }, [pathname]);

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
      if (!next) setShowAll(false);
      return next;
    });
  }

  if (!profile?.notif_enabled) return null;

  // Load More button — shared between desktop and mobile
  const handleLoadMore = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowAll(true);
  };

  const loadMoreButton = !showAll && hiddenCount > 0 ? (
    <button
      onClick={handleLoadMore}
      onTouchEnd={handleLoadMore}
      className="w-full flex items-center justify-center gap-2 px-4 py-3.5 text-[11px] font-bold text-[#34D399] hover:text-[#43fca7] uppercase tracking-wider transition-all hover:bg-[#34D399]/5 border-t border-[#23262D]/50 cursor-pointer"
    >
      <ChevronDown className="w-3.5 h-3.5" />
      Show {hiddenCount} more notification{hiddenCount !== 1 ? 's' : ''}
    </button>
  ) : null;

  function toggleItem(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function handleBulkDelete() {
    const idsArray = Array.from(selectedIds);
    const res = await bulkDeleteNotifications(idsArray);
    if (res && res.error) {
      alert(res.error);
    } else {
      setSelectedIds(new Set());
      setSelectMode(false);
    }
  }

  // ── The panel content (shared between desktop dropdown and mobile sheet) ──
  const panelContent = (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#23262D] shrink-0">
        <div className="flex items-center gap-2.5">
          <Bell className="w-4 h-4 text-[#34D399]" />
          <h3 className="font-bold text-sm text-white">Notifications</h3>
          {unreadCount > 0 && !selectMode && (
            <span className="min-w-[20px] h-5 rounded-full bg-[#34D399]/15 border border-[#34D399]/30 text-[#34D399] text-[10px] font-black flex items-center justify-center px-1.5 animate-pulse">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {notifications.length > 0 && (
            <button
              onClick={() => {
                setSelectMode((prev) => !prev);
                setSelectedIds(new Set());
              }}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all duration-200 cursor-pointer shadow-sm active:scale-95",
                selectMode
                  ? "bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20"
                  : "border-white/[0.08] text-slate-300 hover:text-white hover:bg-white/[0.04]"
              )}
            >
              {selectMode ? (
                <>
                  <X className="w-3 h-3 text-rose-400 flex-shrink-0" />
                  <span>Cancel</span>
                </>
              ) : (
                <>
                  <CheckSquare className="w-3 h-3 text-slate-400 flex-shrink-0" />
                  <span>Select</span>
                </>
              )}
            </button>
          )}
          {unreadCount > 0 && !selectMode && (
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
            {visibleNotifs.map((notif) => (
              <NotifItem 
                key={notif.id} 
                notif={notif} 
                prefix={prefix} 
                onClose={() => setIsOpen(false)} 
                selectMode={selectMode}
                isSelected={selectedIds.has(notif.id)}
                onToggle={() => toggleItem(notif.id)}
              />
            ))}
            {loadMoreButton}
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
      {/* Sheet — NO gesture handlers here; they live on the handle+header only */}
      <div
        className={cn(
          "relative z-10 flex flex-col rounded-t-3xl overflow-hidden",
          // Only apply CSS transition when snapping back (not while actively dragging)
          !dragging && "transition-transform duration-[240ms] ease-out"
        )}
        style={{
          background: 'linear-gradient(180deg, #1A1D24 0%, #0E0F11 100%)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderBottom: 'none',
          maxHeight: '72dvh',
          boxShadow: '0 -20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(52,211,153,0.06)',
          transform: `translateY(${translateY}px)`,
          willChange: 'transform',
          animation: translateY === 0 && !dragging ? 'sheet-up 0.32s cubic-bezier(0.16,1,0.3,1) both' : undefined,
        }}
      >
        {/* Drag handle + header zone — gesture handlers scoped HERE only */}
        {/* drag zones */}
        <div
          onTouchStart={handleSheetTouchStart}
          onTouchMove={handleSheetTouchMove}
          onTouchEnd={handleSheetTouchEnd}
          className="shrink-0 select-none"
        >
          {/* Drag pill */}
          <div className="flex justify-center pt-3 pb-1.5">
            <div className={cn(
              "rounded-full transition-all duration-150",
              dragging ? "w-12 h-1.5 bg-slate-500" : "w-10 h-1.5 bg-slate-700/80"
            )} />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-4 pb-3 border-b border-[#23262D]">
            <div className="flex items-center gap-2.5">
              <Bell className="w-4 h-4 text-[#34D399]" />
              <h3 className="font-bold text-sm text-white">Notifications</h3>
              {unreadCount > 0 && !selectMode && (
                <span className="min-w-[20px] h-5 rounded-full bg-[#34D399]/15 border border-[#34D399]/30 text-[#34D399] text-[10px] font-black flex items-center justify-center px-1.5">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {notifications.length > 0 && (
                <button
                  onClick={() => {
                    setSelectMode((prev) => !prev);
                    setSelectedIds(new Set());
                  }}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all duration-200 cursor-pointer shadow-sm active:scale-95",
                    selectMode
                      ? "bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20"
                      : "border-white/[0.08] text-slate-300 hover:text-white hover:bg-white/[0.04]"
                  )}
                >
                  {selectMode ? (
                    <>
                      <X className="w-3 h-3 text-rose-400 flex-shrink-0" />
                      <span>Cancel</span>
                    </>
                  ) : (
                    <>
                      <CheckSquare className="w-3 h-3 text-slate-400 flex-shrink-0" />
                      <span>Select</span>
                    </>
                  )}
                </button>
              )}
              {unreadCount > 0 && !selectMode && (
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
        </div>

        {/* Notification list — NO touch interception; taps go directly to Links */}
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
              {visibleNotifs.map((notif) => (
                <NotifItem 
                  key={notif.id} 
                  notif={notif} 
                  prefix={prefix} 
                  onClose={() => setIsOpen(false)} 
                  selectMode={selectMode}
                  isSelected={selectedIds.has(notif.id)}
                  onToggle={() => toggleItem(notif.id)}
                />
              ))}
              {loadMoreButton}
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
        className="relative flex items-center justify-center w-11 h-11 lg:w-9 lg:h-9 rounded-xl border border-slate-800/80 bg-slate-900/45 hover:bg-[#34D399]/10 hover:border-[#34D399]/30 hover:text-[#34D399] transition-all duration-300 text-slate-400 cursor-pointer flex-shrink-0 shadow-lg shadow-black/20"
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
      >
        <Bell className="w-4 h-4 transition-transform duration-300" />
        {unreadCount > 0 && (
          <span className="absolute top-2.5 right-2.5 lg:top-1.5 lg:right-1.5 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#34D399] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#34D399] shadow-[0_0_8px_#34D399]"></span>
          </span>
        )}
      </button>

      {/* Desktop dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="hidden lg:flex lg:flex-col absolute right-0 top-12 w-[360px] max-h-[540px] rounded-2xl overflow-hidden z-50"
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

      <BulkDeleteBar
        count={selectedIds.size}
        onCancel={() => {
          setSelectMode(false);
          setSelectedIds(new Set());
        }}
        onDelete={handleBulkDelete}
        label="notifications"
      />

      <style>{`
        @keyframes notif-dropdown {
          from { opacity: 0; transform: translateY(-8px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }
      `}</style>
    </>
  );
}
