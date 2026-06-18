/**
 * Semester Start Date: May 20, 2026 (Wednesday).
 * A week starts on Saturday and ends on Wednesday (5 days of classes).
 * Thursday and Friday are weekend holidays and are not included.
 */

export const SEMESTER_START_DATE = '2026-05-20'; // Default Wednesday of Week 1

/**
 * Resolves any input date to the correct Saturday starting academic Week 1.
 * Saturday, Sunday, Monday, Tuesday, Wednesday -> previous/current Saturday.
 * Thursday, Friday -> next upcoming Saturday.
 * Uses UTC arithmetic to be completely timezone-independent.
 */
export function getSaturdayOfWeek1(semesterStartDate: string): Date {
  const parts = semesterStartDate.split('-');
  const yyyy = parseInt(parts[0], 10);
  const mm = parseInt(parts[1], 10) - 1; // 0-indexed month
  const dd = parseInt(parts[2], 10);
  
  // Use UTC to determine the correct calendar day of week
  const dateUtc = new Date(Date.UTC(yyyy, mm, dd));
  const day = dateUtc.getUTCDay(); // 0 = Sunday, ..., 6 = Saturday
  const adjustments: { [key: number]: number } = {
    6: 0,   // Saturday -> same day
    0: -1,  // Sunday -> previous Saturday
    1: -2,  // Monday -> previous Saturday
    2: -3,  // Tuesday -> previous Saturday
    3: -4,  // Wednesday -> previous Saturday
    4: 2,   // Thursday -> next Saturday
    5: 1,   // Friday -> next Saturday
  };
  
  // Adjust the UTC date to Saturday
  dateUtc.setUTCDate(dateUtc.getUTCDate() + adjustments[day]);
  
  const satYear = dateUtc.getUTCFullYear();
  const satMonth = String(dateUtc.getUTCMonth() + 1).padStart(2, '0');
  const satDate = String(dateUtc.getUTCDate()).padStart(2, '0');
  const satString = `${satYear}-${satMonth}-${satDate}`;
  
  return new Date(`${satString}T00:00:00+06:00`);
}

/**
 * Calculates the Saturday, Wednesday, and individual academic days (Sat-Wed) for a given week number.
 * @param weekNumber 1-indexed week number
 * @param semesterStartDate The YYYY-MM-DD start date of the semester
 */
export function getWeekDates(weekNumber: number, semesterStartDate: string = SEMESTER_START_DATE) {
  const saturdayOfWeek1 = getSaturdayOfWeek1(semesterStartDate);
  
  // Convert saturdayOfWeek1 to date parts using the timezone helper to ensure safety
  const dateString = toISODateString(saturdayOfWeek1);
  const parts = dateString.split('-');
  const yyyy = parseInt(parts[0], 10);
  const mm = parseInt(parts[1], 10) - 1;
  const dd = parseInt(parts[2], 10);
  
  const saturdayUtc = new Date(Date.UTC(yyyy, mm, dd + 7 * (weekNumber - 1)));
  const wednesdayUtc = new Date(saturdayUtc);
  wednesdayUtc.setUTCDate(saturdayUtc.getUTCDate() + 4);
  
  const formatUtc = (d: Date) => {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const r = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${r}`;
  };
  
  const saturday = new Date(`${formatUtc(saturdayUtc)}T00:00:00+06:00`);
  const wednesday = new Date(`${formatUtc(wednesdayUtc)}T00:00:00+06:00`);
  
  const days: Date[] = [];
  for (let i = 0; i < 5; i++) {
    const dayUtc = new Date(saturdayUtc);
    dayUtc.setUTCDate(saturdayUtc.getUTCDate() + i);
    days.push(new Date(`${formatUtc(dayUtc)}T00:00:00+06:00`));
  }
  
  return {
    saturday,
    wednesday,
    days,
  };
}

/**
 * Determines the current week number based on the current date in GMT+6 and the semester start configuration.
 * Each week starts on Saturday and ends on Friday (with Thu-Fri as the weekend of that week).
 */
export function getCurrentWeekNumber(
  semesterStartDate: string = SEMESTER_START_DATE,
  totalWeeks: number = 14
): number | null {
  let now = new Date();
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Dhaka',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    });
    const parts = formatter.formatToParts(now);
    const getPart = (type: string) => parseInt(parts.find(p => p.type === type)!.value);
    now = new Date(getPart('year'), getPart('month') - 1, getPart('day'));
  } catch (e) {
    now = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  
  const start = getSaturdayOfWeek1(semesterStartDate);
  
  // Convert start (GMT+6) to calendar date values
  const startDateStr = toISODateString(start);
  const startParts = startDateStr.split('-');
  const startY = parseInt(startParts[0], 10);
  const startM = parseInt(startParts[1], 10) - 1;
  const startD = parseInt(startParts[2], 10);
  
  const startUtc = new Date(Date.UTC(startY, startM, startD));
  const currentUtc = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  
  const diffTime = currentUtc.getTime() - startUtc.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0 || diffDays >= totalWeeks * 7) return null; // Outside semester range
  
  return Math.floor(diffDays / 7) + 1;
}

/**
 * Format a Date object to YYYY-MM-DD string in Asia/Dhaka (GMT+6) timezone.
 */
export function toISODateString(date: Date): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Dhaka',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric'
    });
    const parts = formatter.formatToParts(date);
    const getPart = (type: string) => parts.find(p => p.type === type)!.value;
    const yyyy = getPart('year');
    const mm = getPart('month').padStart(2, '0');
    const dd = getPart('day').padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  } catch (e) {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
}
