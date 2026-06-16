// ============================================================
// types/index.ts — Custom application types for ClassApp
// ============================================================

export type UserRole = 'admin' | 'cr' | 'student';
export type EventType = 'exam' | 'class' | 'holiday' | 'submission' | 'other';
export type AttachmentType = 'image' | 'pdf';
export type NotifType = 'announcement' | 'deadline' | 'result' | 'system' | 'qna' | 'resource_pending' | 'qna_announcement' | 'qna_deadline' | 'qna_event';
export type DeadlineColor = 'green' | 'yellow' | 'red' | 'gray';

// ── Profile ────────────────────────────────────────────────
export interface Profile {
  id: string;
  full_name: string;
  university_id: string;
  email: string;
  role: UserRole;
  phone: string | null;
  facebook_id: string | null;
  whatsapp: string | null;
  telegram_handle: string | null;
  blood_group: string | null;
  address: string | null;
  profile_pic_url: string | null;
  batch: string | null;
  department: string | null;
  notif_enabled: boolean;
  notif_sound_on: boolean;
  cr_last_read_at: string | null;
  password_reset_required?: boolean;
  created_at: string;
  updated_at: string;
}

// ── Announcements ──────────────────────────────────────────
export interface Announcement {
  id: string;
  title: string;
  body: string;
  is_important: boolean;
  is_public: boolean;
  attachment_url: string | null;
  attachment_type: AttachmentType | null;
  telegram_posted: boolean;
  created_by: string | null;
  created_at: string;
  creator?: Pick<Profile, 'full_name' | 'profile_pic_url'>;
}

// ── Deadlines ──────────────────────────────────────────────
export interface Deadline {
  id: string;
  title: string;
  subject: string;
  due_date: string;
  description: string | null;
  created_by: string | null;
  created_at: string;
}

export interface DeadlineWithColor extends Deadline {
  color: DeadlineColor;
  daysRemaining: number;
}

// ── Exam Results ───────────────────────────────────────────
export interface ExamResult {
  id: string;
  exam_name: string;
  result_sheet_url: string | null;
  published_by: string | null;
  published_at: string;
}

// ── Calendar Events ────────────────────────────────────────
export interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  event_type: EventType;
  is_public: boolean;
  qa_enabled: boolean;
  created_by: string | null;
  created_at: string;
}

// ── Q&A ───────────────────────────────────────────────────
export interface TimelineQuestion {
  id: string;
  event_id: string;
  asked_by: string;
  question: string;
  is_resolved: boolean;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  asker?: Pick<Profile, 'full_name' | 'profile_pic_url'>;
  answers?: TimelineAnswer[];
}

export interface TimelineAnswer {
  id: string;
  question_id: string;
  answered_by: string;
  answer: string;
  created_at: string;
  answerer?: Pick<Profile, 'full_name' | 'profile_pic_url'>;
}

// ── Notes ──────────────────────────────────────────────────
export interface Note {
  id: string;
  user_id: string;
  title: string;
  content: string | null;
  drive_link: string | null;
  is_public: boolean;
  is_pending: boolean;
  updated_at: string;
  created_at: string;
  creator?: {
    full_name: string;
  } | null;
}

// ── Notifications ──────────────────────────────────────────
export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotifType;
  is_read: boolean;
  reference_id: string | null;
  created_at: string;
}

// ── Form types ─────────────────────────────────────────────
export interface AnnouncementFormData {
  title: string;
  body: string;
  is_important: boolean;
  is_public: boolean;
  attachment?: File;
}

export interface DeadlineFormData {
  title: string;
  subject: string;
  due_date: string;
  description: string;
}

export interface CalendarEventFormData {
  title: string;
  description: string;
  event_date: string;
  event_type: EventType;
  is_public: boolean;
  qa_enabled: boolean;
}

export interface ResultFormData {
  exam_name: string;
  result_sheet?: File;
}
