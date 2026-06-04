import Link from 'next/link';
import { redirect } from 'next/navigation';
import { GraduationCap, ArrowRight, Megaphone, CalendarDays, Key, ExternalLink, Calendar, Paperclip, FileText, Image as ImageIcon } from 'lucide-react';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { formatDateTime, formatDate, getEventTypeColor, formatEventType } from '@/lib/utils/formatters';

export const revalidate = 0; // force dynamic rendering

export default async function RootPage() {
  const supabase = await getSupabaseServerClient();
  
  // Try to retrieve logged-in user session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If user is authenticated, redirect them to dashboard
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role === 'cr' || profile?.role === 'admin') {
      redirect('/cr/dashboard');
    } else {
      redirect('/student/dashboard');
    }
  }

  // If visitor is unauthenticated, fetch public notices & calendar events
  const [publicNoticesRes, publicEventsRes] = await Promise.all([
    supabase
      .from('announcements')
      .select('*, creator:profiles(full_name)')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(6),
    supabase
      .from('calendar_events')
      .select('*')
      .eq('is_public', true)
      .order('event_date', { ascending: true })
      .limit(6),
  ]);

  const publicNotices = publicNoticesRes.data || [];
  const publicEvents = publicEventsRes.data || [];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col relative overflow-hidden">
      {/* Decorative Gradients */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle 800px at 50% -200px, hsl(220 91% 58% / 0.15), transparent)',
        }}
      />
      <div className="absolute top-1/3 -left-48 w-96 h-96 rounded-full opacity-10 blur-3xl pointer-events-none bg-primary" />
      <div className="absolute bottom-1/3 -right-48 w-96 h-96 rounded-full opacity-10 blur-3xl pointer-events-none bg-purple-600" />

      {/* Top Navbar */}
      <header className="h-16 border-b border-border/80 flex items-center justify-between px-6 lg:px-12 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center w-8 h-8 rounded-lg"
            style={{
              background: 'linear-gradient(135deg, hsl(220 91% 58%), hsl(260 80% 60%))',
            }}
          >
            <GraduationCap className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg gradient-text">ClassApp</span>
        </div>

        <Link
          href="/login"
          className="btn-primary py-2 px-4 text-xs font-bold rounded-lg flex items-center gap-2"
        >
          <Key className="w-3.5 h-3.5" />
          Sign In
        </Link>
      </header>

      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center text-center py-20 px-6 max-w-4xl mx-auto w-full">
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight">
          Welcome to <span className="gradient-text">ClassApp</span>
        </h1>
        <p className="mt-4 text-base md:text-xl text-muted-foreground max-w-2xl leading-relaxed">
          The central academic management and collaboration dashboard for our class. Sign in to check your personal grades, notes, ask timeline questions, and chat with classmates.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Link href="/login" className="btn-primary py-3 px-6 text-sm font-semibold rounded-xl flex items-center gap-2">
            Go to Student Dashboard
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Public Dashboard Feed */}
      <section className="flex-1 max-w-7xl mx-auto w-full px-6 lg:px-12 pb-20 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Public Announcements (2 cols) */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <h2 className="text-xl font-extrabold flex items-center gap-2 text-foreground">
            <Megaphone className="w-5 h-5 text-primary" />
            Public Announcements
          </h2>

          {publicNotices.length === 0 ? (
            <div className="glass-card p-12 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
              <Megaphone className="w-8 h-8 opacity-25" />
              <span>No public announcements posted at this time.</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {publicNotices.map((notice) => (
                <div key={notice.id} className="announcement-card flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <span className="text-[10px] text-muted-foreground">
                        Published: {formatDate(notice.created_at)}
                      </span>
                      <span className="badge badge-public text-[9px]">Public</span>
                    </div>
                    <h3 className="text-base font-bold text-foreground mb-1 leading-snug">
                      {notice.title}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-4 whitespace-pre-line">
                      {notice.body}
                    </p>
                  </div>

                  {notice.attachment_url && (
                    <div className="mt-4 pt-3 border-t border-border/50">
                      <a
                        href={notice.attachment_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[10px] font-semibold text-primary hover:underline"
                      >
                        {notice.attachment_type === 'image' ? (
                          <ImageIcon className="w-3.5 h-3.5" />
                        ) : (
                          <FileText className="w-3.5 h-3.5" />
                        )}
                        <span>View Public Attachment</span>
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Public Calendar Events (1 col) */}
        <div className="flex flex-col gap-4">
          <h2 className="text-xl font-extrabold flex items-center gap-2 text-foreground">
            <CalendarDays className="w-5 h-5 text-amber-500" />
            Public Calendar
          </h2>

          {publicEvents.length === 0 ? (
            <div className="glass-card p-12 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
              <CalendarDays className="w-8 h-8 opacity-25" />
              <span>No public events scheduled.</span>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {publicEvents.map((event) => {
                const color = getEventTypeColor(event.event_type);
                return (
                  <div key={event.id} className="glass-card p-4 flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-3">
                      <span className={`badge px-2 py-0.5 text-[9px] font-bold border uppercase tracking-wider ${color}`}>
                        {formatEventType(event.event_type)}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatDate(event.event_date)}
                      </span>
                    </div>
                    <h3 className="text-xs font-bold text-foreground leading-tight">
                      {event.title}
                    </h3>
                    {event.description && (
                      <p className="text-[10px] text-muted-foreground line-clamp-2">
                        {event.description}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </section>

      {/* Footer */}
      <footer className="border-t border-border/80 text-center py-6 text-xs text-muted-foreground">
        &copy; {new Date().getFullYear()} ClassApp. All rights reserved.
      </footer>
    </div>
  );
}
