'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { overlayStack } from '@/lib/utils/overlayStack';

import { Menu, X, LogOut, Bell, GraduationCap, User, Shield } from 'lucide-react';
import { useProfile } from '@/context/ProfileContext';
import { getInitials } from '@/lib/utils/formatters';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { clearTenantCookies } from '@/lib/actions/auth-tenant';
import { NotificationBell } from '@/components/ui/NotificationBell';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

export function Header() {
  const pathname = usePathname();

  const { profile } = useProfile();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const [swipeTranslation, setSwipeTranslation] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    setIsSwiping(false);
    setSwipeTranslation(0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.touches[0];
    const deltaX = touchStartRef.current.x - touch.clientX;
    const deltaY = touchStartRef.current.y - touch.clientY;

    if (deltaX > 0) {
      if (!isSwiping && Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
        setIsSwiping(true);
      }
      if (isSwiping) {
        if (e.cancelable) e.preventDefault();
        setSwipeTranslation(deltaX);
      }
    }
  };

  const handleTouchEnd = () => {
    if (isSwiping) {
      if (swipeTranslation > 80) {
        setIsMobileMenuOpen(false);
      }
    }
    touchStartRef.current = null;
    setIsSwiping(false);
    setSwipeTranslation(0);
  };

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile menu on edge swipe gesture
  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const closeFn = () => setIsMobileMenuOpen(false);
    overlayStack.push(closeFn);
    return () => overlayStack.pop(closeFn);
  }, [isMobileMenuOpen]);

  const isCR = profile?.role === 'cr' || profile?.role === 'admin';
  const prefix = isCR ? '/cr' : '/student';

  const handleProfileClick = () => {
    setIsUserMenuOpen((prev) => !prev);
  };

  const navItems = [
    { href: `${prefix}/timeline`, label: 'Timeline' },
    { href: `${prefix}/deadlines`, label: 'Deadlines' },
    { href: `${prefix}/announcements`, label: 'Announcements' },
    { href: `${prefix}/results`, label: 'Results' },
    { href: `${prefix}/notes`, label: 'Resources' },
  ];

  async function handleSignOut() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    // BUG-02/BUG-07 fix: use server action to clear both tenant cookies (one is httpOnly)
    await clearTenantCookies();
    localStorage.removeItem('tenant_class_name');
    window.location.href = '/login';
  }


  const initials = profile ? getInitials(profile.full_name) : 'U';

  return (
    <>
      <header className="w-full border-b border-border/90 bg-card/40 backdrop-blur-md flex-shrink-0 z-40 sticky top-0 pt-[env(safe-area-inset-top,0px)]">
      <div className="w-full h-16 flex items-center justify-between px-3 sm:px-4 lg:px-8">

        {/* Left section: Logo + badge */}
        <div className="flex items-center gap-2.5 sm:gap-4">
          {/* Mobile menu trigger */}
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="lg:hidden flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-xl text-muted-foreground hover:text-foreground transition-colors cursor-pointer active:bg-accent flex-shrink-0"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Logo — tapping goes to the landing page (middleware allows internal nav) */}
          <Link href="/" prefetch={false} className="flex items-center gap-2 sm:gap-2.5 touch-compact flex-shrink-0">
            <div
              className="flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0"
              style={{
                background: 'linear-gradient(135deg, hsl(160 84% 45%), hsl(170 80% 38%))',
              }}
            >
              <GraduationCap className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
              Class<span className="text-[#34D399]">App</span>
            </span>
          </Link>


        </div>

        {/* Right section containing Nav links + Notifications + Avatar */}
        <div className="flex items-center gap-6 lg:gap-8 h-full">
          {/* Navigation links */}
          <nav className="hidden lg:flex items-center gap-7 h-full">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative flex items-center h-full text-sm font-semibold transition-all px-1 cursor-pointer ${isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                  {item.label}
                  {isActive && (
                    <span className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-[#34D399] rounded-full" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Bell notification + Avatar */}
          <div className="flex items-center gap-2.5 sm:gap-4">
            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Notification Bell */}
            <NotificationBell />

            {/* Profile initials avatar */}
            {profile && (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={handleProfileClick}
                  className="w-10 h-10 sm:w-11 sm:h-11 lg:w-9 lg:h-9 rounded-full text-foreground flex items-center justify-center text-sm lg:text-xs font-bold border border-border transition-transform hover:scale-105 cursor-pointer flex-shrink-0 overflow-hidden"
                  style={{
                    background: '#4A5B66',
                  }}
                  aria-label="User profile menu"
                >
                  {profile.profile_pic_url ? (
                    <img
                      src={profile.profile_pic_url}
                      alt={profile.full_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    initials
                  )}
                </button>

                {/* Simple dropdown menu on click */}
                {isUserMenuOpen && (
                  <div
                    className="absolute right-0 top-full mt-2 w-56 rounded-2xl p-2 z-50 animate-fade-in"
                    style={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      backdropFilter: 'blur(12px)',
                      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.15), 0 0 20px rgba(52,211,153,0.04)',
                    }}
                  >
                    {/* User Details */}
                    <div className="px-3.5 py-2.5 border-b border-border/85 mb-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-black text-foreground truncate">{profile.full_name}</p>
                        {isCR && (
                          <span className="flex items-center gap-0.5 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-600 dark:text-emerald-300">
                            <Shield className="w-2 h-2" />
                            {profile.role}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate mt-0.5">{profile.email}</p>
                    </div>

                    {/* Navigation Items */}
                    <Link
                      href={`${prefix}/profile`}
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-accent rounded-xl transition-all"
                    >
                      <User className="w-3.5 h-3.5 text-emerald-500" />
                      My Profile
                    </Link>

                    {/* Divider */}
                    <div className="h-[1px] bg-border/85 my-1" />

                    {/* Sign Out Button */}
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        handleSignOut();
                      }}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 dark:hover:bg-rose-500/15 rounded-xl transition-all cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>

      {/* Mobile Drawer Slide-out navigation menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-background/85 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
            style={{
              opacity: isSwiping ? Math.max(0, 1 - swipeTranslation / 220) : undefined,
              transition: isSwiping ? 'none' : 'opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          />

          {/* Menu Drawer */}
          <div
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{
              transform: isSwiping ? `translateX(-${swipeTranslation}px)` : undefined,
              transition: isSwiping ? 'none' : 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            className="absolute left-0 top-0 bottom-0 w-64 bg-card border-r border-border p-5 pt-[calc(1.25rem+env(safe-area-inset-top,0px))] pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] flex flex-col justify-between slide-in-left-animation"
          >
            <style jsx>{`
              .slide-in-left-animation {
                animation: slideInLeft 0.25s cubic-bezier(0.16, 1, 0.3, 1);
              }
              @keyframes slideInLeft {
                from { transform: translateX(-100%); }
                to { transform: translateX(0); }
              }
            `}</style>

            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border pb-4">
                {/* Mobile drawer logo → landing page (marketing) */}
                <Link
                  href="/"
                  prefetch={false}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 text-lg font-bold text-foreground cursor-pointer"
                >
                  <div
                    className="flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0"
                    style={{
                      background: 'linear-gradient(135deg, hsl(160 84% 45%), hsl(170 80% 38%))',
                    }}
                  >
                    <GraduationCap className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span>
                    Class<span className="text-[#34D399]">App</span>
                  </span>
                </Link>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Navigation Items */}
              <div className="flex flex-col gap-2">
                {navItems.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-all border cursor-pointer ${isActive
                        ? 'bg-zinc-100 dark:bg-zinc-800/60 text-zinc-900 dark:text-white border-zinc-200 dark:border-zinc-800'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent border-transparent'
                        }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Footer with manual + signout */}
            <div className="border-t border-border pt-4 flex flex-col gap-1">
              <button
                onClick={handleSignOut}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm font-semibold text-rose-600 dark:text-rose-450 hover:bg-rose-500/10 dark:hover:bg-rose-500/15 rounded-lg transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
