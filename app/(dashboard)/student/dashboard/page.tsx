import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Megaphone, Clock, CalendarDays, BookOpen, AlertCircle, Award } from 'lucide-react';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { formatDate, formatDateTime, timeAgo } from '@/lib/utils/formatters';
import { enrichDeadlines, getDeadlineColorClass, formatDaysRemaining } from '@/lib/utils/deadlinePriority';

export const revalidate = 0; // force dynamic rendering

export default async function StudentDashboardPage() {
  const supabase = await getSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Load all dashboard components in parallel
  const [
    announcementsRes,
    deadlinesRes,
    notificationsRes,
    resultsRes
  ] = await Promise.all([
    supabase
      .from('announcements')
      .select('*, creator:profiles!created_by(full_name, profile_pic_url)')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('deadlines')
      .select('*')
      .order('due_date', { ascending: true })
      .limit(10),
    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false),
    supabase
      .from('exam_results')
      .select('id')
      .eq('student_id', user.id)
  ]);

  const announcements = announcementsRes.data || [];
  const deadlines = deadlinesRes.data || [];
  const unreadNotifCount = notificationsRes.count || 0;
  const publishedResultsCount = resultsRes.data?.length || 0;

  const enrichedDeadlines = enrichDeadlines(deadlines);

  return (
    <div className="flex flex-col gap-8 max-w-6xl mx-auto w-full animate-fade-in">
      {/* Page Header */}
      <div className="page-header mb-0">
        <h1 className="page-title gradient-text text-3xl font-extrabold">Student Dashboard</h1>
        <p className="page-subtitle">Welcome back! Here is a summary of your academic updates.</p>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-muted-foreground">Unread Alerts</span>
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Megaphone className="w-4 h-4" />
            </div>
          </div>
          <span className="text-3xl font-extrabold text-foreground mt-2">{unreadNotifCount}</span>
          <span className="text-xs text-muted-foreground mt-1">Pending notifications</span>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-muted-foreground">Active Deadlines</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <span className="text-3xl font-extrabold text-foreground mt-2">{enrichedDeadlines.length}</span>
          <span className="text-xs text-muted-foreground mt-1">Assignments / Submissions</span>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-muted-foreground">Exam Results</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <span className="text-3xl font-extrabold text-foreground mt-2">{publishedResultsCount}</span>
          <span className="text-xs text-muted-foreground mt-1">Published grades</span>
        </div>

        <Link href="/student/notes" className="stat-card hover:border-primary/50 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-muted-foreground">My Notes</span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <span className="text-xs font-semibold text-primary mt-4 flex items-center gap-1">
            Access My Notebook →
          </span>
        </Link>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column: Announcements */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-primary" />
              Latest Announcements
            </h2>
            <Link href="/student/announcements" className="text-xs text-primary hover:underline font-semibold">
              View All
            </Link>
          </div>

          {announcements.length === 0 ? (
            <div className="glass-card p-8 text-center text-sm text-muted-foreground">
              No recent announcements.
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {announcements.map((announcement) => (
                <div
                  key={announcement.id}
                  className={`announcement-card ${announcement.is_important ? 'important' : ''}`}
                >
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <span className="text-[10px] text-muted-foreground">
                      By {announcement.creator?.full_name || 'CR'} · {timeAgo(announcement.created_at)}
                    </span>
                    {announcement.is_important && (
                      <span className="badge badge-important text-[10px]">Important</span>
                    )}
                  </div>
                  <h3 className="font-bold text-sm text-foreground mb-1">{announcement.title}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {announcement.body}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right column: Deadlines */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              Upcoming Deadlines
            </h2>
            <Link href="/student/deadlines" className="text-xs text-primary hover:underline font-semibold">
              View All
            </Link>
          </div>

          {enrichedDeadlines.length === 0 ? (
            <div className="glass-card p-8 text-center text-sm text-muted-foreground">
              No upcoming deadlines.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {enrichedDeadlines.map((deadline) => {
                const colorClass = getDeadlineColorClass(deadline.color);
                return (
                  <div key={deadline.id} className="glass-card p-4 flex flex-col gap-2 hover:scale-[1.01] transition-transform">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase truncate max-w-[120px]">
                        {deadline.subject}
                      </span>
                      <span className={`badge px-2 py-0.5 text-[10px] border ${colorClass}`}>
                        {formatDaysRemaining(deadline.daysRemaining)}
                      </span>
                    </div>
                    <h3 className="font-bold text-xs text-foreground leading-tight">{deadline.title}</h3>
                    <span className="text-[10px] text-muted-foreground mt-0.5">
                      Due: {formatDate(deadline.due_date)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
