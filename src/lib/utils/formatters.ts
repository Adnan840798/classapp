import { EventType } from '@/types';

/**
 * Formats a date string to a human-readable format.
 */
export function formatDate(dateStr: string, options?: Intl.DateTimeFormatOptions): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  });
}

/**
 * Formats a datetime string to a human-readable format with time.
 */
export function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Returns a relative time string (e.g. "2 hours ago", "3 days ago").
 */
export function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(dateStr);
}

/**
 * Formats a name to display initials (e.g. "John Doe" → "JD").
 */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Returns a display label for an event type.
 */
export function formatEventType(type: EventType): string {
  const labels: Record<EventType, string> = {
    exam: 'Exam',
    class: 'Class',
    holiday: 'Holiday',
    submission: 'Submission',
    other: 'Event',
  };
  return labels[type] ?? 'Event';
}

/**
 * Returns color classes for event type badges.
 */
export function getEventTypeColor(type: EventType): string {
  const colors: Record<EventType, string> = {
    exam: 'bg-red-500/15 text-red-400 border-red-500/30',
    class: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    holiday: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    submission: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    other: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  };
  return colors[type] ?? colors.other;
}

/**
 * Truncates text to a given length, adding "..." if truncated.
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Generates a storage path for file uploads with timestamp prefix.
 */
export function generateStoragePath(folder: string, fileName: string): string {
  const timestamp = Date.now();
  const safeName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `${folder}/${timestamp}-${safeName}`;
}
