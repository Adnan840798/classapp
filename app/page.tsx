import Link from 'next/link';
import {
  GraduationCap,
  ArrowRight,
  CalendarDays,
  Bell,
  BookMarked,
  Users,
  Award,
  MessageSquare,
  Send,
  Smartphone,
  CheckCircle2,
  Mail,
  BookOpen,
  ShieldCheck,
} from 'lucide-react';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { LandingHeaderActions } from '@/components/layout/LandingHeaderActions';

export const revalidate = 0;

const FEATURES = [
  {
    icon: CalendarDays,
    color: 'hsl(160 84% 45%)',
    bg: 'rgba(52,211,153,0.08)',
    border: 'rgba(52,211,153,0.2)',
    title: 'Live Class Timeline',
    desc: 'Real-time daily schedule with instant updates when anything changes.',
  },
  {
    icon: Bell,
    color: 'hsl(38 90% 55%)',
    bg: 'rgba(245,158,11,0.08)',
    border: 'rgba(245,158,11,0.2)',
    title: 'Smart Deadline Alerts',
    desc: 'Automatic push notifications as assignment and exam deadlines approach.',
  },
  {
    icon: MessageSquare,
    color: 'hsl(280 70% 60%)',
    bg: 'rgba(139,92,246,0.08)',
    border: 'rgba(139,92,246,0.2)',
    title: 'Announcements & Telegram',
    desc: 'Instant class announcements mirrored to your Telegram channel automatically.',
  },
  {
    icon: BookMarked,
    color: 'hsl(210 80% 60%)',
    bg: 'rgba(59,130,246,0.08)',
    border: 'rgba(59,130,246,0.2)',
    title: 'Course Resource Library',
    desc: 'All lecture slides, lab sheets, and past papers — organized and always accessible.',
  },
  {
    icon: Award,
    color: 'hsl(340 80% 58%)',
    bg: 'rgba(244,63,94,0.08)',
    border: 'rgba(244,63,94,0.2)',
    title: 'Results & Grade Publishing',
    desc: 'CRs publish marks with class averages. Students see results the moment they\'re live.',
  },
  {
    icon: Users,
    color: 'hsl(190 75% 50%)',
    bg: 'rgba(6,182,212,0.08)',
    border: 'rgba(6,182,212,0.2)',
    title: 'Full Student Management',
    desc: 'CRs create, verify, and manage student accounts. Roles update in real time.',
  },
];

const WHAT_YOU_GET = [
  'A private, fully managed platform for your class',
  'Android APK installable on every student\'s phone',
  'Push notifications via app and Telegram',
  'Lifetime updates and ongoing support',
  'Complete setup handled for you',
];

export default async function RootPage() {
  const supabase = await getSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let dashboardUrl = '/login';
  let dashboardText = 'Sign In';
  let profile: any = null;

  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('role, full_name, email, profile_pic_url')
      .eq('id', user.id)
      .maybeSingle();

    profile = data;

    if (profile) {
      const role = profile.role as string;
      dashboardUrl = role === 'cr' || role === 'admin' ? '/cr/timeline' : '/student/timeline';
      dashboardText = 'Go to Dashboard';
    } else {
      // User is authenticated (valid JWT) but profile row not found.
      // Could be a tenant cookie mismatch. Show a generic fallback.
      // The middleware will validate the real session when they navigate.
      dashboardUrl = '/student/timeline';
      dashboardText = 'Go to Dashboard';
    }
  }

  const CONTACT_EMAIL = 'adnanislam840798@gmail.com';
  const SUBJECT = encodeURIComponent('ClassApp — Request for Class Access');
  const BODY = encodeURIComponent(
    `Hi,\n\nI'm interested in getting ClassApp set up for my class.\n\nClass / Institution: \nNumber of Students: \nTelegram Group: \n\nPlease let me know the next steps.\n\nThank you.`
  );
  const mailtoHref = `mailto:${CONTACT_EMAIL}?subject=${SUBJECT}&body=${BODY}`;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col relative overflow-x-hidden">

      {/* Decorative Gradients */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle 900px at 50% -250px, hsl(220 91% 58% / 0.12), transparent)',
        }}
      />
      <div className="absolute top-1/4 -left-64 w-[500px] h-[500px] rounded-full opacity-[0.06] blur-3xl pointer-events-none bg-primary" />
      <div className="absolute bottom-1/3 -right-64 w-[500px] h-[500px] rounded-full opacity-[0.06] blur-3xl pointer-events-none bg-emerald-600" />

      {/* ── Navbar ─────────────────────────────────────── */}
      <header className="h-16 border-b border-border/60 flex items-center justify-between px-6 lg:px-14 backdrop-blur-md sticky top-0 z-50 bg-background/70">
        <Link href="/" className="flex items-center gap-3">
          <div
            className="flex items-center justify-center w-8 h-8 rounded-lg"
            style={{ background: 'linear-gradient(135deg, hsl(160 84% 45%), hsl(170 80% 38%))' }}
          >
            <GraduationCap className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg text-white">
            Class<span className="text-[#34D399]">App</span>
          </span>
        </Link>
        <div className="flex items-center gap-4">
          <LandingHeaderActions profile={profile} dashboardUrl={dashboardUrl} />
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="flex flex-col items-center justify-center text-center py-14 sm:py-20 md:py-24 px-5 max-w-4xl mx-auto w-full">

        <h1 className="text-3xl sm:text-4xl md:text-6xl font-extrabold tracking-tight leading-tight text-white">
          Everything your class needs.{' '}
          <span
            style={{
              background: 'linear-gradient(90deg, #34D399, #60A5FA)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            In one place.
          </span>
        </h1>
        <p className="mt-4 sm:mt-5 text-sm sm:text-base md:text-lg text-slate-400 max-w-2xl leading-relaxed px-2">
          A private academic management portal built for university classes and giving
          students real-time access to their schedule, deadlines, results, announcements and more.
        </p>
        <div className="mt-8 sm:mt-10 flex flex-col items-center gap-3 sm:gap-4 w-full max-w-xs mx-auto">
          <Link
            href={dashboardUrl}
            className="w-full flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-2xl text-sm font-bold text-[#0a0c0e] transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, #34D399 0%, #059669 100%)',
              boxShadow: '0 0 0 1px rgba(52,211,153,0.3), 0 8px 24px rgba(52,211,153,0.25)',
            }}
          >
            {dashboardText}
            <ArrowRight className="w-4 h-4" />
          </Link>
          <a
            href="#get-classapp"
            className="text-xs font-medium text-slate-500 hover:text-slate-300 transition-colors underline underline-offset-4 decoration-slate-700 hover:decoration-slate-400"
          >
            Get ClassApp for your class &rarr;
          </a>
        </div>
      </section>

      {/* ── Feature Grid ────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-14 pb-16 sm:pb-24">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white">
            Built for the way your class actually works
          </h2>
          <p className="text-sm text-slate-400 mt-2 max-w-xl mx-auto px-4">
            Every feature is purpose-built for academic class management — nothing generic, nothing bloated.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <div
                key={i}
                className="flex flex-col gap-3 p-5 rounded-2xl border transition-all duration-200 hover:translate-y-[-2px]"
                style={{ background: f.bg, borderColor: f.border }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: f.bg, border: `1px solid ${f.border}` }}
                >
                  <Icon className="w-5 h-5" style={{ color: f.color }} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">{f.title}</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── User Manuals ──────────────────────────────────── */}
      <section className="max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-14 pb-16 sm:pb-24">
        <div className="text-center mb-8">
          <h2 className="text-xl sm:text-2xl font-extrabold text-white">
            Learn how to use ClassApp
          </h2>
          <p className="text-sm text-slate-400 mt-2 max-w-md mx-auto">
            Comprehensive guides for both students and class representatives.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Student Guide */}
          <Link
            href="/manual/student"
            className="group relative rounded-2xl p-6 flex flex-col gap-4 overflow-hidden transition-all duration-200 hover:translate-y-[-2px] hover:shadow-[0_12px_40px_rgba(52,211,153,0.12)]"
            style={{
              background: 'linear-gradient(135deg, rgba(52,211,153,0.08) 0%, rgba(26,29,36,0.7) 100%)',
              border: '1px solid rgba(52,211,153,0.22)',
            }}
          >
            <div className="absolute -top-12 -right-12 w-36 h-36 rounded-full blur-3xl pointer-events-none opacity-40"
              style={{ background: 'rgba(52,211,153,0.12)' }} />
            <div className="flex items-center gap-3 relative">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.3)' }}>
                <BookOpen className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Student Guide</p>
                <p className="text-xs text-slate-400 mt-0.5">Everything you can do as a student</p>
              </div>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed relative">
              Timelines, deadlines, announcements, Q&amp;A threads, results, and resource downloads — all explained.
            </p>
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 group-hover:text-emerald-300 transition-colors relative">
              View Student Manual <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>

          {/* CR Guide */}
          <Link
            href="/manual/cr"
            className="group relative rounded-2xl p-6 flex flex-col gap-4 overflow-hidden transition-all duration-200 hover:translate-y-[-2px] hover:shadow-[0_12px_40px_rgba(52,211,153,0.12)]"
            style={{
              background: 'linear-gradient(135deg, rgba(52,211,153,0.08) 0%, rgba(26,29,36,0.7) 100%)',
              border: '1px solid rgba(52,211,153,0.22)',
            }}
          >
            <div className="absolute -top-12 -right-12 w-36 h-36 rounded-full blur-3xl pointer-events-none opacity-40"
              style={{ background: 'rgba(52,211,153,0.12)' }} />
            <div className="flex items-center gap-3 relative">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.28)' }}>
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">CR Guide</p>
                <p className="text-xs text-slate-400 mt-0.5">Full control as a Class Representative</p>
              </div>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed relative">
              Managing timelines, posting announcements, publishing results, and administering student accounts — fully documented.
            </p>
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400 group-hover:text-emerald-300 transition-colors relative">
              View CR Manual <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>
        </div>
      </section>

      {/* ── Get ClassApp CTA ───────────────────────────── */}
      <section
        id="get-classapp"
        className="max-w-4xl mx-auto w-full px-6 lg:px-14 pb-28"
      >
        <div
          className="relative rounded-3xl overflow-hidden p-8 md:p-12 flex flex-col md:flex-row gap-10 md:gap-16 items-start"
          style={{
            background:
              'linear-gradient(135deg, rgba(26,29,36,0.9) 0%, rgba(18,20,28,0.95) 100%)',
            border: '1px solid rgba(52,211,153,0.18)',
            boxShadow: '0 0 80px rgba(52,211,153,0.05), 0 20px 60px rgba(0,0,0,0.4)',
          }}
        >
          {/* Glow */}
          <div
            className="absolute -top-24 -right-24 w-64 h-64 rounded-full blur-3xl pointer-events-none"
            style={{ background: 'rgba(52,211,153,0.06)' }}
          />

          {/* Left: Copy */}
          <div className="flex-1 flex flex-col gap-5 relative">


            <h2 className="text-2xl md:text-3xl font-extrabold text-white leading-snug">
              Want ClassApp for{' '}
              <span
                style={{
                  background: 'linear-gradient(90deg, #34D399, #60A5FA)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                your class?
              </span>
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              ClassApp is set up individually for each class — your own private workspace, your
              own student accounts, your own Telegram integration. Setup is fully handled.
              You just run your class.
            </p>

            {/* What you get */}
            <div className="flex flex-col gap-2.5 mt-1">
              {WHAT_YOU_GET.map((item, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span className="text-xs text-slate-300">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Contact Card */}
          <div
            className="relative w-full md:w-72 flex-shrink-0 rounded-2xl p-6 flex flex-col gap-5"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
            }}
          >
            <div className="flex flex-col gap-1">
              <p className="text-sm font-extrabold text-white">Send a request</p>
              <p className="text-xs text-slate-400">
                Drop a message with your class details and I'll get back to you.
              </p>
            </div>

            <div className="h-px bg-white/5" />

            <div className="flex flex-col gap-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Contact
              </p>
              <a
                href={mailtoHref}
                className="text-xs font-semibold text-emerald-400 break-all hover:text-emerald-300 transition-colors"
              >
                {CONTACT_EMAIL}
              </a>
            </div>

            <a
              href={mailtoHref}
              className="mt-auto flex items-center justify-center gap-2 w-full py-3 px-5 rounded-xl text-sm font-bold text-[#0e1012] transition-all active:scale-[0.97]"
              style={{
                background: 'linear-gradient(135deg, #34D399, #059669)',
                boxShadow: '0 4px 20px rgba(52,211,153,0.25)',
              }}
            >
              <Mail className="w-4 h-4" />
              Request Access
            </a>

            <p className="text-[10px] text-slate-600 text-center leading-relaxed">
              Your email client will open with a pre-filled message. Simply add your class details and send.
            </p>
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────── */}
      <footer
        className="w-full border-t flex-shrink-0 mt-auto"
        style={{ background: '#0e1012', borderColor: '#1a1d24' }}
      >
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          <Link href="/" className="flex items-center gap-2">
            <GraduationCap className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[11px] font-bold text-slate-500">
              Class<span className="text-emerald-500">App</span>
            </span>
          </Link>
          <span className="text-[10px] font-medium text-slate-700">
            &copy; {new Date().getFullYear()} ClassApp. All rights reserved.
          </span>
        </div>
      </footer>

    </div>
  );
}
