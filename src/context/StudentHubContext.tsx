'use client';

/**
 * StudentHubContext — Preloaded + live-updated data hub for student pages.
 *
 * HOW IT WORKS:
 *   1. student/layout.tsx fetches ALL data in one parallel Promise.all server-side.
 *   2. StudentHubProvider seeds React state from those props (instant first render).
 *   3. A single Supabase Realtime channel subscribes to postgres_changes on:
 *        announcements, deadlines, exam_results, notes
 *      When the CR inserts/updates/deletes → payload arrives over WebSocket →
 *      the matching setState call patches the list in-memory → React re-renders
 *      all student pages instantly with no refresh and no extra DB call.
 *
 * STATIC PAGE COMPATIBILITY:
 *   Static page shells (timeline, deadlines, announcements, results, notes) are
 *   prefetched by Next.js and render from context — zero server round-trips on
 *   navigation. Realtime updates patch the context state, so students always see
 *   the latest data without leaving the page.
 *
 * SECURITY:
 *   - Context only holds data already authorized by the server (RLS-filtered).
 *   - Public resources are pre-filtered to is_public=true, is_pending=false.
 *   - Realtime events are also RLS-filtered by Supabase before broadcast.
 *   - Private notes are intentionally excluded from the live channel (user-specific).
 */

import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { Announcement, Deadline, ExamResult, Note } from '@/types';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

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
 * Wrap the student layout output with this provider to preload all hub data
 * and subscribe to live updates from the CR.
 */
export function StudentHubProvider({
  children,
  announcements: initialAnnouncements,
  deadlines: initialDeadlines,
  results: initialResults,
  publicResources: initialResources,
  semesterConfig,
  holidayDays,
  classRoutine,
  privateNotes,
}: StudentHubProviderProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>(initialAnnouncements);
  const [deadlines, setDeadlines]         = useState<Deadline[]>(initialDeadlines);
  const [results, setResults]             = useState<ExamResult[]>(initialResults);
  const [publicResources, setPublicResources] = useState<Note[]>(initialResources);

  // Track the channel ref so we can clean it up on unmount
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    const channel = supabase
      .channel('student-hub-realtime')

      // ── Announcements ──────────────────────────────────────
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'announcements' }, (payload) => {
        const item = payload.new as Announcement;
        setAnnouncements((prev) => [item, ...prev]);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'announcements' }, (payload) => {
        const item = payload.new as Announcement;
        setAnnouncements((prev) => prev.map((a) => (a.id === item.id ? item : a)));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'announcements' }, (payload) => {
        const id = payload.old.id as string;
        setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      })

      // ── Deadlines ──────────────────────────────────────────
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'deadlines' }, (payload) => {
        const item = payload.new as Deadline;
        setDeadlines((prev) => [item, ...prev]);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'deadlines' }, (payload) => {
        const item = payload.new as Deadline;
        setDeadlines((prev) => prev.map((d) => (d.id === item.id ? item : d)));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'deadlines' }, (payload) => {
        const id = payload.old.id as string;
        setDeadlines((prev) => prev.filter((d) => d.id !== id));
      })

      // ── Exam Results ───────────────────────────────────────
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'exam_results' }, (payload) => {
        const item = payload.new as ExamResult;
        setResults((prev) => [item, ...prev]);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'exam_results' }, (payload) => {
        const item = payload.new as ExamResult;
        setResults((prev) => prev.map((r) => (r.id === item.id ? item : r)));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'exam_results' }, (payload) => {
        const id = payload.old.id as string;
        setResults((prev) => prev.filter((r) => r.id !== id));
      })

      // ── Public Resources (notes table, is_public=true, is_pending=false) ──
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notes' }, (payload) => {
        const item = payload.new as Note;
        // Only surface publicly-approved resources
        if (item.is_public && !item.is_pending) {
          setPublicResources((prev) => [item, ...prev]);
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notes' }, (payload) => {
        const item = payload.new as Note;
        setPublicResources((prev) => {
          // Resource became public → add to list
          if (item.is_public && !item.is_pending) {
            const exists = prev.some((r) => r.id === item.id);
            return exists ? prev.map((r) => (r.id === item.id ? item : r)) : [item, ...prev];
          }
          // Resource became private/pending → remove from list
          return prev.filter((r) => r.id !== item.id);
        });
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'notes' }, (payload) => {
        const id = payload.old.id as string;
        setPublicResources((prev) => prev.filter((r) => r.id !== id));
      })

      .subscribe((status) => {
        if (process.env.NODE_ENV === 'development') {
          console.log('[StudentHubContext] Realtime status:', status);
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, []); // Only once — channel lives as long as the student layout is mounted

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
 * useStudentHub — read preloaded + live-updated student hub data.
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
