'use client';

/**
 * StudentHubContext — Preloaded data hub for student pages.
 *
 * HOW IT WORKS:
 *   1. student/layout.tsx fetches ALL data in one parallel Promise.all server-side:
 *      announcements, deadlines, results, public resources, semester config,
 *      holiday days, class routine, and the user's own private notes.
 *   2. StudentHubProvider receives all 8 data sets as props and stores them in context.
 *   3. Every downstream page (Timeline, Announcements, Deadlines, Results, Notes, Profile)
 *      reads from useStudentHub() — zero extra DB round-trips after first load.
 *
 * FALLBACK:
 *   If a student navigates directly to e.g. /student/deadlines without going
 *   through the layout (direct URL), isHydrated = false and the page fetches its own data.
 *
 * SECURITY:
 *   - Context only holds data already authorized by the server (RLS-filtered).
 *   - Public resources are pre-filtered to is_public=true, is_pending=false.
 *   - Private notes are scoped to the authenticated user — fetched fresh by
 *     getMyPrivateNotes() in the layout using the user's own session.
 */

import { createContext, useContext, ReactNode } from 'react';
import type { Announcement, Deadline, ExamResult, Note } from '@/types';

export interface StudentHubData {
  announcements: Announcement[];
  deadlines: Deadline[];
  results: ExamResult[];
  /** Only public, approved resources (is_public=true, is_pending=false). */
  publicResources: Note[];
  /** Semester configuration: total weeks and start date. */
  semesterConfig: { id: number; total_weeks: number; start_date: string } | null;
  /** All holiday day slots for the semester (week_number + day_index pairs). */
  holidayDays: { week_number: number; day_index: number; note: string | null }[];
  /** Current class routine image (or null if not yet uploaded). */
  classRoutine: { id: string; image_url: string; uploaded_at: string } | null;
  /** The authenticated user's own private/pending notes. Always user-specific. */
  privateNotes: Note[];
  /** True only when the context has been hydrated from the layout preload. */
  isHydrated: boolean;
}

const defaultHub: StudentHubData = {
  announcements: [],
  deadlines: [],
  results: [],
  publicResources: [],
  semesterConfig: null,
  holidayDays: [],
  classRoutine: null,
  privateNotes: [],
  isHydrated: false,
};

const StudentHubContext = createContext<StudentHubData>(defaultHub);

interface StudentHubProviderProps {
  children: ReactNode;
  announcements: Announcement[];
  deadlines: Deadline[];
  results: ExamResult[];
  publicResources: Note[];
  semesterConfig: { id: number; total_weeks: number; start_date: string } | null;
  holidayDays: { week_number: number; day_index: number; note: string | null }[];
  classRoutine: { id: string; image_url: string; uploaded_at: string } | null;
  privateNotes: Note[];
}

/**
 * Wrap the student layout output with this provider to preload all hub data.
 * Child pages receive instant data when they call useStudentHub().
 */
export function StudentHubProvider({
  children,
  announcements,
  deadlines,
  results,
  publicResources,
  semesterConfig,
  holidayDays,
  classRoutine,
  privateNotes,
}: StudentHubProviderProps) {
  const value: StudentHubData = {
    announcements,
    deadlines,
    results,
    publicResources,
    semesterConfig,
    holidayDays,
    classRoutine,
    privateNotes,
    isHydrated: true,
  };

  return (
    <StudentHubContext.Provider value={value}>
      {children}
    </StudentHubContext.Provider>
  );
}

/**
 * useStudentHub — read preloaded student hub data.
 *
 * Always check `isHydrated` before using the data:
 *   const { announcements, isHydrated } = useStudentHub();
 *   if (!isHydrated) { ... fetch own data ... }
 *
 * Safe to call outside a StudentHubProvider — returns isHydrated=false
 * so pages can fall back to their own fetch gracefully.
 */
export function useStudentHub(): StudentHubData {
  return useContext(StudentHubContext);
}
