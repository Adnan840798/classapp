'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, X, CheckCheck, Megaphone, Clock, Trophy, MessageCircle, BookMarked, ChevronDown, Check, Lock, CheckSquare, FolderOpen } from 'lucide-react';
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
  resource:         { icon: FolderOpen,  bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' },
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
    case 'resource':         return `${prefix}/notes`;
    default:                 return `${prefix}/timeline`;
  }
}

const DELETABLE_TYPES: NotifType[] = ['announcement', 'deadline', 'result', 'system', 'resource'];

function NotifItem({ 
  notif, 
  prefix, 
  onClose,
  selectMode,
  isSelected,
  onToggle,
  onLongPress
}: { 
  notif: Notification; 
  prefix: string; 
  onClose: () => void;
  selectMode: boolean;
  isSelected: boolean;
  onToggle: () => void;
  onLongPress?: () => void;
}) {
  const typeConfig = notifTypeIcon[notif.type] || notifTypeIcon.system;
  const IconComponent = typeConfig.icon;
  const href = getNotifHref(notif.type, notif.reference_id, prefix);
  const isDeletable = DELETABLE_TYPES.includes(notif.type);

  // Refs for tracking touch states and timers
  const touchStart = useRef<{ x: number; y: number; time: number } | null>(null);
  const longPressTimeout = useRef<NodeJS.Timeout | null>(null);
  const isLongPressActive = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStart.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
    isLongPressActive.current = false;

    // Start 500ms long-press timer if item is deletable and not already in selectMode
    if (isDeletable && !selectMode) {
      longPressTimeout.current = setTimeout(() => {
        isLongPressActive.current = true;
        if (navigator.vibrate) {
          navigator.vibrate(50); // Haptic vibration feedback
        }
        onLongPress?.();
      }, 500);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchStart.current.x;
    const dy = touch.clientY - touchStart.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Cancel timer if user scrolls or drags finger significantly (more than 10px)
    if (distance > 10) {
      if (longPressTimeout.current) {
        clearTimeout(longPressTimeout.current);
        longPressTimeout.current = null;
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (longPressTimeout.current) {
      clearTimeout(longPressTimeout.current);
      longPressTimeout.current = null;
    }

    if (!touchStart.current) return;

    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStart.current.x;
    const dy = touch.clientY - touchStart.current.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    // eslint-disable-next-line react-hooks/purity
    const duration = Date.now() - touchStart.current.time;

    // Reset touch tracking
    touchStart.current = null;

    // If it was a long press, prevent navigation and return
    if (isLongPressActive.current) {
      e.preventDefault();
      e.stopPropagation();
      isLongPressActive.current = false;
      return;
    }

    // If moved more than 8 pixels, or touch duration is longer than 250ms,
    // count it as a drag/scroll — not a clean click tap.
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
    if (longPressTimeout.current) {
      clearTimeout(longPressTimeout.current);
      longPressTimeout.current = null;
    }
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
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      className={cn(
        'flex gap-3.5 px-4.5 py-4 transition-all duration-300 relative border-b border-border last:border-b-0 group cursor-pointer items-start',
        !notif.is_read && !selectMode
          ? 'bg-[#34D399]/[0.04] border-l-[3px] border-l-[#34D399] pl-[15px]'
          : 'border-l-[3px] border-l-transparent hover:bg-accent active:bg-accent/80'
      )}
    >
      {/* Checkbox for selection */}
      {selectMode && isDeletable && (
        <div className="flex-shrink-0 mr-1 mt-2.5">
          {isSelected ? (
            <div className="w-5 h-5 rounded-md bg-gradient-to-br from-rose-400 to-rose-600 flex items-center justify-center text-white shadow-[0_0_10px_rgba(244,63,94,0.4)] border border-rose-400/20">
              <Check className="w-3.5 h-3.5 stroke-[3.5]" />
            </div>
          ) : (
            <div className="w-5 h-5 rounded-md border border-border bg-muted/20 hover:border-slate-500 transition-colors flex items-center justify-center" />
          )}
        </div>
      )}
      
      {/* Locked icon for non-deletable items in selection mode */}
      {selectMode && !isDeletable && (
        <div className="flex-shrink-0 mr-1 mt-2.5 w-5 h-5 opacity-25 flex items-center justify-center">
          <Lock className="w-3.5 h-3.5 text-muted-foreground" />
        </div>
      )}

      {/* Styled icon badge container */}
      <div className={cn(
        'w-10 h-10 rounded-2xl flex items-center justify-center border flex-shrink-0 transition-all duration-300 shadow-sm',
        typeConfig.bg,
        !notif.is_read && 'scale-105 shadow-md shadow-[#34D399]/5'
      )}>
        <IconComponent className="w-4.5 h-4.5" />
      </div>

      <div className="min-w-0 flex-1">
        <p className={cn(
          'text-sm leading-snug truncate transition-colors duration-200',
          !notif.is_read ? 'font-extrabold text-foreground' : 'font-semibold text-muted-foreground'
        )}>
          {notif.title}
        </p>
        <p className="text-xs text-muted-foreground/80 mt-1 leading-relaxed line-clamp-2">{notif.message}</p>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-2 font-medium">
          <Clock className="w-3 h-3 text-muted-foreground" />
          <span>{timeAgo(notif.created_at)}</span>
        </div>
      </div>
      
      {/* Glowing Unread Indicator Dot */}
      {!notif.is_read && !selectMode && (
        <span className="absolute right-4 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#34D399] shadow-[0_0_8px_#34D399]" />
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

  const handleSelectToggle = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectMode((prev) => !prev);
    setSelectedIds(new Set());
  };

  const handleMarkAllRead = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    markAllRead();
  };

  const loadMoreButton = !showAll && hiddenCount > 0 ? (
    <button
      onClick={handleLoadMore}
      onTouchEnd={handleLoadMore}
      className="w-full flex items-center justify-center gap-2 px-4 py-3.5 text-[11px] font-bold text-primary uppercase tracking-wider transition-all hover:bg-primary/5 border-t border-border cursor-pointer"
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
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-border shrink-0">
        <div className="flex items-center gap-2.5">
          <Bell className="w-4 h-4 text-[#34D399]" />
          <h3 className="font-bold text-sm text-foreground">Notifications</h3>
          {unreadCount > 0 && !selectMode && (
            <span className="min-w-[20px] h-5 rounded-full bg-[#34D399]/15 border border-[#34D399]/30 text-[#34D399] text-[10px] font-black flex items-center justify-center px-1.5 animate-pulse">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {notifications.length > 0 && (
            <button
              onClick={handleSelectToggle}
              onTouchEnd={handleSelectToggle}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all duration-200 cursor-pointer shadow-sm active:scale-95",
                selectMode
                  ? "bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20"
                  : "border-border text-muted-foreground hover:text-foreground hover:bg-accent"
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
              onClick={handleMarkAllRead}
              onTouchEnd={handleMarkAllRead}
              className="flex items-center gap-1 text-[11px] font-bold text-[#34D399] hover:text-[#43fca7] transition-colors cursor-pointer px-2 py-1 rounded-lg hover:bg-[#34D399]/10 whitespace-nowrap flex-shrink-0"
            >
              <CheckCheck className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="whitespace-nowrap">Mark all read</span>
            </button>
          )}
          <button
            onClick={() => setIsOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
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
            <div className="w-14 h-14 rounded-2xl bg-muted border border-border flex items-center justify-center">
              <Bell className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-semibold text-muted-foreground">All caught up</p>
            <p className="text-xs text-muted-foreground/80">No new notifications right now.</p>
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
                onLongPress={() => {
                  setSelectMode(true);
                  setSelectedIds(new Set([notif.id]));
                }}
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
          background: 'hsl(var(--card))',
          border: '1px solid hsl(var(--border))',
          borderBottom: 'none',
          maxHeight: '72dvh',
          boxShadow: '0 -20px 60px rgba(0,0,0,0.15), 0 0 0 1px rgba(52,211,153,0.03)',
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
          <div className="flex items-center justify-between px-4 pb-3 border-b border-border">
            <div className="flex items-center gap-2.5">
              <Bell className="w-4 h-4 text-[#34D399]" />
              <h3 className="font-bold text-sm text-foreground">Notifications</h3>
              {unreadCount > 0 && !selectMode && (
                <span className="min-w-[20px] h-5 rounded-full bg-[#34D399]/15 border border-[#34D399]/30 text-[#34D399] text-[10px] font-black flex items-center justify-center px-1.5">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {notifications.length > 0 && (
                <button
                  onClick={handleSelectToggle}
                  onTouchEnd={handleSelectToggle}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all duration-200 cursor-pointer shadow-sm active:scale-95",
                    selectMode
                      ? "bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20"
                      : "border-border text-muted-foreground hover:text-foreground hover:bg-accent"
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
                  onClick={handleMarkAllRead}
                  onTouchEnd={handleMarkAllRead}
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
              <div className="w-14 h-14 rounded-2xl bg-muted border border-border flex items-center justify-center">
                <Bell className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-semibold text-muted-foreground">All caught up</p>
              <p className="text-xs text-muted-foreground/80">No new notifications right now.</p>
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
                  onLongPress={() => {
                    setSelectMode(true);
                    setSelectedIds(new Set([notif.id]));
                  }}
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
        className="relative flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 lg:w-9 lg:h-9 rounded-xl border border-border bg-card hover:bg-primary/10 hover:border-primary/35 hover:text-primary transition-all duration-300 text-muted-foreground cursor-pointer flex-shrink-0 shadow-lg shadow-black/5 dark:shadow-black/20"
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
      >
        <Bell className="w-4 h-4 transition-transform duration-300" />
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 sm:top-2.5 sm:right-2.5 lg:top-1.5 lg:right-1.5 flex h-2 w-2">
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
            background: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            boxShadow: '0 20px 50px rgba(0,0,0,0.15), 0 0 40px -10px rgba(52,211,153,0.06)',
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
