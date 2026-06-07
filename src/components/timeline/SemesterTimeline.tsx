'use client';

import { useState, useEffect, useRef, useTransition } from 'react';
import { ChevronLeft, ChevronRight, Info, PalmtreeIcon, Plus, Minus } from 'lucide-react';
import { getWeekDates, getCurrentWeekNumber, toISODateString } from '@/lib/utils/timelineDates';
import { getTimelineData, getHolidayDays, toggleHolidayDay, setWeekHoliday, getTotalWeeks, setTotalWeeks } from '@/lib/actions/timeline';
import { RoutineButton } from './RoutineButton';
import { DayDetailPanel } from './DayDetailPanel';

interface SemesterTimelineProps {
  initialRoutineUrl: string | null;
  isCR: boolean;
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

export function SemesterTimeline({ initialRoutineUrl, isCR }: SemesterTimelineProps) {
  const currentWeek = getCurrentWeekNumber();
  const [selectedWeek, setSelectedWeek] = useState<number>(currentWeek);
  const [weekData, setWeekData] = useState<any[]>([]);
  const [isPending, startTransition] = useTransition();
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);
  const [hasScrolledInit, setHasScrolledInit] = useState(false);
  const [holidays, setHolidays] = useState<HolidaySlot[]>([]);
  const [isTogglingHoliday, setIsTogglingHoliday] = useState(false);
  const [totalWeeks, setTotalWeeksState] = useState<number>(14);
  const [isChangingWeeks, setIsChangingWeeks] = useState(false);

  const weekListRef = useRef<HTMLDivElement>(null);

  // Fetch week data when selected week changes
  useEffect(() => {
    startTransition(async () => {
      const data = await getTimelineData(selectedWeek);
      setWeekData(data);
    });
  }, [selectedWeek]);

  // Fetch holiday data and total weeks once on mount
  useEffect(() => {
    getHolidayDays().then(setHolidays);
    getTotalWeeks().then(setTotalWeeksState);
  }, []);

  // Scroll to current/selected week
  useEffect(() => {
    if (weekListRef.current) {
      if (!hasScrolledInit) {
        const isMobile = window.innerWidth < 640;
        const threshold = isMobile ? 2 : 4;
        if (currentWeek > threshold) {
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

  function scrollWeeks(direction: 'left' | 'right') {
    if (weekListRef.current) {
      weekListRef.current.scrollBy({
        left: direction === 'left' ? -200 : 200,
        behavior: 'smooth',
      });
    }
  }

  function getWeekRangeLabel(weekNum: number): { line1: string; line2: string } {
    const { saturday } = getWeekDates(weekNum);
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
    
    const { saturday: startSat } = getWeekDates(startWeek);
    const { saturday: endSat } = getWeekDates(endWeek);
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
        .week-glow { box-shadow: 0 0 0 1.5px #6366f1, 0 0 24px 2px rgba(99,102,241,0.22), inset 0 0 24px 0 rgba(99,102,241,0.05); }
        .dot-glow { box-shadow: 0 0 0 4px rgba(99,102,241,0.22), 0 0 14px 3px rgba(99,102,241,0.5); }
        .row-glow { box-shadow: 0 0 0 1.5px #6366f1, 0 0 20px 1px rgba(99,102,241,0.18); }
        .info-pill { background: rgba(6,8,19,0.95); border: 1px solid #141b30; }
        .holiday-row-glow { box-shadow: 0 0 0 1px #1e2a4a; }
        @keyframes shimmer { 0%,100% { opacity: 0.7; } 50% { opacity: 0.4; } }
        .holiday-shimmer { animation: shimmer 3s ease-in-out infinite; }
      `}</style>

      <div
        className="w-full min-h-[calc(100vh-4rem)] text-white font-sans"
        style={{ background: '#060813' }}
      >
        {/* ── Inner container ── */}
        <div className="max-w-7xl mx-auto px-0 py-2 flex flex-col gap-5">

          {/* ── Page header ── */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-[22px] font-bold tracking-tight text-white">Semester Timeline</h1>
              <p className="text-[13px] text-slate-400 mt-1">
                {totalClassDays} class days · {totalWeeks} weeks in semester
              </p>
            </div>
            <div className="flex-shrink-0 mt-0.5">
              <RoutineButton initialImageUrl={initialRoutineUrl} isCR={isCR} />
            </div>
          </div>

          {/* ── Week selector ── */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">

              {/* Left arrow */}
              <button
                onClick={() => scrollWeeks('left')}
                aria-label="Scroll left"
                className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
                style={{ background: '#131929', border: '1px solid #1e2a4a' }}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Scrollable week cards */}
              <div
                ref={weekListRef}
                className="flex-1 flex gap-3 overflow-x-auto tl-scroll pt-7 pb-4"
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
                        onClick={() => setSelectedWeek(weeks[0])}
                        className={`flex-shrink-0 relative flex flex-col items-center justify-center gap-1 cursor-pointer select-none transition-all duration-200 rounded-xl holiday-shimmer ${isSelected ? 'week-glow' : ''}`}
                        style={{
                          width: weeks.length > 1 ? Math.min(80 + weeks.length * 20, 180) : 145,
                          minWidth: 145,
                          height: 115,
                          padding: '0 12px',
                          background: '#09090d',
                          border: isSelected ? '1px solid #6366f1' : '1px dashed #1e2540',
                          marginTop: 0,
                          opacity: isSelected ? 1 : 0.65,
                        }}
                      >
                        {/* Collapsed holiday badge */}
                        <span
                          className="absolute text-[7px] font-black tracking-[0.15em] uppercase"
                          style={{
                            top: -18,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            background: 'rgba(239,68,68,0.12)',
                            border: '1px solid rgba(239,68,68,0.3)',
                            color: '#f87171',
                            padding: '2px 8px',
                            borderRadius: 4,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          HOLIDAY BREAK
                        </span>

                        <span className="text-2xl">🏖️</span>
                        <span
                          className="font-semibold text-center leading-tight text-slate-300"
                          style={{ fontSize: 12 }}
                        >
                          Holiday Break
                        </span>
                        <span
                          className="text-[10px] font-medium block mt-1"
                          style={{ color: '#475569' }}
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
                      onClick={() => setSelectedWeek(weekNum)}
                      className={`flex-shrink-0 relative flex flex-col items-center justify-center cursor-pointer select-none transition-all duration-200 rounded-xl${isSelected ? ' week-glow' : ''}`}
                      style={{
                        width: 145,
                        minWidth: 145,
                        height: 115,
                        padding: '0 12px',
                        background: isSelected ? '#0d1230' : '#0b0e1e',
                        border: isSelected ? '1px solid #6366f1' : '1px solid #141b30',
                        marginTop: 0,
                      }}
                    >
                      {/* CURRENT badge */}
                      {isCurrent && (
                        <span
                          className="absolute text-[7px] font-black tracking-[0.15em] uppercase"
                          style={{
                            top: -18,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            background: 'rgba(99,102,241,0.18)',
                            border: '1px solid rgba(99,102,241,0.35)',
                            color: '#a5b4fc',
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
                        className="font-extrabold leading-none block"
                        style={{
                          fontSize: 17,
                          color: isSelected ? '#ffffff' : '#94a3b8',
                          marginBottom: 8,
                        }}
                      >
                        Week {getDisplayWeekNumber(weekNum)}
                      </span>

                      {/* Date range */}
                      <span
                        className="block leading-none"
                        style={{
                          fontSize: 11,
                          color: isSelected ? '#94a3b8' : '#475569',
                          fontWeight: 500,
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
                            borderTop: '7px solid #6366f1',
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
                aria-label="Scroll right"
                className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
                style={{ background: '#131929', border: '1px solid #1e2a4a' }}
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
                      background: '#0b0e1e',
                      borderColor: '#141b30',
                      borderWidth: '1px',
                    }}
                  >
                    <div className="flex flex-col justify-center w-11 sm:w-14 lg:w-16 flex-shrink-0 text-left pr-1 sm:pr-2">
                      <div className="h-4 w-8 rounded bg-slate-800/60 animate-pulse" />
                      <div className="h-3 w-6 rounded bg-slate-800/40 animate-pulse mt-2" />
                    </div>
                    <div className="w-px h-8 bg-[#141b30] flex-shrink-0 mr-2 sm:mr-4 lg:mr-6" />
                    
                    {/* Day Count skeleton */}
                    <div className="flex flex-col items-center text-center flex-shrink-0 min-w-[32px] sm:min-w-[40px] mr-2 sm:mr-4 lg:mr-6">
                      <div className="hidden sm:block h-2.5 w-6 rounded bg-slate-800/40 animate-pulse mb-1.5" />
                      <div className="h-3.5 w-5 rounded bg-slate-800/60 animate-pulse" />
                    </div>

                    <div className="w-px h-8 bg-[#141b30] flex-shrink-0 mr-2 sm:mr-4 lg:mr-8" />
                    
                    <div className="flex-1 flex justify-center mr-2 sm:mr-4 lg:mr-8">
                      <div className="w-full max-w-md lg:max-w-lg flex items-center justify-between">
                        {[0, 1, 2].map((j) => (
                          <div key={j} className="flex-1 flex items-center justify-center gap-1.5 sm:gap-3 min-w-0 py-1">
                            <div className="w-4 h-4 sm:w-5 sm:h-5 rounded bg-slate-800/60 animate-pulse flex-shrink-0" />
                            <div className="flex flex-col items-center text-center">
                              <div className="hidden sm:block h-2 w-10 rounded bg-slate-800/40 animate-pulse mb-1.5" />
                              <div className="h-3 w-4 rounded bg-slate-800/60 animate-pulse" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="w-4 h-4 rounded bg-slate-800/40 animate-pulse flex-shrink-0" />
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
                      className="text-[11px] font-bold px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                      style={{
                        background: isWholeWeekHoliday ? 'rgba(99,102,241,0.08)' : 'rgba(239,68,68,0.08)',
                        border: isWholeWeekHoliday ? '1px solid rgba(99,102,241,0.2)' : '1px solid rgba(239,68,68,0.2)',
                        color: isWholeWeekHoliday ? '#818cf8' : '#f87171',
                      }}
                    >
                      {isTogglingHoliday ? (
                        'Updating...'
                      ) : isWholeWeekHoliday ? (
                        <>
                          <span>📅</span>
                          <span>Unmark Week {getDisplayWeekNumber(selectedWeek)} as Holiday</span>
                        </>
                      ) : (
                        <>
                          <span>🏖️</span>
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
                      <div
                        key={day.dateStr}
                        className="w-full flex items-center px-3 sm:px-6 py-3 lg:py-4 rounded-2xl relative border"
                        style={{
                          background: '#07080f',
                          borderColor: '#0f1520',
                          borderWidth: '1px',
                          borderStyle: 'dashed',
                          opacity: 0.6,
                        }}
                      >
                        {/* Left side: Day name + Date */}
                        <div className="flex flex-col justify-center w-11 sm:w-14 lg:w-16 flex-shrink-0 text-left pr-1 sm:pr-2">
                          <span className="text-[12px] sm:text-[14px] lg:text-[15px] font-extrabold leading-none uppercase tracking-wider" style={{ color: '#3a4255' }}>
                            {day.dayName}
                          </span>
                          <span
                            className="text-[9px] sm:text-[11px] lg:text-[12px] font-semibold leading-none mt-1 sm:mt-1.5"
                            style={{ color: '#2a3148' }}
                          >
                            {day.dateLabel}
                          </span>
                        </div>

                        {/* Vertical Divider */}
                        <div className="w-px h-8 bg-[#0f1520] flex-shrink-0 mr-2 sm:mr-4 lg:mr-8" />

                        {/* Holiday center content */}
                        <div className="flex-1 flex items-center justify-center gap-3 mr-2 sm:mr-4 lg:mr-8">
                          <span className="text-lg">🏖️</span>
                          <span className="text-[12px] sm:text-[13px] font-semibold italic" style={{ color: '#2d3a55' }}>
                            Holiday
                          </span>
                        </div>

                        {/* CR Holiday toggle button */}
                        {isCR && (
                          <button
                            onClick={() => handleToggleHoliday(selectedWeek, index)}
                            disabled={isTogglingHoliday}
                            title="Remove Holiday"
                            className="flex-shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer"
                            style={{
                              background: 'rgba(239,68,68,0.08)',
                              border: '1px solid rgba(239,68,68,0.2)',
                              color: '#f87171',
                            }}
                          >
                            {isTogglingHoliday ? '…' : '✕ Unmark'}
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
                        className={`flex-1 flex items-center px-3 sm:px-6 py-3 lg:py-4 rounded-2xl transition-all duration-150 relative border cursor-pointer ${isActive ? 'row-glow z-10' : 'hover:bg-white/[0.02]'
                          }`}
                        style={{
                          background: isActive ? '#0d1230' : '#0b0e1e',
                          borderColor: isActive ? '#6366f1' : '#141b30',
                          borderWidth: isActive ? '1.5px' : '1px',
                        }}
                      >
                        {/* Left side: Day name + Date */}
                        <div className="flex flex-col justify-center w-11 sm:w-14 lg:w-16 flex-shrink-0 text-left pr-1 sm:pr-2">
                          <span className="text-[12px] sm:text-[14px] lg:text-[15px] font-extrabold text-white leading-none uppercase tracking-wider">
                            {day.dayName}
                          </span>
                          <span
                            className="text-[9px] sm:text-[11px] lg:text-[12px] font-semibold leading-none mt-1 sm:mt-1.5"
                            style={{ color: '#818cf8' }}
                          >
                            {day.dateLabel}
                          </span>
                        </div>

                        {/* Vertical Divider */}
                        <div className="w-px h-8 bg-[#141b30] flex-shrink-0 mr-2 sm:mr-4 lg:mr-6" />

                        {/* Day Count Column (shifted left, close to the day text) */}
                        <div className="flex flex-col items-center text-center flex-shrink-0 min-w-[32px] sm:min-w-[40px] mr-2 sm:mr-4 lg:mr-6">
                          <span className="hidden sm:block text-[10px] text-slate-400 font-semibold leading-tight">Day</span>
                          <span className="text-[13px] sm:text-[15px] font-black text-white leading-none sm:mt-1">{classDayNum}</span>
                        </div>

                        {/* Second Vertical Divider */}
                        <div className="w-px h-8 bg-[#141b30] flex-shrink-0 mr-2 sm:mr-4 lg:mr-8" />

                        {/* Three count columns */}
                        <div className="flex-1 flex justify-center mr-2 sm:mr-4 lg:mr-8">
                          <div className="w-full max-w-md lg:max-w-lg flex items-center justify-between">
                            {/* Deadlines */}
                            <div className="flex-1 flex items-center justify-center gap-1.5 sm:gap-3 min-w-0 py-1">
                              <CalendarGridIcon className="w-4 h-4 sm:w-5 sm:h-5 text-orange-400 flex-shrink-0" />
                              <div className="flex flex-col items-center text-center">
                                <div className="hidden sm:block text-[10px] text-slate-400 font-semibold leading-tight">Deadlines</div>
                                <div className="text-[13px] sm:text-[15px] font-black text-white leading-none sm:mt-1">{day.deadlines.length}</div>
                              </div>
                            </div>

                            <div className="w-px h-6 sm:h-8 bg-[#141b30] flex-shrink-0" />

                            {/* Announcements */}
                            <div className="flex-1 flex items-center justify-center gap-1.5 sm:gap-3 min-w-0 py-1">
                              <MegaphoneIcon className="w-4 h-4 sm:w-5 sm:h-5 text-violet-400 flex-shrink-0" />
                              <div className="flex flex-col items-center text-center">
                                <div className="hidden sm:block text-[10px] text-slate-400 font-semibold leading-tight">Announcements</div>
                                <div className="text-[13px] sm:text-[15px] font-black text-white leading-none sm:mt-1">{day.announcements.length}</div>
                              </div>
                            </div>

                            <div className="w-px h-6 sm:h-8 bg-[#141b30] flex-shrink-0" />

                            {/* Results */}
                            <div className="flex-1 flex items-center justify-center gap-1.5 sm:gap-3 min-w-0 py-1">
                              <SquarePlusIcon className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 flex-shrink-0" />
                              <div className="flex flex-col items-center text-center">
                                <div className="hidden sm:block text-[10px] text-slate-400 font-semibold leading-tight">Results</div>
                                <div className="text-[13px] sm:text-[15px] font-black text-white leading-none sm:mt-1">{day.results.length}</div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Right chevron */}
                        <ChevronRight
                          className="w-4 h-4 flex-shrink-0 transition-colors"
                          style={{ color: isActive ? '#818cf8' : '#334155' }}
                        />
                      </button>

                      {/* CR: Mark as Holiday button (inline, right of row) */}
                      {isCR && (
                        <button
                          onClick={() => handleToggleHoliday(selectedWeek, index)}
                          disabled={isTogglingHoliday}
                          title="Mark as Holiday"
                          className="flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer"
                          style={{
                            background: 'rgba(239,68,68,0.06)',
                            border: '1px solid rgba(239,68,68,0.15)',
                            color: '#f87171',
                            opacity: isTogglingHoliday ? 0.5 : 0.7,
                          }}
                        >
                          <span className="text-[14px]">🏖️</span>
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
                  style={{ color: '#6366f1' }}
                />
                <span className="text-[12px] font-medium text-slate-400">
                  {isCR ? 'Click a day to view details or use 🏖️ to mark as holiday' : 'Click on a day to view its details'}
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
