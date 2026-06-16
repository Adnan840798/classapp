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
    subtitle: 'Always know what\'s next, and where to be.',
    icon: CalendarDays,
    color: 'hsl(160 84% 45%)',
    gradient: 'from-emerald-500/10 to-transparent',
    features: [
      { label: 'Today\'s Routine at a Glance', description: 'Your full daily schedule — lectures, labs, and breaks — laid out in order from the moment you open the app.' },
      { label: 'Jump to Any Day', description: 'Tap any date on the calendar to instantly pull up that day\'s class plan, even weeks ahead.' },
      { label: 'Real-Time Updates', description: 'If your CR cancels a class or changes a room, your timeline refreshes automatically — no refresh needed.' },
      { label: 'Class & Teacher Details', description: 'Each slot shows the subject name, room number, and teacher — everything you need in one tap.' },
    ]
  },
  {
    title: 'Assignments & Deadlines',
    subtitle: 'Never miss a submission again.',
    icon: ClipboardList,
    color: 'hsl(38 90% 55%)',
    gradient: 'from-amber-500/10 to-transparent',
    features: [
      { label: 'Colour-Coded Priority Feed', description: 'Overdue tasks glow red. Items due within 48 hours turn amber. Upcoming work stays white — so your priorities are obvious at a glance.' },
      { label: 'Full Task Details', description: 'Each deadline card shows the due date, instructions, and any reference files uploaded by your CR.' },
      { label: 'Automatic Reminders', description: 'The app quietly sends you a push notification as major deadlines approach, so you are never caught off guard.' },
      { label: 'Clean Archive', description: 'Once your CR marks a task done, it moves out of your active list automatically, keeping your feed tidy.' },
    ]
  },
  {
    title: 'Class Announcements',
    subtitle: 'Official class communication, always in one place.',
    icon: Megaphone,
    color: 'hsl(280 70% 60%)',
    gradient: 'from-purple-500/10 to-transparent',
    features: [
      { label: 'Push Alerts on Every Post', description: 'The moment your CR publishes a new notice, a push notification lands directly on your phone — class info first, always.' },
      { label: 'Pinned Priority Notices', description: 'Critical announcements are pinned to the top of your feed by the CR, so urgent information is never buried.' },
      { label: 'Telegram Mirror', description: 'If your class has a Telegram channel, every announcement posted in ClassApp automatically appears there too — no manual copy-paste needed.' },
      { label: 'Unread Badges', description: 'Announcements you haven\'t read yet are highlighted with a clear badge so you always know what you\'ve missed.' },
    ]
  },
  {
    title: 'Thread Q&A',
    subtitle: 'Ask questions where they actually belong.',
    icon: HelpCircle,
    color: 'hsl(190 75% 50%)',
    gradient: 'from-cyan-500/10 to-transparent',
    features: [
      { label: 'Questions Tied to Context', description: 'Post your question directly under a specific class event, announcement, or deadline — not in a noisy group chat.' },
      { label: 'Classmate Replies', description: 'Anyone in the class can respond to a question thread, making it a collaborative space for quick clarifications.' },
      { label: 'Searchable Record', description: 'Past questions and answers stay visible permanently. If a classmate had the same doubt last week, the answer is right there.' },
    ]
  },
  {
    title: 'Course Resources',
    subtitle: 'Your course materials, organized and always accessible.',
    icon: BookMarked,
    color: 'hsl(210 80% 60%)',
    gradient: 'from-blue-500/10 to-transparent',
    features: [
      { label: 'All Study Files in One Spot', description: 'Lecture slides, lab sheets, past papers, and reference PDFs uploaded by your CR — organized by course and topic.' },
      { label: 'Fast Downloads', description: 'Open or download any document directly within the app with a single tap, no third-party links or Google Drive needed.' },
      { label: 'File Previews', description: 'View PDF files directly in-app before deciding whether to download them.' },
    ]
  },
  {
    title: 'Results & Grades',
    subtitle: 'Know where you stand, clearly and confidentially.',
    icon: Award,
    color: 'hsl(340 80% 58%)',
    gradient: 'from-rose-500/10 to-transparent',
    features: [
      { label: 'Published by Your CR', description: 'Midterm marks, quiz scores, lab grades, and final results appear here as your CR publishes them throughout the semester.' },
      { label: 'Class Statistics', description: 'See class averages and highest marks alongside your own score to understand your standing in context.' },
      { label: 'Full Result Sheets', description: 'CRs can upload complete result sheets for you to view at any time from the app.' },
    ]
  },
];

const CR_CARDS: FeatureCard[] = [
  {
    title: 'Timeline & Routine Builder',
    subtitle: 'Keep the whole class on the same page — literally.',
    icon: CalendarDays,
    color: 'hsl(160 84% 45%)',
    gradient: 'from-emerald-500/10 to-transparent',
    features: [
      { label: 'Build the Semester Routine', description: 'Set up lectures, labs, and breaks with subject codes, teacher names, room numbers, and time slots. Repeat weekly with one toggle.' },
      { label: 'Edit or Cancel Anytime', description: 'Update individual class slots, swap teachers, or cancel a single day\'s class. Students see the change instantly in their timeline.' },
      { label: 'Smart Change Alerts', description: 'When you modify a class happening today or tomorrow, ClassApp automatically nudges all students with a push notification so nobody misses the update.' },
    ]
  },
  {
    title: 'Deadline & Task Coordinator',
    subtitle: 'Publish deadlines once — the app does the rest.',
    icon: ClipboardList,
    color: 'hsl(38 90% 55%)',
    gradient: 'from-amber-500/10 to-transparent',
    features: [
      { label: 'Post Submissions & Exams', description: 'Create tasks with full details — due date, subject, description, and attached reference files or syllabi.' },
      { label: 'Automatic Student Reminders', description: 'ClassApp fires reminder notifications to students as each deadline approaches. No manual pinging in group chats required.' },
      { label: 'Archive Completed Work', description: 'Mark a task as done to cleanly remove it from the active student feed and keep the list focused on what\'s current.' },
    ]
  },
  {
    title: 'Announcements & Broadcasting',
    subtitle: 'Reach your entire class in seconds across every channel.',
    icon: Megaphone,
    color: 'hsl(280 70% 60%)',
    gradient: 'from-purple-500/10 to-transparent',
    features: [
      { label: 'Instant Push to All Students', description: 'Every announcement you post triggers an immediate push notification on every enrolled student\'s smartphone — no group chat needed.' },
      { label: 'Telegram Auto-Sync', description: 'Connect your class Telegram channel once. From then on, every ClassApp announcement automatically mirrors to Telegram, reaching students on both platforms at once.' },
      { label: 'Pin Critical Notices', description: 'Pin any announcement to the very top of every student\'s feed. Perfect for exam schedules, venue changes, or semester updates that need to stay visible.' },
      { label: 'File Attachments', description: 'Attach images, PDFs, or notice board screenshots directly to your announcement for full context.' },
    ]
  },
  {
    title: 'Student Account Manager',
    subtitle: 'Full control over who enters your class.',
    icon: Users,
    color: 'hsl(210 80% 60%)',
    gradient: 'from-blue-500/10 to-transparent',
    features: [
      { label: 'Create Student Accounts', description: 'Register a new student by entering their name, university ID, and email. A temporary password is issued and students are forced to set their own on first login.' },
      { label: 'Pending Verification List', description: 'Track all newly created accounts that haven\'t completed their first login yet in one clean view — so you know who\'s set up and who still needs to connect.' },
      { label: 'Manage Roles', description: 'Promote a student to CR, or demote a CR to student. Role changes take effect immediately and are protected against unauthorized self-modification.' },
      { label: 'Remove Accounts', description: 'Delete old or inactive accounts cleanly. If a student forgets their password, recreate their account — they\'ll be prompted to set a new one on login.' },
    ]
  },
  {
    title: 'Resource Library',
    subtitle: 'Your class study vault — organized, searchable, and permanent.',
    icon: BookMarked,
    color: 'hsl(190 75% 50%)',
    gradient: 'from-cyan-500/10 to-transparent',
    features: [
      { label: 'Upload Any File', description: 'Drop in lecture slides, lab manuals, project briefs, past papers, or any course-related document. Students can access and download them anytime.' },
      { label: 'Organize by Subject', description: 'Tag uploads with course codes and subject names so students can find specific materials without scrolling endlessly.' },
    ]
  },
  {
    title: 'Results Publisher',
    subtitle: 'Deliver grades clearly and transparently.',
    icon: Award,
    color: 'hsl(340 80% 58%)',
    gradient: 'from-rose-500/10 to-transparent',
    features: [
      { label: 'Publish Marks per Assessment', description: 'Post individual marks for quizzes, midterms, labs, and final exams. Students see their own score alongside class averages for context.' },
      { label: 'Upload Result Sheets', description: 'Upload a full-class result PDF or spreadsheet for complete transparency after major assessments.' },
      { label: 'Automatic Averages', description: 'Class average and highest mark calculate automatically the moment you publish — no spreadsheets needed.' },
    ]
  },
];

export function UserManual({ role }: { role: Role }) {
  const cards = role === 'cr' ? CR_CARDS : STUDENT_CARDS;

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6">
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
            <h1 className="text-xl font-black text-white">
              {role === 'cr' ? 'ClassApp for Representatives' : 'ClassApp for Students'}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {role === 'cr'
                ? 'Everything you can do as a Class Representative — and what the app does automatically.'
                : 'A complete guide to features built to keep you informed and on top of your academics.'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-center px-3 py-1.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-primary/10 border border-primary/20 text-primary flex-shrink-0">
          {role === 'cr' ? '🛡 Representative' : '🎓 Student'} View
        </div>
      </div>

      {/* Feature Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className="relative glass-card overflow-hidden flex flex-col gap-4 p-5 border border-white/[0.06] hover:border-white/[0.12] transition-all duration-200"
            >
              {/* Subtle gradient overlay */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${card.gradient} pointer-events-none`}
              />

              {/* Card Header */}
              <div className="relative flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: `${card.color}18`, border: `1px solid ${card.color}35` }}
                >
                  <Icon className="w-5 h-5" style={{ color: card.color }} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white leading-snug">{card.title}</h3>
                  <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{card.subtitle}</p>
                </div>
              </div>

              {/* Divider */}
              <div className="relative h-px bg-white/5" />

              {/* Feature bullets */}
              <div className="relative flex flex-col gap-3">
                {card.features.map((feature, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <Check
                      className="w-3.5 h-3.5 flex-shrink-0 mt-0.5"
                      style={{ color: card.color }}
                    />
                    <div>
                      <span className="text-xs font-semibold text-white">{feature.label} — </span>
                      <span className="text-xs text-slate-400 leading-relaxed">{feature.description}</span>
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
          className="flex items-start gap-3 px-5 py-4 rounded-2xl border"
          style={{
            background: 'linear-gradient(135deg, rgba(37,99,235,0.08), rgba(29,78,216,0.04))',
            borderColor: 'rgba(59,130,246,0.2)'
          }}
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(37,99,235,0.15)', border: '1px solid rgba(59,130,246,0.3)' }}
          >
            <Send className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">Telegram Channel Integration</p>
            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
              Connect your class Telegram channel once from settings, and every announcement you post inside ClassApp will automatically be forwarded to the channel — keeping students notified whether they check the app or Telegram first.
            </p>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl border border-white/5 bg-white/[0.01]">
        <Smartphone className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-slate-500 leading-relaxed">
          ClassApp is fully optimized for Android smartphones and runs as a native installed app. Install the APK provided by your class administrator for the best experience and instant push notifications.
        </p>
      </div>
    </div>
  );
}
