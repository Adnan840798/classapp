import { DeadlineColor, DeadlineWithColor, Deadline } from '@/types';

/**
 * Computes deadline color and days remaining based on current date.
 * Colors are computed on the client — not stored in DB.
 */
export function computeDeadlineColor(dueDateStr: string): {
  color: DeadlineColor;
  daysRemaining: number;
} {
  const now = new Date();
  const dueDate = new Date(dueDateStr);
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysRemaining = Math.ceil(
    (dueDate.getTime() - now.getTime()) / msPerDay
  );

  let color: DeadlineColor;
  if (daysRemaining < 0) {
    color = 'gray'; // overdue
  } else if (daysRemaining < 3) {
    color = 'red'; // < 3 days
  } else if (daysRemaining <= 7) {
    color = 'yellow'; // 3–7 days
  } else {
    color = 'green'; // > 7 days
  }

  return { color, daysRemaining };
}

/**
 * Enriches an array of Deadline objects with color and daysRemaining.
 * Sorts by urgency: overdue first by past-due amount, then by daysRemaining asc.
 */
export function enrichDeadlines(deadlines: Deadline[]): DeadlineWithColor[] {
  return deadlines
    .map((d) => ({
      ...d,
      ...computeDeadlineColor(d.due_date),
    }))
    .sort((a, b) => {
      // Sort by daysRemaining ascending (most urgent first)
      return a.daysRemaining - b.daysRemaining;
    });
}

export function getDeadlineColorClass(color: DeadlineColor): string {
  switch (color) {
    case 'green':
      return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    case 'yellow':
      return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    case 'red':
      return 'bg-red-500/15 text-red-400 border-red-500/30';
    case 'gray':
      return 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30';
  }
}

export function getDeadlineDotClass(color: DeadlineColor): string {
  switch (color) {
    case 'green':
      return 'bg-emerald-400';
    case 'yellow':
      return 'bg-amber-400';
    case 'red':
      return 'bg-red-400';
    case 'gray':
      return 'bg-zinc-400';
  }
}

export function formatDaysRemaining(daysRemaining: number): string {
  if (daysRemaining < 0) {
    return `${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) !== 1 ? 's' : ''} overdue`;
  }
  if (daysRemaining === 0) return 'Due today';
  if (daysRemaining === 1) return '1 day left';
  return `${daysRemaining} days left`;
}
