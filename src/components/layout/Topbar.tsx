'use client';

import { useState } from 'react';
import { Menu } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { NotificationBell } from '@/components/ui/NotificationBell';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { Sidebar } from '@/components/layout/Sidebar';
import { useProfile } from '@/context/ProfileContext';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

const pageTitles: Record<string, string> = {
  '/cr/dashboard': 'Dashboard',
  '/cr/announcements': 'Announcements',
  '/cr/deadlines': 'Deadlines',
  '/cr/calendar': 'Calendar',
  '/cr/results': 'Exam Results',
  '/cr/notes': 'My Notes',
  '/cr/chat': 'Class Chat',
  '/student/dashboard': 'Dashboard',
  '/student/announcements': 'Announcements',
  '/student/deadlines': 'Deadlines',
  '/student/calendar': 'Calendar',
  '/student/results': 'My Results',
  '/student/notes': 'My Notes',
  '/student/chat': 'Class Chat',
  '/student/profile': 'My Profile',
};

export function Topbar() {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const { profile } = useProfile();
  const pathname = usePathname();

  const pageTitle = pageTitles[pathname] ?? 'ClassApp';
  const profileHref =
    profile?.role === 'student' ? '/student/profile' : '#';

  return (
    <>
      <header className="h-16 border-b border-border flex items-center justify-between px-4 lg:px-6 flex-shrink-0 bg-background/80 backdrop-blur-sm sticky top-0 z-30">
        {/* Left: mobile menu + title */}
        <div className="flex items-center gap-3">
          <button
            id="mobile-menu-btn"
            onClick={() => setIsMobileSidebarOpen(true)}
            className="lg:hidden flex items-center justify-center w-9 h-9 rounded-lg border border-border hover:bg-accent transition-colors"
            aria-label="Open navigation menu"
          >
            <Menu className="w-4 h-4" />
          </button>
          <h1 className="font-semibold text-base hidden sm:block">{pageTitle}</h1>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <NotificationBell />
          {profile && (
            <Link
              href={profileHref}
              className="hover:opacity-80 transition-opacity"
              aria-label="View profile"
            >
              <UserAvatar profile={profile} size="sm" />
            </Link>
          )}
        </div>
      </header>

      {/* Mobile sidebar overlay */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-72 slide-in">
            <Sidebar
              isMobile
              onClose={() => setIsMobileSidebarOpen(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}
