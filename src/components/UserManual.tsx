'use client';

import {
  BookOpen, CalendarDays, Megaphone, ClipboardList,
  BookMarked, Users, Check, HelpCircle,
  Clock, Award, Smartphone, Send
} from 'lucide-react';

type Role = 'student' | 'cr';

interface FeatureItem {
  label: string;
  description: string;
}

interface FeatureCard {
  title: string;
  subtitle: string;
  icon: React.ElementType;
  color: string;
  gradient: string;
  features: FeatureItem[];
}

const STUDENT_CARDS: FeatureCard[] = [
  {
    title: 'Live Class Schedule',
    subtitle: 'Track your daily routine in real time.',
    icon: CalendarDays,
    color: 'hsl(160 84% 45%)',
    gradient: 'from-emerald-500/10 to-transparent',
    features: [
      { label: 'Check Daily Routine', description: 'View today\'s lectures, labs, and breaks organized chronologically from the moment you open the app.' },
      { label: 'View Class Details', description: 'Tap any class slot to instantly see the room number, teacher, subject code, and exact timings.' },
      { label: 'Navigate the Calendar', description: 'Tap any date on the calendar to pull up the schedule for future weeks and plan ahead.' },
    ]
  },
  {
    title: 'Assignments & Deadlines',
    subtitle: 'Never miss a submission or test again.',
    icon: ClipboardList,
    color: 'hsl(38 90% 55%)',
    gradient: 'from-amber-500/10 to-transparent',
    features: [
      { label: 'Track Priority Feed', description: 'Identify urgent tasks instantly with color-coding: grey for overdue, red for highly urgent (due in < 3 days), yellow for upcoming (due within 7 days), and green for future deadlines.' },
      { label: 'Access Submission Details', description: 'Open any deadline card to view instructions, syllabus topics, and reference documents uploaded by your CR.' },
    ]
  },
  {
    title: 'Class Announcements',
    subtitle: 'Official notices, circulars, and notices in one place.',
    icon: Megaphone,
    color: 'hsl(280 70% 60%)',
    gradient: 'from-purple-500/10 to-transparent',
    features: [
      { label: 'Lockscreen Broadcasts', description: 'Receive instant push alerts the second your CR publishes a new announcement.' },
      { label: 'Check Pinned Notices', description: 'View critical schedules and high-priority posts kept pinned at the top of your feed.' },
      { label: 'Telegram Integration', description: 'Read updates mirrored automatically to your class Telegram channel if you prefer checking Telegram first.' },
      { label: 'Spot Unread Notices', description: 'Scan unread items highlighted with badges to quickly catch up on missed circulars.' },
    ]
  },
  {
    title: 'Thread Q&A',
    subtitle: 'Clarify doubts directly under context.',
    icon: HelpCircle,
    color: 'hsl(190 75% 50%)',
    gradient: 'from-cyan-500/10 to-transparent',
    features: [
      { label: 'Ask Contextual Questions', description: 'Post comments and questions directly under a specific class slot, announcement, or deadline.' },
      { label: 'Peer Collaborations', description: 'Reply to your classmates\' questions and work together to resolve syllabus or room location doubts.' },
      { label: 'Search Past Answers', description: 'Search a permanent record of resolved Q&As to find answers to common questions immediately.' },
    ]
  },
  {
    title: 'Class Resources',
    subtitle: 'Your private study notes and shared class links.',
    icon: BookMarked,
    color: 'hsl(210 80% 60%)',
    gradient: 'from-blue-500/10 to-transparent',
    features: [
      { label: 'Private Study Notes', description: 'Create and organize your own personal notes, study outlines, and text descriptions inside the app.' },
      { label: 'Share Google Drive Links', description: 'Post reference files, Google Drive directories, or study websites for the class.' },
      { label: 'Access Verified Vault', description: 'Browse shared notes and external resource links uploaded by classmates and verified by the CR.' },
    ]
  },
  {
    title: 'Exam Results',
    subtitle: 'Access class exam marksheets in one place.',
    icon: Award,
    color: 'hsl(340 80% 58%)',
    gradient: 'from-rose-500/10 to-transparent',
    features: [
      { label: 'View Published Marksheets', description: 'Instantly check class exam results and grading sheets published by your CR.' },
      { label: 'Preview Sheets In-App', description: 'Open result spreadsheets, PDFs, or notice board photos directly inside the app.' },
      { label: 'Download Marksheets', description: 'Save copies of published class grade sheets directly to your device storage.' },
    ]
  },
];

const CR_CARDS: FeatureCard[] = [
  {
    title: 'Timeline & Routine Builder',
    subtitle: 'Establish the semester schedule and handle daily edits.',
    icon: CalendarDays,
    color: 'hsl(160 84% 45%)',
    gradient: 'from-emerald-500/10 to-transparent',
    features: [
      { label: 'Build Semester Routine', description: 'Set up recurring weekly time slots for lectures, labs, and breaks with rooms, subject codes, and teachers.' },
      { label: 'Reschedule or Cancel', description: 'Modify room numbers, swap teachers, or cancel individual slots with automatic, real-time student timeline sync.' },
      { label: 'Auto-Notify Students', description: 'Alert the entire class via push notifications automatically if you edit a class scheduled for today or tomorrow.' },
      { label: 'Manage Holidays', description: 'Mark a day or an entire week as a holiday to temporarily suspend the routine and mark it on student feeds.' },
    ]
  },
  {
    title: 'Deadline Coordinator',
    subtitle: 'Publish tasks, syllabus details, and files.',
    icon: ClipboardList,
    color: 'hsl(38 90% 55%)',
    gradient: 'from-amber-500/10 to-transparent',
    features: [
      { label: 'Post Task Details', description: 'Create class deadlines complete with times, descriptions, syllabus topics, and reference file attachments.' },
      { label: 'Archive Finished Work', description: 'Mark active deadlines as completed to clean the active student dashboard and archive past submissions.' },
    ]
  },
  {
    title: 'Announcements Broadcaster',
    subtitle: 'Publish notices to lockscreens and channels.',
    icon: Megaphone,
    color: 'hsl(280 70% 60%)',
    gradient: 'from-purple-500/10 to-transparent',
    features: [
      { label: 'Send Push Broadcasts', description: 'Publish circulars or notice board screenshots directly to students\' phone lockscreen notification feeds.' },
      { label: 'Sync with Telegram', description: 'Mirror class announcements to your Telegram channel automatically via a one-time channel integration setup.' },
      { label: 'Pin High Priority', description: 'Keep important updates (like exam schedules or fee deadlines) pinned to the top of every student\'s feed.' },
    ]
  },
  {
    title: 'Student Account Manager',
    subtitle: 'Control student registration and representative roles.',
    icon: Users,
    color: 'hsl(210 80% 60%)',
    gradient: 'from-blue-500/10 to-transparent',
    features: [
      { label: 'Register Students', description: 'Onboard class members via name, ID, and email. Enforces password updates on their first login for security.' },
      { label: 'Track Invitations', description: 'Monitor pending and active invitations to track which students have registered and who still needs to connect.' },
      { label: 'Delegate CR Roles', description: 'Promote student accounts to co-representatives or demote co-CRs with changes taking effect in real time.' },
      { label: 'Reset Profiles', description: 'Delete old student accounts or trigger password reset updates for locked out users.' },
    ]
  },
  {
    title: 'Class Resources Manager',
    subtitle: 'Coordinate shared links and approve student uploads.',
    icon: BookMarked,
    color: 'hsl(190 75% 50%)',
    gradient: 'from-cyan-500/10 to-transparent',
    features: [
      { label: 'Manage Class Links', description: 'Add public reference links, Google Drive folders, and shared file URLs for the class.' },
      { label: 'Approve Student Notes', description: 'Review public notes and study links submitted by students and approve them to appear on the class feed.' },
      { label: 'Moderate Outdated Links', description: 'Edit or delete class resources and external URLs to keep the shared library clean and organized.' },
    ]
  },
  {
    title: 'Results Publisher',
    subtitle: 'Publish exam names and attach class marksheets.',
    icon: Award,
    color: 'hsl(340 80% 58%)',
    gradient: 'from-rose-500/10 to-transparent',
    features: [
      { label: 'Publish Exam Results', description: 'Post exam titles (like Midterms or Quizzes) directly to the class dashboard.' },
      { label: 'Attach Result Sheets', description: 'Upload class marksheet PDFs, images, or distribution spreadsheets for students to view.' },
      { label: 'Publish on Timeline', description: 'Optionally pin published result sheets directly to specific timeline dates.' },
    ]
  },
];

export function UserManual({ role }: { role: Role }) {
  const cards = role === 'cr' ? CR_CARDS : STUDENT_CARDS;

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6">
      <style>{`
        :root {
          --manual-bg-ratio: 10%;
          --manual-border-ratio: 42%;
        }
        .dark {
          --manual-bg-ratio: 7%;
          --manual-border-ratio: 15%;
        }
      `}</style>
      {/* Header */}
      <div className="glass-card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, hsl(160 84% 45%), hsl(170 80% 38%))' }}
          >
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-foreground">
              {role === 'cr' ? 'ClassApp for Representatives' : 'ClassApp for Students'}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {role === 'cr'
                ? 'Everything you can do as a Class Representative — and what the app does automatically.'
                : 'A complete guide to features built to keep you informed and on top of your academics.'}
            </p>
          </div>
        </div>
      </div>

      {/* Feature Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className="relative overflow-hidden flex flex-col gap-4 p-5 rounded-2xl border transition-all duration-200 hover:shadow-sm"
              style={{
                background: `color-mix(in srgb, ${card.color} var(--manual-bg-ratio), hsl(var(--card)))`,
                borderColor: `color-mix(in srgb, ${card.color} var(--manual-border-ratio), hsl(var(--border) / 0.5))`,
              }}
            >

              {/* Card Header */}
              <div className="relative flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{
                    background: `color-mix(in srgb, ${card.color} 10%, transparent)`,
                    border: `1px solid color-mix(in srgb, ${card.color} 25%, transparent)`
                  }}
                >
                  <Icon className="w-5 h-5" style={{ color: card.color }} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground leading-snug">{card.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{card.subtitle}</p>
                </div>
              </div>

              {/* Divider */}
              <div className="relative h-px bg-border/60" />

              {/* Feature bullets */}
              <div className="relative flex flex-col gap-3">
                {card.features.map((feature, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <Check
                      className="w-3.5 h-3.5 flex-shrink-0 mt-0.5"
                      style={{ color: card.color }}
                    />
                    <div>
                      <span className="text-xs font-semibold text-foreground">{feature.label} — </span>
                      <span className="text-xs text-muted-foreground leading-relaxed">{feature.description}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Telegram callout (only for CR) */}
      {role === 'cr' && (
        <div
          className="flex items-start gap-3 px-5 py-4 rounded-2xl border bg-gradient-to-br from-blue-500/[0.04] to-card border-blue-500/15 dark:border-blue-500/25"
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-blue-500/10 dark:bg-blue-500/20 border border-blue-500/20 dark:border-blue-500/30"
          >
            <Send className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">Telegram Channel Integration</p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Connect your class Telegram channel once from settings, and every announcement you post inside ClassApp will automatically be forwarded to the channel — keeping students notified whether they check the app or Telegram first.
            </p>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl border border-border/60 bg-muted/20">
        <Smartphone className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          ClassApp is fully optimized for Android smartphones and runs as a native installed app. Install the APK provided by your class administrator for the best experience and instant push notifications.
        </p>
      </div>
    </div>
  );
}
