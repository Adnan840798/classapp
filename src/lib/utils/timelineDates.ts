/**
 * Semester Start Date: May 20, 2026 (Wednesday).
 * A week starts on Saturday and ends on Wednesday (5 days of classes).
 * Thursday and Friday are weekend holidays and are not included.
 */

export const SEMESTER_START_DATE = '2026-05-20'; // Wednesday of Week 1

/**
 * Calculates the Saturday, Wednesday, and individual academic days (Sat-Wed) for a given week number.
 * @param weekNumber 1-indexed week number (1-14)
 */
export function getWeekDates(weekNumber: number) {
  // Semester starts May 20, 2026 (Wednesday)
  const semesterStart = new Date(`${SEMESTER_START_DATE}T00:00:00`);
  
  // Wednesday of week N is (N-1) weeks after May 20
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
 * Determines the current week number (1-14) based on the current date.
 * Each week starts on Saturday and ends on Friday (with Thu-Fri as the weekend of that week).
 */
export function getCurrentWeekNumber(): number {
  const now = new Date();
  
  // Create local midnight dates for accurate difference calculation
  const start = new Date(2026, 4, 16); // May 16, 2026 (Month is 0-indexed, so 4 is May)
  const current = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const diffTime = current.getTime() - start.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return 1; // Before the semester starts, show Week 1
  
  const weekNum = Math.floor(diffDays / 7) + 1;
  return Math.min(Math.max(weekNum, 1), 14); // Clamp between Week 1 and 14
}

/**
 * Format a Date object to YYYY-MM-DD string, keeping local timezone.
 */
export function toISODateString(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
