'use client';

import { useState, useEffect, useRef, useTransition, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Info, PalmtreeIcon, Plus, Minus, Umbrella, Coffee, Calendar } from 'lucide-react';
import { getWeekDates, getCurrentWeekNumber, toISODateString } from '@/lib/utils/timelineDates';
import { getTimelineData, getHolidayDays, toggleHolidayDay, setWeekHoliday, getTotalWeeks, setTotalWeeks, getAllSemesterTimelineData } from '@/lib/actions/timeline';
import { RoutineButton } from './RoutineButton';
import { AbsentTrackerButton } from './AbsentTrackerButton';
import { DayDetailPanel } from './DayDetailPanel';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useStudentHub } from '@/context/StudentHubContext';

interface SemesterTimelineProps {
  initialRoutineUrl: string | null;
  isCR: boolean;
  /** Semester config preloaded by student/layout.tsx — eliminates mount-time fetch. */
  initialSemesterConfig: { id: number; total_weeks: number; start_date: string } | null;
  /** Holiday days preloaded by student/layout.tsx — eliminates mount-time fetch. */
  initialHolidayDays: { week_number: number; day_index: number; note: string | null }[];
}

/* ── Icon Components ── */

function CalendarGridIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect x="3" y="4" width="18" height="17" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3 9h18" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 2v4M16 2v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <rect x="7" y="12" width="3" height="3" rx="0.5" fill="currentColor" />
      <rect x="11" y="12" width="3" height="3" rx="0.5" fill="currentColor" />
    </svg>
  );
}

function MegaphoneIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path
        d="M3 11v2a2 2 0 0 0 2 2h1l1 4h2l-1-4h2l7 3V4L10 7H5a2 2 0 0 0-2 2v2z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M19 8.5a4 4 0 0 1 0 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function SquarePlusIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 8v8M8 12h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/* ── Holiday Day Row type ── */
interface HolidaySlot {
  week_number: number;
  day_index: number;
  note: string | null;
}

/* ── Helper: compute per-week class-day ranges from holiday data ── */
function computeWeekDayRanges(holidays: HolidaySlot[], totalWeeks: number): {
  startDay: number;
  endDay: number;
  classDays: number;
  isFullHoliday: boolean;
}[] {
  const holidaySet = new Set(holidays.map((h) => `${h.week_number}-${h.day_index}`));
  const ranges: { startDay: number; endDay: number; classDays: number; isFullHoliday: boolean }[] = [];
  let cumulative = 0;

  for (let w = 1; w <= totalWeeks; w++) {
    let classDays = 0;
    for (let d = 0; d < 5; d++) {
      if (!holidaySet.has(`${w}-${d}`)) classDays++;
    }
    const start = cumulative + 1;
    const end = cumulative + classDays;
    ranges.push({ startDay: start, endDay: end, classDays, isFullHoliday: classDays === 0 });
    cumulative += classDays;
  }
  return ranges;
}

/**
 * Computes the class day number for each of the 5 day slots in a week.
 * Returns null for holiday slots (no class day number).
 * e.g. Week 4 with no holidays → [16, 17, 18, 19, 20]
 * e.g. Week 4 with day-index 1 as holiday → [16, null, 17, 18, 19]
 */
function computeDayNumbers(
  weekNumber: number,
  weekRanges: { startDay: number; classDays: number }[],
  holidaySet: Set<string>
): (number | null)[] {
  const startDay = weekRanges[weekNumber - 1].startDay;
  let counter = startDay;
  return Array.from({ length: 5 }, (_, i) => {
    if (holidaySet.has(`${weekNumber}-${i}`)) return null;
    return counter++;
  });
}

/* ── Helper: compute consecutive full-holiday week groups for collapse ── */
function getHolidayGroups(weekRanges: { isFullHoliday: boolean }[], totalWeeks: number): {
  type: 'week' | 'holiday_group';
  weekNums: number[];
}[] {
  const result: { type: 'week' | 'holiday_group'; weekNums: number[] }[] = [];
  let i = 0;
  while (i < totalWeeks) {
    if (weekRanges[i].isFullHoliday) {
      // Start of a holiday run
      const start = i;
      while (i < totalWeeks && weekRanges[i].isFullHoliday) i++;
      result.push({ type: 'holiday_group', weekNums: Array.from({ length: i - start }, (_, k) => start + 1 + k) });
    } else {
      result.push({ type: 'week', weekNums: [i + 1] });
      i++;
    }
  }
  return result;
}

export function SemesterTimeline({ initialRoutineUrl, isCR, initialSemesterConfig, initialHolidayDays }: SemesterTimelineProps) {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();

  // Read preloaded hub data — announcements/deadlines/results already in memory
  const { announcements: hubAnnouncements, deadlines: hubDeadlines, results: hubResults } = useStudentHub();

  // Seed initial state from layout-preloaded props — no mount-time DB fetch needed
  const [totalWeeks, setTotalWeeksState] = useState<number>(initialSemesterConfig?.total_weeks ?? 14);
  const [startDate, setStartDate] = useState<string>(initialSemesterConfig?.start_date ?? '2026-05-20');
  const currentWeek = getCurrentWeekNumber(startDate, totalWeeks);
  const [selectedWeek, setSelectedWeek] = useState<number>(() => {
    const cur = getCurrentWeekNumber(
      initialSemesterConfig?.start_date ?? '2026-05-20',
      initialSemesterConfig?.total_weeks ?? 14
    );
    return cur !== null ? cur : 1;
  });
  const [isPending, startTransition] = useTransition();
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);
  const [hasScrolledInit, setHasScrolledInit] = useState(false);
  // Seed holidays from layout-preloaded props — no mount-time fetch needed
  const [holidays, setHolidays] = useState<HolidaySlot[]>(initialHolidayDays);
  const [isTogglingHoliday, setIsTogglingHoliday] = useState(false);
  const [isChangingWeeks, setIsChangingWeeks] = useState(false);

  const weekListRef = useRef<HTMLDivElement>(null);

  // ── Week-mapping computation ─────────────────────────────────────────────
  // Derives per-day timeline data from hub context — zero network calls.
  // Hub already has ALL announcements/deadlines/results. We just filter by date.
  const computeAllWeeksData = useCallback((weeksCount: number, startD: string) => {
    const dayNames = ['SAT', 'SUN', 'MON', 'TUE', 'WED'];
    const weekMap: Record<number, any[]> = {};
    for (let w = 1; w <= weeksCount; w++) {
      const { days } = getWeekDates(w, startD);
      weekMap[w] = days.map((dayDate, index) => {
        const dateStr = toISODateString(dayDate);
        const filterByDay = (itemDateStr: string) => {
          if (!itemDateStr) return false;
          try { return toISODateString(new Date(itemDateStr)) === dateStr; } catch { return false; }
        };
        return {
          dateStr,
          dayName: dayNames[index],
          dateLabel: dayDate.toLocaleDateString('en-US', { timeZone: 'Asia/Dhaka', month: 'short', day: 'numeric' }),
          announcements: hubAnnouncements.filter(a => filterByDay(a.created_at)),
          deadlines: hubDeadlines.filter(d => filterByDay(d.due_date)),
          results: hubResults.filter(r => filterByDay(r.published_at)),
        };
      });
    }
    return weekMap;
  }, [hubAnnouncements, hubDeadlines, hubResults]);

  // Initialize allWeeksData synchronously from hub context — no async, no spinner
  const [allWeeksData, setAllWeeksData] = useState<Record<number, any[]>>(() =>
    computeAllWeeksData(
      initialSemesterConfig?.total_weeks ?? 14,
      initialSemesterConfig?.start_date ?? '2026-05-20'
    )
  );
  const weekData = allWeeksData[selectedWeek] || [];

  // Recompute week mapping when hub data refreshes (e.g. new announcement posted)
  useEffect(() => {
    setAllWeeksData(computeAllWeeksData(totalWeeks, startDate));
  }, [computeAllWeeksData, totalWeeks, startDate]);


  // Drag scroll ref properties
  const isMouseDownRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const dragMovedRef = useRef(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    const container = weekListRef.current;
    if (!container) return;
    isMouseDownRef.current = true;
    container.style.cursor = 'grabbing';
    startXRef.current = e.pageX - container.offsetLeft;
    scrollLeftRef.current = container.scrollLeft;
    dragMovedRef.current = false;
  };

  const handleMouseLeave = () => {
    isMouseDownRef.current = false;
    const container = weekListRef.current;
    if (container) {
      container.style.cursor = 'grab';
    }
  };

  const handleMouseUp = () => {
    isMouseDownRef.current = false;
    const container = weekListRef.current;
    if (container) {
      container.style.cursor = 'grab';
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isMouseDownRef.current) return;
    const container = weekListRef.current;
    if (!container) return;
    e.preventDefault();
    const x = e.pageX - container.offsetLeft;
    const walk = (x - startXRef.current) * 1.5;
    if (Math.abs(walk) > 5) {
      dragMovedRef.current = true;
    }
    container.scrollLeft = scrollLeftRef.current - walk;
  };
  const holidayDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const channel = supabase
      .channel('timeline-changes-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'holiday_days' },
        () => {
          if (holidayDebounceRef.current) clearTimeout(holidayDebounceRef.current);
          holidayDebounceRef.current = setTimeout(async () => {
            const [updatedHolidays, updatedAllData] = await Promise.all([
              getHolidayDays(),
              getAllSemesterTimelineData(totalWeeks, startDate),
            ]);
            setHolidays(updatedHolidays);
            setAllWeeksData(updatedAllData);
          }, 600);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'semester_config' },
        async () => {
          const { data } = await supabase
            .from('semester_config')
            .select('total_weeks, start_date')
            .eq('id', 1)
            .maybeSingle();
          if (data) {
            setTotalWeeksState(data.total_weeks);
            setStartDate(data.start_date);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'class_routine' },
        () => {
          router.refresh();
        }
      )
      .subscribe();

    return () => {
      if (holidayDebounceRef.current) clearTimeout(holidayDebounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [supabase, router, totalWeeks, startDate]);

  // Scroll to current/selected week
  useEffect(() => {
    if (weekListRef.current) {
      if (!hasScrolledInit) {
        const isMobile = window.innerWidth < 640;
        const threshold = isMobile ? 2 : 4;
        if (currentWeek && currentWeek > threshold) {
          const activeCard = weekListRef.current.querySelector(`[data-week="${currentWeek}"]`);
          if (activeCard) {
            setTimeout(() => {
              activeCard.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'center' });
            }, 100);
          }
        } else {
          weekListRef.current.scrollLeft = 0;
        }
        setHasScrolledInit(true);
      } else {
        const activeCard = weekListRef.current.querySelector(`[data-week="${selectedWeek}"]`);
        if (activeCard) {
          activeCard.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
      }
    }
  }, [selectedWeek, currentWeek, hasScrolledInit]);



  function getWeekRangeLabel(weekNum: number): { line1: string; line2: string } {
    const { saturday } = getWeekDates(weekNum, startDate);
    const friday = new Date(saturday);
    friday.setDate(saturday.getDate() + 6);
    const f = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return { line1: f(saturday), line2: f(friday) };
  }

  const [todayStr, setTodayStr] = useState<string>('');
  useEffect(() => {
    setTodayStr(toISODateString(new Date()));
  }, []);

  // Compute per-week class-day ranges (dynamic totalWeeks)
  const weekRanges = computeWeekDayRanges(holidays, totalWeeks);

  // Compute display groups (merging consecutive all-holiday weeks)
  // For students, filter out holiday groups completely so they don't see "Holiday Break" cards.
  const displayGroups = getHolidayGroups(weekRanges, totalWeeks).filter(
    (group) => isCR || group.type !== 'holiday_group'
  );

  const currentGroupIndex = displayGroups.findIndex((g) => g.weekNums.includes(selectedWeek));

  function scrollWeeks(direction: 'left' | 'right') {
    if (direction === 'left') {
      if (currentGroupIndex > 0) {
        const prevGroup = displayGroups[currentGroupIndex - 1];
        setSelectedWeek(prevGroup.weekNums[0]);
      }
    } else {
      if (currentGroupIndex < displayGroups.length - 1) {
        const nextGroup = displayGroups[currentGroupIndex + 1];
        setSelectedWeek(nextGroup.weekNums[0]);
      }
    }
  }

  const isWholeWeekHoliday = weekRanges[selectedWeek - 1]?.isFullHoliday;

  function getDisplayWeekNumber(w: number): number {
    let num = 0;
    for (let i = 1; i <= w; i++) {
      if (i === w || !weekRanges[i - 1]?.isFullHoliday) {
        num++;
      }
    }
    return num;
  }

  async function handleAddWeek() {
    setIsChangingWeeks(true);
    const next = totalWeeks + 1;
    const result = await setTotalWeeks(next);
    if (result.success) {
      setTotalWeeksState(next);
      setSelectedWeek(next);
    } else {
      console.error('Failed to add week:', result.error);
    }
    setIsChangingWeeks(false);
  }

  async function handleRemoveLastWeek() {
    if (totalWeeks <= 1) return;
    setIsChangingWeeks(true);
    const next = totalWeeks - 1;
    const result = await setTotalWeeks(next);
    if (result.success) {
      setTotalWeeksState(next);
      if (selectedWeek > next) setSelectedWeek(next);
    } else {
      console.error('Failed to remove week:', result.error);
    }
    setIsChangingWeeks(false);
  }

  function getHolidayGroupRangeLabel(weeks: number[]): string {
    const startWeek = weeks[0];
    const endWeek = weeks[weeks.length - 1];
    
    const { saturday: startSat } = getWeekDates(startWeek, startDate);
    const { saturday: endSat } = getWeekDates(endWeek, startDate);
    const endFri = new Date(endSat);
    endFri.setDate(endSat.getDate() + 6);
    
    const f = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${f(startSat)} – ${f(endFri)}`;
  }

  // Auto-redirect students to nearest non-holiday week if they land on a holiday week
  useEffect(() => {
    if (!isCR && weekRanges.length > 0) {
      const isSelectedHoliday = weekRanges[selectedWeek - 1]?.isFullHoliday;
      if (isSelectedHoliday) {
        // Find next non-holiday week
        let targetWeek = -1;
        for (let w = selectedWeek; w <= totalWeeks; w++) {
          if (!weekRanges[w - 1]?.isFullHoliday) {
            targetWeek = w;
            break;
          }
        }
        if (targetWeek === -1) {
          for (let w = selectedWeek; w >= 1; w--) {
            if (!weekRanges[w - 1]?.isFullHoliday) {
              targetWeek = w;
              break;
            }
          }
        }
        if (targetWeek !== -1 && targetWeek !== selectedWeek) {
          setSelectedWeek(targetWeek);
        }
      }
    }
  }, [holidays, isCR, selectedWeek, weekRanges]);

  // Total class days in semester
  const totalClassDays = weekRanges.reduce((sum, w) => sum + w.classDays, 0);

  // Holiday set for O(1) lookup in day rows
  const holidaySet = new Set(holidays.map((h) => `${h.week_number}-${h.day_index}`));

  const dayNames = ['SAT', 'SUN', 'MON', 'TUE', 'WED'];

  async function handleToggleHoliday(weekNumber: number, dayIndex: number) {
    setIsTogglingHoliday(true);
    try {
      const result = await toggleHolidayDay(weekNumber, dayIndex);
      if (result.success) {
        // Optimistically update local state
        if (result.isNowHoliday) {
          setHolidays((prev) => [...prev, { week_number: weekNumber, day_index: dayIndex, note: null }]);
        } else {
          setHolidays((prev) => prev.filter((h) => !(h.week_number === weekNumber && h.day_index === dayIndex)));
        }
      } else {
        console.error('Toggle holiday failed:', result.error);
      }
    } finally {
      setIsTogglingHoliday(false);
    }
  }

  async function handleToggleWholeWeekHoliday() {
    setIsTogglingHoliday(true);
    try {
      const nextState = !isWholeWeekHoliday;
      const result = await setWeekHoliday(selectedWeek, nextState);
      if (result.success) {
        if (nextState) {
          setHolidays((prev) => {
            const cleared = prev.filter((h) => h.week_number !== selectedWeek);
            const added = Array.from({ length: 5 }, (_, d) => ({
              week_number: selectedWeek,
              day_index: d,
              note: 'Whole Week Holiday',
            }));
            return [...cleared, ...added];
          });
        } else {
          setHolidays((prev) => prev.filter((h) => h.week_number !== selectedWeek));
        }
      } else {
        console.error('Toggle whole week holiday failed:', result.error);
      }
    } catch (err) {
      console.error('Toggle whole week error:', err);
    } finally {
      setIsTogglingHoliday(false);
    }
  }

  return (
    <>
      <style>{`
        .tl-scroll::-webkit-scrollbar { display: none; }
        .tl-scroll { -ms-overflow-style: none; scrollbar-width: none; }
        .week-glow {
          border-color: hsl(var(--primary)) !important;
          animation: week-glow-breathing 3s ease-in-out infinite;
        }
        .dot-glow { box-shadow: 0 0 0 4px hsl(var(--primary) / 0.22), 0 0 14px 3px hsl(var(--primary) / 0.5); }
        .row-glow {
          border-color: hsl(var(--primary)) !important;
          animation: row-glow-breathing 3s ease-in-out infinite;
        }
        .info-pill {
          background: hsl(var(--card) / 0.95);
          border: 1px solid hsl(var(--border));
        }
        .holiday-row-glow { box-shadow: 0 0 0 1px hsl(var(--border)); }
        @keyframes shimmer { 0%,100% { opacity: 0.75; } 50% { opacity: 0.45; } }
        .holiday-shimmer { animation: shimmer 3s ease-in-out infinite; }
        @keyframes week-glow-breathing {
          0%, 100% {
            box-shadow: 0 0 0 1.5px hsl(var(--primary)), 0 0 11px 1px hsl(var(--primary) / 0.12), inset 0 0 10px 0 hsl(var(--primary) / 0.02);
          }
          50% {
            box-shadow: 0 0 0 1.5px hsl(var(--primary)), 0 0 22px 2px hsl(var(--primary) / 0.28), inset 0 0 16px 0 hsl(var(--primary) / 0.06);
          }
        }
        @keyframes row-glow-breathing {
          0%, 100% {
            box-shadow: 0 0 0 1.5px hsl(var(--primary)), 0 0 12px 1px hsl(var(--primary) / 0.12);
          }
          50% {
            box-shadow: 0 0 0 1.5px hsl(var(--primary)), 0 0 24px 3px hsl(var(--primary) / 0.25);
          }
        }
        @keyframes current-glow-pulse {
          0%, 100% {
            border-color: hsl(var(--primary) / 0.25);
            box-shadow: 0 0 8px 0 hsl(var(--primary) / 0.08);
          }
          50% {
            border-color: hsl(var(--primary) / 0.6);
            box-shadow: 0 0 16px 2px hsl(var(--primary) / 0.2);
          }
        }
        .current-week-card-pulse {
          animation: current-glow-pulse 3s ease-in-out infinite;
        }
        .btn-mark-week-holiday {
          background: rgba(217, 119, 6, 0.08);
          border: 1px solid rgba(217, 119, 6, 0.35);
          color: #27272a; /* zinc-800 */
          transition: all 0.2s ease;
        }
        .btn-mark-week-holiday:hover:not(:disabled) {
          background: rgba(217, 119, 6, 0.16);
          border-color: rgba(217, 119, 6, 0.65);
          box-shadow: 0 0 12px 1px rgba(217, 119, 6, 0.15);
        }
        .dark .btn-mark-week-holiday {
          background: rgba(245, 158, 11, 0.08);
          border: 1px solid rgba(245, 158, 11, 0.35);
          color: #ffffff;
        }
        .dark .btn-mark-week-holiday:hover:not(:disabled) {
          background: rgba(245, 158, 11, 0.16);
          border-color: rgba(245, 158, 11, 0.65);
          box-shadow: 0 0 12px 1px rgba(245, 158, 11, 0.15);
        }
        .btn-unmark-week-holiday {
          background: rgba(100, 116, 139, 0.08);
          border: 1px solid rgba(100, 116, 139, 0.35);
          color: #475569; /* slate-600 */
          transition: all 0.2s ease;
        }
        .btn-unmark-week-holiday:hover:not(:disabled) {
          background: rgba(100, 116, 139, 0.16);
          border-color: rgba(100, 116, 139, 0.55);
          color: #1e293b;
        }
        .dark .btn-unmark-week-holiday {
          background: rgba(75, 85, 99, 0.12);
          border: 1px solid rgba(75, 85, 99, 0.35);
          color: #e5e7eb;
        }
        .dark .btn-unmark-week-holiday:hover:not(:disabled) {
          background: rgba(75, 85, 99, 0.22);
          border-color: rgba(75, 85, 99, 0.65);
          color: #ffffff;
        }
        .btn-inline-mark-holiday {
          background: hsl(var(--card));
          border: 1px solid hsl(var(--border));
          color: hsl(var(--muted-foreground));
          transition: all 0.2s ease;
        }
        .btn-inline-mark-holiday:hover:not(:disabled) {
          background: hsl(var(--accent));
          border-color: hsl(var(--border));
          color: hsl(var(--foreground));
        }
      `}</style>

      <div
        className="w-full min-h-[calc(100vh-4rem)] text-foreground bg-background font-sans"
      >
        {/* ── Inner container ── */}
        <div className="max-w-7xl mx-auto px-0 py-2 flex flex-col gap-5">

          {/* ── Page header ── */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-[22px] font-bold tracking-tight text-foreground">Semester Timeline</h1>
              <p className="text-[13px] text-muted-foreground mt-1">
                {totalClassDays} class days · {totalWeeks} weeks in semester
              </p>
            </div>
            <div className="flex flex-col items-end gap-2 flex-shrink-0 mt-0.5">
              <RoutineButton initialImageUrl={initialRoutineUrl} isCR={isCR} />
              <AbsentTrackerButton />
            </div>
          </div>

          {/* ── Week selector ── */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">

              {/* Left arrow */}
              <button
                onClick={() => scrollWeeks('left')}
                disabled={currentGroupIndex <= 0}
                aria-label="Scroll left"
                className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Scrollable week cards */}
              <div
                ref={weekListRef}
                onMouseDown={handleMouseDown}
                onMouseLeave={handleMouseLeave}
                onMouseUp={handleMouseUp}
                onMouseMove={handleMouseMove}
                className="flex-1 flex gap-3 overflow-x-auto tl-scroll pt-7 pb-4 select-none cursor-grab"
                style={{ WebkitOverflowScrolling: 'touch' }}
              >
                {displayGroups.map((group) => {
                  if (group.type === 'holiday_group') {
                    // ── Collapsed Holiday Break pill ──
                    const weeks = group.weekNums;
                    const rangeLabel = getHolidayGroupRangeLabel(weeks);
                    // Check if selected week is inside this group
                    const isSelected = weeks.includes(selectedWeek);
                    return (
                      <button
                        key={`hg-${weeks[0]}`}
                        data-week={weeks[0]}
                        onClick={() => { if (!dragMovedRef.current) setSelectedWeek(weeks[0]); }}
                        className={`flex-shrink-0 relative flex flex-col items-center justify-center gap-1 cursor-pointer select-none transition-all duration-200 rounded-xl holiday-shimmer ${isSelected ? 'week-glow' : ''}`}
                        style={{
                          width: weeks.length > 1 ? Math.min(80 + weeks.length * 20, 180) : 145,
                          minWidth: 145,
                          height: 115,
                          padding: '0 12px',
                          background: 'hsl(var(--card))',
                          border: isSelected ? '1px solid hsl(var(--primary))' : '1px dashed hsl(var(--border))',
                          marginTop: 0,
                          opacity: 1,
                        }}
                      >
                        {/* Collapsed holiday badge */}
                        <span
                          className="absolute text-[7px] font-black tracking-[0.15em] uppercase bg-amber-500/10 dark:bg-amber-500/12 border border-amber-500/35 dark:border-amber-500/30 text-zinc-800 dark:text-[#fbbf24]"
                          style={{
                            top: -18,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            padding: '2px 8px',
                            borderRadius: 4,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          HOLIDAY BREAK
                        </span>

                        <Umbrella className="w-6 h-6 text-amber-500 mb-1" />
                        <span
                          className="font-bold tracking-tight text-center leading-tight"
                          style={{ 
                            fontSize: 14,
                            color: isSelected ? 'hsl(var(--primary))' : 'hsl(var(--foreground))'
                          }}
                        >
                          Holiday Break
                        </span>
                        <span
                          className="font-medium tracking-normal block mt-1"
                          style={{ 
                            fontSize: 12,
                            color: isSelected ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
                            opacity: 1
                          }}
                        >
                          {rangeLabel}
                        </span>
                      </button>
                    );
                  }

                  // ── Normal Week card ──
                  const weekNum = group.weekNums[0];
                  const isSelected = selectedWeek === weekNum;
                  const isCurrent = currentWeek === weekNum;
                  const rangeLabel = getWeekRangeLabel(weekNum);
                  const wr = weekRanges[weekNum - 1];

                  return (
                    <button
                      key={weekNum}
                      data-week={weekNum}
                      onClick={() => { if (!dragMovedRef.current) setSelectedWeek(weekNum); }}
                      className={`flex-shrink-0 relative flex flex-col items-center justify-center cursor-pointer select-none transition-all duration-200 rounded-xl ${
                        isSelected 
                          ? 'week-glow' 
                          : isCurrent 
                            ? 'current-week-card-pulse' 
                            : ''
                      }`}
                      style={{
                        width: 145,
                        minWidth: 145,
                        height: 115,
                        padding: '0 12px',
                        background: isSelected ? 'hsl(var(--primary) / 0.08)' : 'hsl(var(--card))',
                        border: isSelected 
                          ? '1px solid hsl(var(--primary))' 
                          : isCurrent 
                            ? '1px solid hsl(var(--primary) / 0.3)' 
                            : '1px solid hsl(var(--border))',
                        marginTop: 0,
                        opacity: 1,
                      }}
                    >
                      {/* CURRENT badge */}
                      {isCurrent && (
                        <span
                          className="absolute text-[7px] font-black tracking-[0.15em] uppercase bg-emerald-500/10 dark:bg-emerald-500/12 border border-emerald-500/35 dark:border-emerald-500/35 text-zinc-800 dark:text-[#10B981]"
                          style={{
                            top: -18,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            padding: '2px 8px',
                            borderRadius: 4,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          CURRENT
                        </span>
                      )}

                      {/* Week label */}
                      <span
                        className="font-bold tracking-tight leading-none block"
                        style={{
                          fontSize: 19,
                          color: isSelected ? 'hsl(var(--primary))' : 'hsl(var(--foreground))',
                          marginBottom: 8,
                        }}
                      >
                        Week {getDisplayWeekNumber(weekNum)}
                      </span>

                      {/* Date range */}
                      <span
                        className="block font-medium tracking-normal leading-none"
                        style={{
                          fontSize: 13,
                          color: isSelected ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
                          opacity: 1,
                        }}
                      >
                        {rangeLabel.line1} - {rangeLabel.line2}
                      </span>

                      {/* Bottom pointer triangle */}
                      {isSelected && (
                        <div
                          className="absolute"
                          style={{
                            bottom: -8,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            width: 0,
                            height: 0,
                            borderLeft: '7px solid transparent',
                            borderRight: '7px solid transparent',
                            borderTop: '7px solid hsl(var(--primary))',
                          }}
                        />
                      )}
                    </button>
                  );
                })}

                {/* ── Add / Remove Week buttons (CR only) ── */}
                {isCR && (
                  <div className="flex-shrink-0 flex flex-col gap-2 items-center justify-center ml-1">
                    <button
                      onClick={handleAddWeek}
                      disabled={isChangingWeeks || totalWeeks >= 52}
                      title={`Add Week ${totalWeeks + 1}`}
                      className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-2 rounded-xl text-emerald-400 border border-emerald-500/25 bg-emerald-500/8 hover:bg-emerald-500/15 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      style={{ minWidth: 90, height: 48 }}
                    >
                      <Plus className="w-3.5 h-3.5 flex-shrink-0" />
                      Add Week
                    </button>
                    {totalWeeks > 14 && (
                      <button
                        onClick={handleRemoveLastWeek}
                        disabled={isChangingWeeks || totalWeeks <= 1}
                        title={`Remove Week ${totalWeeks}`}
                        className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-2 rounded-xl text-rose-400 border border-rose-500/25 bg-rose-500/8 hover:bg-rose-500/15 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        style={{ minWidth: 90, height: 48 }}
                      >
                        <Minus className="w-3.5 h-3.5 flex-shrink-0" />
                        Remove
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Right arrow */}
              <button
                onClick={() => scrollWeeks('right')}
                disabled={currentGroupIndex >= displayGroups.length - 1}
                aria-label="Scroll right"
                className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ── Day rows container ── */}
          <div className="w-full max-w-5xl mx-auto flex flex-col gap-2.5">
            {isPending || weekData.length === 0 ? (
              // Skeleton rows
              <div className="flex flex-col gap-2.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-full flex items-center px-3 sm:px-6 py-3 lg:py-4 rounded-2xl border"
                    style={{
                      background: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                      borderWidth: '1px',
                    }}
                  >
                    <div className="flex flex-col justify-center w-11 sm:w-14 lg:w-16 flex-shrink-0 text-left pr-1 sm:pr-2">
                      <div className="h-4 w-8 rounded bg-muted animate-pulse" />
                      <div className="h-3 w-6 rounded bg-muted/80 animate-pulse mt-2" />
                    </div>
                    <div className="w-px h-8 bg-border flex-shrink-0 mr-2 sm:mr-4 lg:mr-6" />
                    
                    {/* Day Count skeleton */}
                    <div className="flex flex-col items-center text-center flex-shrink-0 min-w-[32px] sm:min-w-[40px] mr-2 sm:mr-4 lg:mr-6">
                      <div className="hidden sm:block h-2.5 w-6 rounded bg-muted/80 animate-pulse mb-1.5" />
                      <div className="h-3.5 w-5 rounded bg-muted animate-pulse" />
                    </div>

                    <div className="w-px h-8 bg-border flex-shrink-0 mr-2 sm:mr-4 lg:mr-8" />
                    
                    <div className="flex-1 flex justify-center mr-2 sm:mr-4 lg:mr-8">
                      <div className="w-full max-w-md lg:max-w-lg flex items-center justify-between">
                        {[0, 1, 2].map((j) => (
                          <div key={j} className="flex-1 flex items-center justify-center gap-1.5 sm:gap-3 min-w-0 py-1">
                            <div className="w-4 h-4 sm:w-5 sm:h-5 rounded bg-muted animate-pulse flex-shrink-0" />
                            <div className="flex flex-col items-center text-center">
                              <div className="hidden sm:block h-2 w-10 rounded bg-muted/80 animate-pulse mb-1.5" />
                              <div className="h-3 w-4 rounded bg-muted animate-pulse" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="w-4 h-4 rounded bg-muted/80 animate-pulse flex-shrink-0" />
                  </div>
                ))}
              </div>
            ) : (
              // Real rows
              <div className="flex flex-col gap-2.5">
                {isCR && (
                  <div className="flex justify-end mb-1">
                    <button
                      onClick={handleToggleWholeWeekHoliday}
                      disabled={isTogglingHoliday}
                      className={`text-[11px] font-bold px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                        isWholeWeekHoliday 
                          ? 'btn-unmark-week-holiday' 
                          : 'btn-mark-week-holiday'
                      }`}
                    >
                      {isTogglingHoliday ? (
                        'Updating...'
                      ) : isWholeWeekHoliday ? (
                        <>
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Unmark Week {getDisplayWeekNumber(selectedWeek)} as Holiday</span>
                        </>
                      ) : (
                        <>
                          <Umbrella className="w-3.5 h-3.5" />
                          <span>Mark Week {getDisplayWeekNumber(selectedWeek)} as Holiday</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
                {(() => {
                  // Compute class day numbers once for the entire selected week
                  const dayNumbers = computeDayNumbers(selectedWeek, weekRanges, holidaySet);
                  return weekData.map((day, index) => {
                  const isActive = day.dateStr === todayStr;
                  const isHoliday = holidaySet.has(`${selectedWeek}-${index}`);
                  const classDayNum = dayNumbers[index];

                  if (isHoliday) {
                    // ── Holiday Day Row ──
                    return (
                      <div key={day.dateStr} className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedDayIndex(index)}
                          className="flex-1 flex items-center px-3 sm:px-6 py-3 lg:py-4 rounded-2xl relative border text-left cursor-pointer hover:bg-accent/20"
                          style={{
                            background: 'hsl(var(--background))',
                            borderColor: 'hsl(var(--border))',
                            borderWidth: '1px',
                            borderStyle: 'dashed',
                            opacity: 0.7,
                          }}
                        >
                          {/* Left side: Day name + Date */}
                          <div className="flex flex-col justify-center w-11 sm:w-14 lg:w-16 flex-shrink-0 text-left pr-1 sm:pr-2">
                            <span className="text-[12px] sm:text-[14px] lg:text-[15px] font-extrabold leading-none uppercase text-muted-foreground tracking-wider">
                              {day.dayName}
                            </span>
                            <span className="text-[9px] sm:text-[11px] lg:text-[12px] font-semibold leading-none mt-1 sm:mt-1.5 text-muted-foreground/80">
                              {day.dateLabel}
                            </span>
                          </div>

                          {/* Vertical Divider */}
                          <div className="w-px h-8 bg-border/40 flex-shrink-0 mr-2 sm:mr-4 lg:mr-8" />

                          {/* Holiday center content */}
                          <div className="flex-1 flex items-center justify-center gap-2 mr-2 sm:mr-4 lg:mr-8 text-zinc-800 dark:text-amber-400">
                            <Umbrella className="w-4 h-4 flex-shrink-0" />
                            <span className="text-[11px] sm:text-[12px] font-bold uppercase tracking-[0.15em]">
                              Holiday Break
                            </span>
                          </div>

                          {/* Right chevron */}
                          <ChevronRight
                            className="w-4 h-4 flex-shrink-0 transition-colors text-muted-foreground"
                          />
                        </button>

                        {/* CR: Remove Holiday button (inline, right of row) */}
                        {isCR && (
                          <button
                            onClick={() => handleToggleHoliday(selectedWeek, index)}
                            disabled={isTogglingHoliday}
                            title="Remove Holiday"
                            className="flex flex-shrink-0 w-8 h-8 rounded-xl items-center justify-center transition-all cursor-pointer disabled:opacity-50 border border-amber-500/35 dark:border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20"
                          >
                            <Umbrella className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    );
                  }

                  // ── Normal Day Row ──
                  return (
                    <div key={day.dateStr} className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedDayIndex(index)}
                        className={`flex-1 flex items-center py-3 lg:py-4 rounded-2xl transition-all duration-150 relative border cursor-pointer ${
                          isActive 
                            ? 'px-4 sm:px-7 z-10' 
                            : 'px-3 sm:px-6 hover:bg-accent/20'
                        }`}
                        style={{
                          background: isActive ? 'hsl(var(--primary) / 0.08)' : 'hsl(var(--card))',
                          borderColor: isActive ? 'hsl(var(--primary))' : 'hsl(var(--border))',
                          borderWidth: isActive ? '1.5px' : '1px',
                        }}
                      >
                        {/* Left side: Day name + Date */}
                        <div className="flex flex-col justify-center w-11 sm:w-14 lg:w-16 flex-shrink-0 text-left pr-1 sm:pr-2">
                          <span className="text-[12px] sm:text-[14px] lg:text-[15px] font-extrabold text-foreground leading-none uppercase" style={{ letterSpacing: '0.05em' }}>
                            {day.dayName}
                          </span>
                          <span
                            className="text-[9px] sm:text-[11px] lg:text-[12px] font-semibold leading-none mt-1 sm:mt-1.5"
                            style={{ color: 'hsl(var(--primary))' }}
                          >
                            {day.dateLabel}
                          </span>
                        </div>

                        {/* Vertical Divider */}
                        <div className="w-px h-8 bg-border flex-shrink-0 mr-1.5 sm:mr-4 lg:mr-6" />

                        {/* Day Count Column (shifted left, close to the day text) */}
                        <div className="flex flex-col items-center text-center flex-shrink-0 min-w-[32px] sm:min-w-[40px] mr-1.5 sm:mr-4 lg:mr-6">
                          <span className="hidden sm:block text-[10px] text-muted-foreground font-semibold leading-tight">Day</span>
                          <span className="text-[13px] sm:text-[15px] font-black text-foreground leading-none sm:mt-1">{classDayNum}</span>
                        </div>

                        {/* Second Vertical Divider */}
                        <div className="w-px h-8 bg-border flex-shrink-0 mr-1.5 sm:mr-4 lg:mr-8" />

                        {/* Three count columns */}
                        <div className="flex-1 flex justify-center mr-1.5 sm:mr-4 lg:mr-8">
                          <div className="w-full max-w-2xl lg:max-w-3xl flex items-center justify-between">
                            {/* Deadlines */}
                            <div className="flex-1 flex items-center justify-center gap-1.5 sm:gap-3 min-w-0 py-1">
                              <CalendarGridIcon className="w-4 h-4 sm:w-5 sm:h-5 text-orange-400 flex-shrink-0" />
                              <div className="flex flex-col items-center text-center">
                                <div className="hidden sm:block text-[10px] text-muted-foreground font-semibold leading-tight">Deadlines</div>
                                <div className={`text-[13px] sm:text-[15px] font-black leading-none sm:mt-1 ${day.deadlines.length === 0 ? 'text-muted-foreground' : 'text-foreground'}`}>{day.deadlines.length}</div>
                              </div>
                            </div>

                            <div className="w-px h-6 sm:h-8 bg-border flex-shrink-0" />

                            {/* Announcements */}
                            <div className="flex-1 flex items-center justify-center gap-1.5 sm:gap-3 min-w-0 py-1">
                              <MegaphoneIcon className="w-4 h-4 sm:w-5 sm:h-5 text-brand-purple flex-shrink-0" />
                              <div className="flex flex-col items-center text-center">
                                <div className="hidden sm:block text-[10px] text-muted-foreground font-semibold leading-tight">Announcements</div>
                                <div className={`text-[13px] sm:text-[15px] font-black leading-none sm:mt-1 ${day.announcements.length === 0 ? 'text-muted-foreground' : 'text-foreground'}`}>{day.announcements.length}</div>
                              </div>
                            </div>

                            <div className="w-px h-6 sm:h-8 bg-border flex-shrink-0" />

                            {/* Results */}
                            <div className="flex-1 flex items-center justify-center gap-1.5 sm:gap-3 min-w-0 py-1">
                              <SquarePlusIcon className="w-4 h-4 sm:w-5 sm:h-5 text-brand-cyan flex-shrink-0" />
                              <div className="flex flex-col items-center text-center">
                                <div className="hidden sm:block text-[10px] text-muted-foreground font-semibold leading-tight">Results</div>
                                <div className={`text-[13px] sm:text-[15px] font-black leading-none sm:mt-1 ${day.results.length === 0 ? 'text-muted-foreground' : 'text-foreground'}`}>{day.results.length}</div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Right chevron */}
                        <ChevronRight
                          className="w-4 h-4 flex-shrink-0 transition-colors"
                          style={{ color: isActive ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))' }}
                        />
                      </button>

                      {/* CR: Mark as Holiday button (inline, right of row) */}
                      {isCR && (
                        <button
                          onClick={() => handleToggleHoliday(selectedWeek, index)}
                          disabled={isTogglingHoliday}
                          title="Mark as Holiday"
                          className="flex flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl items-center justify-center transition-all cursor-pointer disabled:opacity-50 btn-inline-mark-holiday"
                        >
                          <Umbrella className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </button>
                      )}
                    </div>
                  );
                  });
                })()}
              </div>
            )}

            {/* ── Info hint pill ── */}
            <div className="flex justify-center mt-4">
              <div className="info-pill flex items-center gap-2.5 rounded-full px-5 py-2">
                <Info
                  className="w-4 h-4 flex-shrink-0"
                  style={{ color: 'hsl(var(--primary))' }}
                />
                <span className="text-[12px] font-medium text-muted-foreground flex items-center gap-1.5 flex-wrap justify-center">
                  {isCR ? (
                    <>
                      Click a day to view details or use
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted border border-border text-amber-500">
                        <Umbrella className="w-3 h-3" />
                      </span>
                      to activate when holiday
                    </>
                  ) : (
                    'Click on a day to view its details'
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Day detail panel */}
      {selectedDayIndex !== null && weekData[selectedDayIndex] && (
        <DayDetailPanel
          isOpen
          onClose={() => setSelectedDayIndex(null)}
          dayName={weekData[selectedDayIndex].dayName}
          dateStr={weekData[selectedDayIndex].dateStr}
          dateLabel={weekData[selectedDayIndex].dateLabel}
          announcements={weekData[selectedDayIndex].announcements}
          deadlines={weekData[selectedDayIndex].deadlines}
          results={weekData[selectedDayIndex].results}
          isCR={isCR}
          isHoliday={holidaySet.has(`${selectedWeek}-${selectedDayIndex}`)}
          weekNumber={selectedWeek}
          dayIndex={selectedDayIndex}
          onToggleHoliday={handleToggleHoliday}
        />
      )}
    </>
  );
}
