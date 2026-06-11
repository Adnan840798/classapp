export const CHAR_LIMITS = {
  TIMELINE_QUESTION: 500,
  TIMELINE_ANSWER: 1000,
} as const;

export const DEADLINE_THRESHOLDS = {
  GREEN_DAYS: 7,   // > 7 days: green
  YELLOW_DAYS: 3,  // 3–7 days: yellow
  // < 3 days: red
  // overdue: gray
} as const;

export const FILE_SIZE_LIMITS = {
  AVATAR_MAX_BYTES: 2 * 1024 * 1024,       // 2 MB
  NOTICE_MAX_BYTES: 5 * 1024 * 1024,       // 5 MB
  AVATAR_MAX_DIMENSION: 400,               // 400×400 px max
} as const;

export const STORAGE_BUCKETS = {
  NOTICES: 'notices',
  AVATARS: 'avatars',
} as const;

export const STORAGE_PATHS = {
  ANNOUNCEMENTS: 'announcements',
  RESULTS: 'results',
} as const;

export const ROLES = {
  ADMIN: 'admin',
  CR: 'cr',
  STUDENT: 'student',
} as const;

export const NOTIF_TYPES = {
  ANNOUNCEMENT: 'announcement',
  DEADLINE: 'deadline',
  RESULT: 'result',
  SYSTEM: 'system',
} as const;

export const DASHBOARD_LIMITS = {
  RECENT_ANNOUNCEMENTS: 5,
  UPCOMING_DEADLINES: 10,
  RECENT_NOTIFICATIONS: 10,
} as const;

