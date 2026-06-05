'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Bell, X, CheckCheck, Megaphone, Clock, Trophy, MessageSquare } from 'lucide-react';
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
  announcement: {
    icon: Megaphone,
    bg: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
  },
  deadline: {
    icon: Clock,
    bg: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
  },
  result: {
    icon: Trophy,
    bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
  },
  chat: {
    icon: MessageSquare,
    bg: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
  },
  system: {
    icon: Bell,
    bg: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400',
  },
};

function getNotifHref(type: NotifType, refId: string | null, prefix: string): string {
  switch (type) {
    case 'announcement':
      return refId ? `${prefix}/announcements/${refId}` : `${prefix}/announcements`;
    case 'deadline':
      return refId ? `${prefix}/deadlines/${refId}` : `${prefix}/deadlines`;
    case 'result':
      return `${prefix}/results`;
    case 'chat':
      return `${prefix}/chat`;
    default:
      return `${prefix}/timeline`;
  }
}

export function NotificationBell() {
  const { profile } = useProfile();
  const { notifications, unreadCount, markAllRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const prefix = profile?.role === 'cr' || profile?.role === 'admin' ? '/cr' : '/student';
  const displayedNotifs = notifications.slice(0, 5);
  const remainingCount = Math.max(0, notifications.length - 5);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleBellClick() {
    setIsOpen((prev) => !prev);
    if (!isOpen && unreadCount > 0) {
      markAllRead();
    }
  }

  if (!profile?.notif_enabled) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <button
        id="notification-bell-btn"
        onClick={handleBellClick}
        className="relative flex items-center justify-center w-9 h-9 rounded-lg border border-[#141b34] bg-[#050711] hover:bg-[#141b34]/40 hover:text-white transition-all duration-200 text-slate-400 cursor-pointer"
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1 animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute right-0 top-12 w-80 rounded-2xl border border-[#141b34]/80 bg-[#0a0e1c]/95 backdrop-blur-xl z-50 overflow-hidden fade-in"
          style={{
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 0 40px -10px rgba(99, 102, 241, 0.15)',
          }}
          role="dialog"
          aria-label="Notifications"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4.5 py-3.5 border-b border-[#141b34]">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400">Notifications</h3>
            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-[10px] font-bold text-[#6366f1] hover:text-[#4f46e5] flex items-center gap-1 transition-colors cursor-pointer"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white p-1 hover:bg-slate-800/40 rounded-lg transition-colors cursor-pointer"
                aria-label="Close notifications"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
                <Bell className="w-8 h-8 opacity-20" />
                <span>No notifications yet</span>
              </div>
            ) : (
              <>
                {displayedNotifs.map((notif) => {
                  const typeConfig = notifTypeIcon[notif.type] || notifTypeIcon.system;
                  const IconComponent = typeConfig.icon;

                  return (
                    <Link
                      key={notif.id}
                      href={getNotifHref(notif.type, notif.reference_id, prefix)}
                      onClick={() => setIsOpen(false)}
                      className={cn(
                        'flex gap-3.5 p-3.5 transition-all duration-200 hover:bg-[#6366f1]/5 relative border-b border-[#141b34]/50 last:border-b-0 group',
                        !notif.is_read && 'bg-[#6366f1]/[0.03]'
                      )}
                    >
                      {/* Left: Type Icon with dynamic colors */}
                      <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center border flex-shrink-0 transition-transform group-hover:scale-105", typeConfig.bg)}>
                        <IconComponent className="w-4.5 h-4.5" />
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1 pr-4">
                        <p className="text-xs font-semibold leading-tight text-slate-100 truncate text-left">
                          {notif.title}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-1 leading-normal line-clamp-2 text-left">
                          {notif.message}
                        </p>
                        <p className="text-[9px] text-slate-500 mt-1.5 font-medium text-left">
                          {timeAgo(notif.created_at)}
                        </p>
                      </div>

                      {/* Unread indicator dot */}
                      {!notif.is_read && (
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[#6366f1] shadow-[0_0_8px_#6366f1]" />
                      )}
                    </Link>
                  );
                })}
                {remainingCount > 0 && (
                  <div className="px-4 py-3 text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider border-t border-[#141b34] bg-[#0c1228]/50">
                    + {remainingCount} more notifications
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
