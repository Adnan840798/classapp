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
 */
export function getSaturdayOfWeek1(semesterStartDate: string): Date {
  const date = new Date(`${semesterStartDate}T00:00:00+06:00`);
  const day = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const adjustments: { [key: number]: number } = {
    6: 0,   // Saturday -> same day
    0: -1,  // Sunday -> previous Saturday
    1: -2,  // Monday -> previous Saturday
    2: -3,  // Tuesday -> previous Saturday
    3: -4,  // Wednesday -> previous Saturday
    4: 2,   // Thursday -> next Saturday
    5: 1,   // Friday -> next Saturday
  };
  const saturday = new Date(date);
  saturday.setDate(date.getDate() + adjustments[day]);
  return saturday;
}

/**
 * Calculates the Saturday, Wednesday, and individual academic days (Sat-Wed) for a given week number.
 * @param weekNumber 1-indexed week number
 * @param semesterStartDate The YYYY-MM-DD start date of the semester
 */
export function getWeekDates(weekNumber: number, semesterStartDate: string = SEMESTER_START_DATE) {
  const saturdayOfWeek1 = getSaturdayOfWeek1(semesterStartDate);
  
  // Saturday of week N is (N-1) weeks after Saturday of week 1
  const saturday = new Date(saturdayOfWeek1);
  saturday.setDate(saturdayOfWeek1.getDate() + 7 * (weekNumber - 1));
  
  // Wednesday of week N is 4 days after Saturday of week N
  const wednesday = new Date(saturday);
  wednesday.setDate(saturday.getDate() + 4);
  
  // The academic days are Saturday, Sunday, Monday, Tuesday, Wednesday
  const days: Date[] = [];
  for (let i = 0; i < 5; i++) {
    const day = new Date(saturday);
    day.setDate(saturday.getDate() + i);
    days.push(day);
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
  const current = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const diffTime = current.getTime() - start.getTime();
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
