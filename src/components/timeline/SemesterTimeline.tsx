'use client';

import { useState, useEffect, useRef, useTransition } from 'react';
import { ChevronLeft, ChevronRight, Info } from 'lucide-react';
import { getWeekDates, getCurrentWeekNumber, toISODateString } from '@/lib/utils/timelineDates';
import { getTimelineData } from '@/lib/actions/timeline';
import { RoutineButton } from './RoutineButton';
import { DayDetailPanel } from './DayDetailPanel';

interface SemesterTimelineProps {
  initialRoutineUrl: string | null;
  isCR: boolean;
}

/* ── Icon Components matching the Figma exactly ── */

// Orange calendar grid icon (Deadlines)
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

// Purple megaphone/speaker icon (Announcements)
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

// Green square-plus icon (Results)
function SquarePlusIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 8v8M8 12h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}



export function SemesterTimeline({ initialRoutineUrl, isCR }: SemesterTimelineProps) {
  const currentWeek = getCurrentWeekNumber();
  const [selectedWeek, setSelectedWeek] = useState<number>(currentWeek);
  const [weekData, setWeekData] = useState<any[]>([]);
  const [isPending, startTransition] = useTransition();
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);

  const weekListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    startTransition(async () => {
      const data = await getTimelineData(selectedWeek);
      setWeekData(data);
    });
  }, [selectedWeek]);

  useEffect(() => {
    if (weekListRef.current) {
      const activeCard = weekListRef.current.querySelector(`[data-week="${selectedWeek}"]`);
      if (activeCard) {
        activeCard.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [selectedWeek]);

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
    // On mobile (narrow cards): split into two lines
    return { line1: f(saturday), line2: f(friday) };
  }

  const todayStr = toISODateString(new Date());

  return (
    <>
      <style>{`
        .tl-scroll::-webkit-scrollbar { display: none; }
        .tl-scroll { -ms-overflow-style: none; scrollbar-width: none; }
        .week-glow { box-shadow: 0 0 0 1.5px #6366f1, 0 0 24px 2px rgba(99,102,241,0.22), inset 0 0 24px 0 rgba(99,102,241,0.05); }
        .dot-glow { box-shadow: 0 0 0 4px rgba(99,102,241,0.22), 0 0 14px 3px rgba(99,102,241,0.5); }
        .row-glow { box-shadow: 0 0 0 1.5px #6366f1, 0 0 20px 1px rgba(99,102,241,0.18); }
        .info-pill { background: rgba(6,8,19,0.95); border: 1px solid #141b30; }
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
              <p className="text-[13px] text-slate-400 mt-1">Scroll left or right to explore your 14 week journey</p>
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
                {Array.from({ length: 14 }, (_, i) => i + 1).map((weekNum) => {
                  const isSelected = selectedWeek === weekNum;
                  const isCurrent = currentWeek === weekNum;
                  const rangeLabel = getWeekRangeLabel(weekNum);

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
                      {/* CURRENT badge — floats above the card */}
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
                          marginBottom: 10,
                        }}
                      >
                        Week {weekNum}
                      </span>

                      {/* Date range */}
                      <span
                        className="block leading-none"
                        style={{
                          fontSize: 12,
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
                    className="w-full flex items-center px-6 py-3.5 lg:py-4 rounded-2xl border"
                    style={{
                      background: '#0b0e1e',
                      borderColor: '#141b30',
                      borderWidth: '1px',
                    }}
                  >
                    {/* Left side skeleton */}
                    <div className="flex flex-col justify-center w-14 lg:w-16 flex-shrink-0 text-left pr-2">
                      <div className="h-4 w-10 rounded bg-slate-800/60 animate-pulse" />
                      <div className="h-3 w-8 rounded bg-slate-800/40 animate-pulse mt-2" />
                    </div>

                    {/* Divider */}
                    <div className="w-px h-8 bg-[#141b30] flex-shrink-0 mr-4 lg:mr-8" />

                    {/* Right side skeleton card */}
                    <div className="flex-1 flex justify-center mr-4 lg:mr-8">
                      <div className="w-full max-w-md lg:max-w-lg flex items-center justify-between">
                        {/* S1 */}
                        <div className="flex-1 flex items-center justify-center gap-3 min-w-0 py-1">
                          <div className="w-5 h-5 rounded-lg bg-slate-800/60 animate-pulse flex-shrink-0" />
                          <div className="flex flex-col gap-1.5 text-left">
                            <div className="h-2.5 w-12 rounded bg-slate-800/40 animate-pulse" />
                            <div className="h-4 w-5 rounded bg-slate-800/60 animate-pulse" />
                          </div>
                        </div>
                        <div className="w-px h-8 bg-[#141b30] flex-shrink-0" />

                        {/* S2 */}
                        <div className="flex-1 flex items-center justify-center gap-3 min-w-0 py-1">
                          <div className="w-5 h-5 rounded-lg bg-slate-800/60 animate-pulse flex-shrink-0" />
                          <div className="flex flex-col gap-1.5 text-left">
                            <div className="h-2.5 w-12 rounded bg-slate-800/40 animate-pulse" />
                            <div className="h-4 w-5 rounded bg-slate-800/60 animate-pulse" />
                          </div>
                        </div>
                        <div className="w-px h-8 bg-[#141b30] flex-shrink-0" />

                        {/* S3 */}
                        <div className="flex-1 flex items-center justify-center gap-3 min-w-0 py-1">
                          <div className="w-5 h-5 rounded-lg bg-slate-800/60 animate-pulse flex-shrink-0" />
                          <div className="flex flex-col gap-1.5 text-left">
                            <div className="h-2.5 w-12 rounded bg-slate-800/40 animate-pulse" />
                            <div className="h-4 w-5 rounded bg-slate-800/60 animate-pulse" />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="w-4 h-4 rounded bg-slate-800/40 animate-pulse flex-shrink-0" />
                  </div>
                ))}
              </div>
            ) : (
              // Real rows
              <div className="flex flex-col gap-1">
                {weekData.map((day, index) => {
                  const isActive = day.dateStr === todayStr;

                  return (
                    <button
                      key={day.dateStr}
                      onClick={() => setSelectedDayIndex(index)}
                      className={`w-full flex items-center px-6 py-3.5 lg:py-4 rounded-2xl transition-all duration-150 relative border cursor-pointer ${isActive ? 'row-glow z-10' : 'hover:bg-white/[0.02]'
                        }`}
                      style={{
                        background: isActive ? '#0d1230' : '#0b0e1e',
                        borderColor: isActive ? '#6366f1' : '#141b30',
                        borderWidth: isActive ? '1.5px' : '1px',
                      }}
                    >
                      {/* Left side: Day name + Date */}
                      <div className="flex flex-col justify-center w-14 lg:w-16 flex-shrink-0 text-left pr-2">
                        <span className="text-[14px] lg:text-[15px] font-extrabold text-white leading-none uppercase tracking-wider">
                          {day.dayName}
                        </span>
                        <span
                          className="text-[11px] lg:text-[12px] font-semibold leading-none mt-1.5"
                          style={{ color: '#818cf8' }}
                        >
                          {day.dateLabel}
                        </span>
                      </div>

                      {/* Vertical Divider */}
                      <div className="w-px h-8 bg-[#141b30] flex-shrink-0 mr-4 lg:mr-8" />

                      {/* Three count columns with vertical dividers */}
                      <div className="flex-1 flex justify-center mr-4 lg:mr-8">
                        <div className="w-full max-w-md lg:max-w-lg flex items-center justify-between">
                          {/* Deadlines */}
                          <div className="flex-1 flex items-center justify-center gap-3 min-w-0 py-1">
                            <CalendarGridIcon className="w-5 h-5 text-orange-400 flex-shrink-0" />
                            <div className="text-left">
                              <div className="text-[10px] text-slate-400 font-semibold leading-tight">Deadlines</div>
                              <div className="text-[15px] font-black text-white leading-none mt-1">{day.deadlines.length}</div>
                            </div>
                          </div>

                          {/* Divider */}
                          <div className="w-px h-8 bg-[#141b30] flex-shrink-0" />

                          {/* Announcements */}
                          <div className="flex-1 flex items-center justify-center gap-3 min-w-0 py-1">
                            <MegaphoneIcon className="w-5 h-5 text-violet-400 flex-shrink-0" />
                            <div className="text-left">
                              <div className="text-[10px] text-slate-400 font-semibold leading-tight">Announcements</div>
                              <div className="text-[15px] font-black text-white leading-none mt-1">{day.announcements.length}</div>
                            </div>
                          </div>

                          {/* Divider */}
                          <div className="w-px h-8 bg-[#141b30] flex-shrink-0" />

                          {/* Results */}
                          <div className="flex-1 flex items-center justify-center gap-3 min-w-0 py-1">
                            <SquarePlusIcon className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                            <div className="text-left">
                              <div className="text-[10px] text-slate-400 font-semibold leading-tight">Results</div>
                              <div className="text-[15px] font-black text-white leading-none mt-1">{day.results.length}</div>
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
                  );
                })}
              </div>
            )}

            {/* ── Info hint pill ── */}
            <div className="flex justify-center mt-4">
              <div
                className="info-pill flex items-center gap-2.5 rounded-full px-5 py-2"
              >
                <Info
                  className="w-4 h-4 flex-shrink-0"
                  style={{ color: '#6366f1' }}
                />
                <span className="text-[12px] font-medium text-slate-400">
                  Click on a day to view its details
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
        />
      )}
    </>
  );
}
