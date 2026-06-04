import { getSupabaseServerClient } from '@/lib/supabase/server';
import Link from 'next/link';
import {
  Megaphone,
  Clock,
  Bell,
  Plus,
  MessageSquare,
  HelpCircle,
  TrendingUp,
  CalendarDays,
} from 'lucide-react';
import { formatDate, timeAgo } from '@/lib/utils/formatters';
import { Announcement, Deadline, Notification } from '@/types';
import { DASHBOARD_LIMITS } from '@/lib/constants';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard — ClassApp CR',
};

export default async function CRDashboardPage() {
  const supabase = await getSupabaseServerClient();

  // Parallel queries — Rule 2: all fired simultaneously
  const [
    { data: announcements },
    { data: deadlines },
    { count: unreadNotifications },
    { count: pendingQuestions },
  ] = await Promise.all([
    supabase
      .from('announcements')
      .select('id, title, body, is_important, is_public, created_at')
      .order('created_at', { ascending: false })
      .limit(DASHBOARD_LIMITS.RECENT_ANNOUNCEMENTS),
    supabase
      .from('deadlines')
      .select('id, title, subject, due_date')
      .gte('due_date', new Date().toISOString())
      .order('due_date', { ascending: true })
      .limit(DASHBOARD_LIMITS.UPCOMING_DEADLINES),
    supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true }),
    supabase
      .from('timeline_questions')
      .select('*', { count: 'exact', head: true })
      .eq('is_resolved', false),
  ]);

  return (
    <div className="fade-in space-y-6">
      {/* Welcome header */}
      <div className="page-header">
        <h1 className="page-title">CR Dashboard</h1>
        <p className="page-subtitle">
          Manage your class — announcements, deadlines, and more.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Announcements
            </span>
            <Megaphone className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-3xl font-bold mt-2">
            {announcements?.length ?? 0}
          </p>
          <p className="text-xs text-muted-foreground">recent</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Upcoming
            </span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-3xl font-bold mt-2">
            {deadlines?.length ?? 0}
          </p>
          <p className="text-xs text-muted-foreground">deadlines</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Pending Q&A
            </span>
            <HelpCircle className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-3xl font-bold mt-2">
            {pendingQuestions ?? 0}
          </p>
          <p className="text-xs text-muted-foreground">unanswered</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Notifications
            </span>
            <Bell className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-3xl font-bold mt-2">
            {unreadNotifications ?? 0}
          </p>
          <p className="text-xs text-muted-foreground">sent total</p>
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { href: '/cr/announcements/new', icon: Megaphone, label: 'New Announcement', color: 'hsl(220 91% 58%)' },
            { href: '/cr/deadlines/new', icon: Clock, label: 'Add Deadline', color: 'hsl(38 92% 50%)' },
            { href: '/cr/calendar/new', icon: CalendarDays, label: 'Add Event', color: 'hsl(272 76% 60%)' },
            { href: '/cr/results/publish', icon: TrendingUp, label: 'Publish Result', color: 'hsl(142 76% 44%)' },
          ].map(({ href, icon: Icon, label, color }) => (
            <Link
              key={href}
              href={href}
              className="glass-card p-4 flex flex-col items-center gap-2 text-center transition-all duration-200 hover:-translate-y-1 hover:shadow-lg group"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-110"
                style={{ background: `${color}20`, border: `1px solid ${color}30` }}
              >
                <Icon className="w-5 h-5" style={{ color }} />
              </div>
              <span className="text-xs font-medium">{label}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Announcements */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Recent Announcements</h2>
            <Link
              href="/cr/announcements"
              className="text-xs text-primary hover:text-primary/80 transition-colors"
            >
              View all →
            </Link>
          </div>
          <div className="space-y-3">
            {announcements && announcements.length > 0 ? (
              announcements.map((ann) => (
                <div
                  key={ann.id}
                  className="flex flex-col gap-0.5 py-2 border-b border-border last:border-0"
                >
                  <div className="flex items-start gap-2">
                    <span className="font-medium text-sm flex-1 leading-tight">
                      {ann.title}
                    </span>
                    {ann.is_important && (
                      <span className="badge badge-important flex-shrink-0">
                        Important
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {timeAgo(ann.created_at)}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No announcements yet.{' '}
                <Link href="/cr/announcements/new" className="text-primary hover:underline">
                  Create one
                </Link>
              </p>
            )}
          </div>
        </div>

        {/* Upcoming Deadlines */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Upcoming Deadlines</h2>
            <Link
              href="/cr/deadlines"
              className="text-xs text-primary hover:text-primary/80 transition-colors"
            >
              View all →
            </Link>
          </div>
          <div className="space-y-3">
            {deadlines && deadlines.length > 0 ? (
              deadlines.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between py-2 border-b border-border last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium">{d.title}</p>
                    <p className="text-xs text-muted-foreground">{d.subject}</p>
                  </div>
                  <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                    {formatDate(d.due_date)}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No upcoming deadlines.{' '}
                <Link href="/cr/deadlines/new" className="text-primary hover:underline">
                  Add one
                </Link>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
