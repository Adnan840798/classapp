'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Menu, X, LogOut, Bell } from 'lucide-react';
import { useProfile } from '@/context/ProfileContext';
import { getInitials } from '@/lib/utils/formatters';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { NotificationBell } from '@/components/ui/NotificationBell';

export function Header() {
  const pathname = usePathname();

  const { profile } = useProfile();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isCR = profile?.role === 'cr' || profile?.role === 'admin';
  const prefix = isCR ? '/cr' : '/student';

  const navItems = [
    { href: `${prefix}/timeline`, label: 'Timeline' },
    { href: `${prefix}/deadlines`, label: 'Deadlines' },
    { href: `${prefix}/announcements`, label: 'Announcements' },
    { href: `${prefix}/results`, label: 'Results' },
  ];

  // Additional student specific links
  if (!isCR) {
    navItems.push({ href: `${prefix}/notes`, label: 'Notes' });
  }
  navItems.push({ href: `${prefix}/chat`, label: 'Chat' });

  async function handleSignOut() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    window.location.href = '/login';
  }


  const initials = profile ? getInitials(profile.full_name) : 'U';

  return (
    <header className="w-full h-16 border-b border-[#141b34] bg-[#050711] flex items-center justify-between px-4 lg:px-8 flex-shrink-0 z-40 sticky top-0">
      
      {/* Left section: Logo + badge */}
      <div className="flex items-center gap-4">
        {/* Mobile menu trigger */}
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="lg:hidden flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Logo */}
        <Link href={`${prefix}/timeline`} className="flex items-center gap-2">
          <span className="text-xl font-bold tracking-tight text-white">
            Class<span className="text-[#6366f1]">App</span>
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
                className={`relative flex items-center h-full text-sm font-semibold transition-all px-1 cursor-pointer ${
                  isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {item.label}
                {isActive && (
                  <span className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-[#6366f1] rounded-full" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bell notification + Avatar */}
        <div className="flex items-center gap-4">
          {/* Notification Bell */}
          <NotificationBell />

          {/* Profile initials avatar */}
          {profile && (
            <div className="relative group">
              <button
                className="w-8 h-8 rounded-full bg-[#6366f1] text-white flex items-center justify-center text-xs font-bold border border-[#6366f1]/20 transition-transform hover:scale-105 cursor-pointer"
                aria-label="User profile menu"
              >
                {initials}
              </button>
              
              {/* Simple dropdown menu on hover with before pseudo-element bridge to prevent hover loss */}
              <div className="absolute right-0 top-full mt-2 w-48 bg-[#0a0e1c] border border-[#141b34] rounded-xl shadow-2xl p-2 hidden group-hover:block z-50 before:content-[''] before:absolute before:top-[-12px] before:left-0 before:right-0 before:h-[12px]">
                <div className="px-3 py-2 border-b border-[#141b34] mb-1">
                  <p className="text-xs font-bold text-white truncate">{profile.full_name}</p>
                  <p className="text-[10px] text-slate-500 truncate mt-0.5">{profile.email}</p>
                </div>
                <Link
                  href={`${prefix}/profile`}
                  className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800/40 rounded-lg transition-colors"
                >
                  My Profile
                </Link>
                <button
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Drawer Slide-out navigation menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-[#04060f]/80 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          
          {/* Menu Drawer */}
          <div className="absolute left-0 top-0 bottom-0 w-64 bg-[#0a0e1c] border-r border-[#141b34] p-5 flex flex-col justify-between slide-in-left-animation">
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
              <div className="flex items-center justify-between border-b border-[#141b34] pb-4">
                <span className="text-lg font-bold text-white">
                  Class<span className="text-[#6366f1]">App</span>
                </span>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
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
                      className={`px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                        isActive
                          ? 'bg-[#6366f1]/10 text-white border border-[#6366f1]/20'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Footer with signout */}
            <div className="border-t border-[#141b34] pt-4">
              <button
                onClick={handleSignOut}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
