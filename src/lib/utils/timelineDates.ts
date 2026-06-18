/**
 * Semester Start Date: May 20, 2026 (Wednesday).
 * A week starts on Saturday and ends on Wednesday (5 days of classes).
 * Thursday and Friday are weekend holidays and are not included.
 */

export const SEMESTER_START_DATE = '2026-05-20'; // Default Wednesday of Week 1

/**
 * Calculates the Saturday, Wednesday, and individual academic days (Sat-Wed) for a given week number.
 * @param weekNumber 1-indexed week number
 * @param semesterStartDate The YYYY-MM-DD start date of the semester (Wednesday of Week 1)
 */
export function getWeekDates(weekNumber: number, semesterStartDate: string = SEMESTER_START_DATE) {
  const semesterStart = new Date(`${semesterStartDate}T00:00:00+06:00`);
  
  // Wednesday of week N is (N-1) weeks after start date
  const wednesday = new Date(semesterStart);
  wednesday.setDate(semesterStart.getDate() + 7 * (weekNumber - 1));
  
  // Saturday of week N is 4 days before Wednesday of week N
  const saturday = new Date(wednesday);
  saturday.setDate(wednesday.getDate() - 4);
  
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
): number {
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
  
  // Create local midnight dates for accurate difference calculation
  // Saturday of Week 1 is 4 days before the Wednesday start date
  const semesterStart = new Date(`${semesterStartDate}T00:00:00+06:00`);
  const start = new Date(
    semesterStart.getFullYear(),
    semesterStart.getMonth(),
    semesterStart.getDate() - 4
  );
  const current = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const diffTime = current.getTime() - start.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return 1; // Before the semester starts, show Week 1
  
  const weekNum = Math.floor(diffDays / 7) + 1;
  return Math.min(Math.max(weekNum, 1), totalWeeks); // Clamp between Week 1 and totalWeeks
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
