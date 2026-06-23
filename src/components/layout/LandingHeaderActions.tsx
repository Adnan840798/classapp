'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { User, LogOut, Shield } from 'lucide-react';
import { getInitials } from '@/lib/utils/formatters';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

interface Profile {
  role: string;
  full_name: string;
  email: string;
  profile_pic_url?: string | null;
}

interface LandingHeaderActionsProps {
  profile: Profile | null;
  dashboardUrl: string;
}

export function LandingHeaderActions({ profile, dashboardUrl }: LandingHeaderActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  async function handleSignOut() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    // Wipe tenant routing cookies
    document.cookie = 'tenant_supabase_url=; Max-Age=0; path=/;';
    document.cookie = 'tenant_supabase_anon_key=; Max-Age=0; path=/;';
    localStorage.removeItem('tenant_class_name');
    window.location.href = '/login';
  }

  if (!profile) {
    return (
      <Link
        href="/login"
        className="text-xs sm:text-sm font-semibold bg-muted/45 hover:bg-muted/80 border border-border text-muted-foreground hover:text-foreground px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl transition-all"
      >
        Sign In
      </Link>
    );
  }

  const isCROrAdmin = profile.role === 'cr' || profile.role === 'admin';
  const prefix = isCROrAdmin ? '/cr' : '/student';
  const initials = getInitials(profile.full_name);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-11 h-11 lg:w-8 lg:h-8 rounded-full text-white flex items-center justify-center text-sm lg:text-xs font-bold border border-white/[0.08] transition-transform hover:scale-105 cursor-pointer flex-shrink-0 overflow-hidden"
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

      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-56 rounded-2xl p-2 z-50 animate-fade-in bg-card/95 border border-border text-foreground backdrop-blur-md shadow-lg"
        >
          {/* User Details */}
          <div className="px-3.5 py-2.5 border-b border-border mb-1.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-black text-foreground truncate">{profile.full_name}</p>
              {isCROrAdmin && (
                <span className="flex items-center gap-0.5 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/25 dark:border-emerald-500/40 text-emerald-600 dark:text-emerald-300">
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
            onClick={() => setIsOpen(false)}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-emerald-500/10 rounded-xl transition-all"
          >
            <User className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
            My Profile
          </Link>

          {/* Divider */}
          <div className="h-[1px] bg-border my-1" />

          {/* Sign Out Button */}
          <button
            onClick={() => {
              setIsOpen(false);
              handleSignOut();
            }}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-bold text-rose-500 dark:text-rose-400 hover:bg-rose-500/10 dark:hover:bg-rose-500/15 rounded-xl transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
