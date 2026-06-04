'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  GraduationCap,
  LayoutDashboard,
  Megaphone,
  CalendarDays,
  Clock,
  MessageSquare,
  FileText,
  Trophy,
  User,
  LogOut,
  ChevronLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProfile } from '@/context/ProfileContext';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { UserAvatar } from '@/components/ui/UserAvatar';

const crNavItems = [
  { href: '/cr/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/cr/announcements', label: 'Announcements', icon: Megaphone },
  { href: '/cr/deadlines', label: 'Deadlines', icon: Clock },
  { href: '/cr/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/cr/results', label: 'Results', icon: Trophy },
  { href: '/cr/chat', label: 'Chat', icon: MessageSquare },
];

const studentNavItems = [
  { href: '/student/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/student/announcements', label: 'Announcements', icon: Megaphone },
  { href: '/student/deadlines', label: 'Deadlines', icon: Clock },
  { href: '/student/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/student/results', label: 'My Results', icon: Trophy },
  { href: '/student/notes', label: 'Notes', icon: FileText },
  { href: '/student/chat', label: 'Chat', icon: MessageSquare },
  { href: '/student/profile', label: 'Profile', icon: User },
];

interface SidebarProps {
  onClose?: () => void;
  isMobile?: boolean;
}

export function Sidebar({ onClose, isMobile }: SidebarProps) {
  const pathname = usePathname();
  const { profile } = useProfile();
  const router = useRouter();

  const isCR = profile?.role === 'cr' || profile?.role === 'admin';
  const navItems = isCR ? crNavItems : studentNavItems;

  async function handleSignOut() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <aside
      className="flex h-full flex-col"
      style={{
        background: 'hsl(var(--sidebar-bg))',
        borderRight: '1px solid hsl(var(--border))',
        width: isMobile ? '100%' : 'var(--sidebar-width, 260px)',
      }}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-5 border-b border-border flex-shrink-0">
        <div
          className="flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0"
          style={{
            background: 'linear-gradient(135deg, hsl(220 91% 58%), hsl(260 80% 60%))',
          }}
        >
          <GraduationCap className="w-4 h-4 text-white" />
        </div>
        <span className="font-bold text-lg gradient-text">ClassApp</span>
        {isMobile && (
          <button
            onClick={onClose}
            className="ml-auto p-1.5 rounded-lg hover:bg-accent transition-colors"
            aria-label="Close sidebar"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Role badge */}
      <div className="px-4 py-3 border-b border-border">
        <span
          className="text-xs font-semibold px-2 py-1 rounded-full"
          style={{
            background: isCR
              ? 'hsl(220 91% 58% / 0.15)'
              : 'hsl(142 76% 36% / 0.15)',
            color: isCR ? 'hsl(220 91% 65%)' : 'hsl(142 76% 44%)',
          }}
        >
          {profile?.role?.toUpperCase() ?? 'STUDENT'}
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== '/cr/dashboard' &&
              item.href !== '/student/dashboard' &&
              pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn('nav-item', isActive && 'active')}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-border p-3 flex-shrink-0">
        {profile && (
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg mb-1">
            <UserAvatar profile={profile} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{profile.full_name}</p>
              <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
            </div>
          </div>
        )}
        <button
          onClick={handleSignOut}
          className="nav-item w-full text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
