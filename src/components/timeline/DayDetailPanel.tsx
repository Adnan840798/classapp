'use client';

import { useState, useEffect } from 'react';
import { X, ChevronRight, ExternalLink, Umbrella } from 'lucide-react';
import Link from 'next/link';
import { AttachmentViewer } from '@/components/ui/AttachmentViewer';
import { overlayStack } from '@/lib/utils/overlayStack';

interface DayDetailPanelProps {
  isOpen: boolean;
  onClose: () => void;
  dayName: string;
  dateStr: string;
  dateLabel: string;
  announcements: any[];
  deadlines: any[];
  results: any[];
  isCR?: boolean;
  isHoliday?: boolean;
  weekNumber?: number;
  dayIndex?: number;
  onToggleHoliday?: (weekNumber: number, dayIndex: number) => Promise<void>;
}

type TabType = 'overview' | 'announcements' | 'results' | 'deadlines';

/* ── Icon Components matching the Figma panel exactly ── */

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
        stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"
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

// Purple filled bookmark/pin icon for announcements in the panel
function BookmarkIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect x="3" y="3" width="18" height="18" rx="3" fill="#8B5CF6" fillOpacity="0.15" />
      <path d="M8 3h8a1 1 0 0 1 1 1v16l-5-3-5 3V4a1 1 0 0 1 1-1z" fill="#8B5CF6" />
    </svg>
  );
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-US', { timeZone: 'Asia/Dhaka', hour: '2-digit', minute: '2-digit' });
}

const TABS: { key: TabType; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'announcements', label: 'Announcements' },
  { key: 'results', label: 'Results' },
  { key: 'deadlines', label: 'Deadlines' },
];

export function DayDetailPanel({
  isOpen,
  onClose,
  dayName,
  dateStr,
  dateLabel,
  announcements,
  deadlines,
  results,
  isCR = false,
  isHoliday = false,
  weekNumber,
  dayIndex,
  onToggleHoliday,
}: DayDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isTogglingHoliday, setIsTogglingHoliday] = useState(false);

  // Close on back gesture event
  useEffect(() => {
    if (!isOpen) return;
    const closeFn = () => onClose();
    overlayStack.push(closeFn);
    return () => overlayStack.pop(closeFn);
  }, [isOpen, onClose]);

  async function handleHolidayToggle() {
    if (!onToggleHoliday || weekNumber === undefined || dayIndex === undefined) return;
    setIsTogglingHoliday(true);
    try {
      await onToggleHoliday(weekNumber, dayIndex);
    } finally {
      setIsTogglingHoliday(false);
    }
  }

  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [translationX, setTranslationX] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  if (!isOpen) return null;

  const prefix = isCR ? '/cr' : '/student';

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setTouchStart({ x: touch.clientX, y: touch.clientY });
    setIsDragging(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart) return;
    const touch = e.touches[0];
    const diffX = touch.clientX - touchStart.x;
    const diffY = touch.clientY - touchStart.y;

    // Start dragging if move is horizontal and swiping right (diffX > 0)
    if (!isDragging) {
      if (diffX > 10 && Math.abs(diffX) > Math.abs(diffY)) {
        setIsDragging(true);
      }
    }

    if (isDragging && diffX >= 0) {
      setTranslationX(diffX);
    }
  };

  const handleTouchEnd = () => {
    if (!touchStart) return;
    
    // Close if swipe distance exceeds 80px
    if (isDragging && translationX > 80) {
      onClose();
    }
    
    setTouchStart(null);
    setTranslationX(0);
    setIsDragging(false);
  };

  const fullDayNames: Record<string, string> = {
    'SAT': 'Saturday',
    'SUN': 'Sunday',
    'MON': 'Monday',
    'TUE': 'Tuesday',
    'WED': 'Wednesday',
  };
  
  const displayDayName = fullDayNames[dayName.toUpperCase()] || dayName;

  const displayDateLabel = dateLabel
    .replace(/\bJan\b/g, 'January')
    .replace(/\bFeb\b/g, 'February')
    .replace(/\bMar\b/g, 'March')
    .replace(/\bApr\b/g, 'April')
    .replace(/\bMay\b/g, 'May')
    .replace(/\bJun\b/g, 'June')
    .replace(/\bJul\b/g, 'July')
    .replace(/\bAug\b/g, 'August')
    .replace(/\bSep\b/g, 'September')
    .replace(/\bOct\b/g, 'October')
    .replace(/\bNov\b/g, 'November')
    .replace(/\bDec\b/g, 'December');

  return (
    <>
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .detail-panel {
          animation: slideInRight 0.28s cubic-bezier(0.16, 1, 0.3, 1);
          width: min(420px, 100vw);
        }
        @media (min-width: 1024px) {
          .detail-panel {
            width: 35vw;
          }
        }
        .detail-scroll::-webkit-scrollbar { width: 4px; }
        .detail-scroll::-webkit-scrollbar-track { background: transparent; }
        .detail-scroll::-webkit-scrollbar-thumb { background: hsl(var(--border)); border-radius: 99px; }
      `}</style>

      <div className="fixed inset-0 z-50">
        {/* Scrim */}
        <div
          className="absolute inset-0 bg-background/70 backdrop-blur-xs"
          onClick={onClose}
        />

        {/* Panel */}
        <div
          className={`detail-panel absolute right-0 top-0 bottom-0 flex flex-col bg-card dark:bg-background ${isDragging ? '' : 'transition-transform duration-200'}`}
          style={{
            borderLeft: '1px solid hsl(var(--border))',
            transform: `translateX(${translationX}px)`,
            touchAction: 'pan-y',
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Header */}
          <div
            className="flex items-start justify-between px-6 pt-7 pb-5 flex-shrink-0 bg-card dark:bg-background"
            style={{ borderBottom: '1px solid hsl(var(--border))' }}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-[26px] font-black text-foreground tracking-tight leading-none uppercase">
                  {displayDayName}
                </h2>
                {isHoliday && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 text-zinc-800 dark:text-[#fbbf24]">
                    <Umbrella className="w-3 h-3" /> Holiday
                  </span>
                )}
              </div>
              <p className="text-[15px] text-muted-foreground font-semibold mt-1.5">{displayDateLabel}</p>

              {/* CR holiday toggle */}
              {isCR && onToggleHoliday && weekNumber !== undefined && dayIndex !== undefined && (
                <button
                  onClick={handleHolidayToggle}
                  disabled={isTogglingHoliday}
                  className={`mt-3 flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                    isHoliday
                      ? 'bg-slate-500/10 border-slate-500/30 text-slate-600 dark:text-slate-400'
                      : 'bg-amber-500/10 border-amber-500/30 text-zinc-800 dark:text-amber-400'
                  }`}
                >
                  {isTogglingHoliday ? (
                    '…'
                  ) : isHoliday ? (
                    <>
                      <X className="w-3 h-3" />
                      <span>Remove Holiday</span>
                    </>
                  ) : (
                    <>
                      <Umbrella className="w-3 h-3" />
                      <span>Mark as Holiday</span>
                    </>
                  )}
                </button>
              )}
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer mt-0.5 flex-shrink-0 ml-2 bg-muted border border-border hover:bg-accent text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tabs */}
          <div
            className="flex flex-shrink-0 overflow-x-auto scrollbar-none scroll-smooth-ios bg-card dark:bg-background"
            style={{ borderBottom: '1px solid hsl(var(--border))' }}
          >
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="flex-1 min-w-[85px] sm:min-w-0 text-[11px] sm:text-[12px] font-bold py-3.5 transition-all cursor-pointer relative whitespace-nowrap text-center px-1 flex-shrink-0"
                style={{
                  color: activeTab === tab.key ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))',
                  borderBottom: activeTab === tab.key ? '2px solid hsl(var(--primary))' : '2px solid transparent',
                  background: 'transparent',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto detail-scroll px-5 py-5 space-y-6">

            {/* ── OVERVIEW TAB ── */}
            {activeTab === 'overview' && (
              <>
                {/* Stat chips row */}
                <div className="grid grid-cols-3 gap-3">
                  {/* Deadlines chip */}
                  <button
                    onClick={() => setActiveTab('deadlines')}
                    className="flex flex-col items-start p-3.5 rounded-xl cursor-pointer transition-all hover:brightness-110 bg-muted/40 hover:bg-muted border border-border"
                  >
                    <span className="text-[10px] font-bold text-muted-foreground leading-none mb-2.5">Deadlines</span>
                    <div className="flex items-center gap-2">
                      <CalendarGridIcon className="w-5 h-5 text-orange-400" />
                      <span className="text-[20px] font-black text-foreground leading-none">{deadlines.length}</span>
                    </div>
                  </button>

                  {/* Announcements chip */}
                  <button
                    onClick={() => setActiveTab('announcements')}
                    className="flex flex-col items-start p-3.5 rounded-xl cursor-pointer transition-all hover:brightness-110 bg-muted/40 hover:bg-muted border border-border"
                  >
                    <span className="text-[10px] font-bold text-muted-foreground leading-none mb-2.5">Announcements</span>
                    <div className="flex items-center gap-2">
                      <MegaphoneIcon className="w-5 h-5 text-brand-purple" />
                      <span className="text-[20px] font-black text-foreground leading-none">{announcements.length}</span>
                    </div>
                  </button>

                  {/* Results chip */}
                  <button
                    onClick={() => setActiveTab('results')}
                    className="flex flex-col items-start p-3.5 rounded-xl cursor-pointer transition-all hover:brightness-110 bg-muted/40 hover:bg-muted border border-border"
                  >
                    <span className="text-[10px] font-bold text-muted-foreground leading-none mb-2.5">Results</span>
                    <div className="flex items-center gap-2">
                      <SquarePlusIcon className="w-5 h-5 text-brand-cyan" />
                      <span className="text-[20px] font-black text-foreground leading-none">{results.length}</span>
                    </div>
                  </button>
                </div>

                {/* Deadlines list section */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[14px] font-bold text-foreground">
                      Deadlines ({deadlines.length})
                    </h3>
                    <div className="flex items-center gap-3">
                      {isCR && (
                        <a
                          href={`/cr/deadlines/new?date=${dateStr}`}
                          className="text-xs font-semibold text-orange-600 dark:text-orange-400 hover:text-orange-500 dark:hover:text-orange-300 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          + Add Deadline
                        </a>
                      )}
                      {deadlines.length > 0 && (
                        <button
                          onClick={() => setActiveTab('deadlines')}
                          className="text-[12px] font-semibold cursor-pointer transition-colors text-orange-600 dark:text-orange-400 hover:text-orange-500 dark:hover:text-orange-300"
                        >
                          View all
                        </button>
                      )}
                    </div>
                  </div>
                  {deadlines.length === 0 ? (
                    <EmptyState label="No deadlines due today" />
                  ) : (
                    <div className="flex flex-col gap-2.5">
                      {deadlines.map((d) => (
                        <Link
                          key={d.id}
                          href={`${prefix}/deadlines/${d.id}`}
                          onClick={onClose}
                          className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl cursor-pointer text-left transition-all bg-slate-50 hover:bg-slate-100 dark:bg-muted/20 dark:hover:bg-muted/40 border border-slate-200/80 dark:border-border shadow-xs hover:shadow-sm"
                        >
                          <CalendarGridIcon className="w-5 h-5 text-orange-400 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-bold text-foreground leading-none">{d.title}</p>
                            <p className="text-[11px] text-muted-foreground mt-1.5 leading-none">
                              Due {formatTime(d.due_date)}
                            </p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground/60 flex-shrink-0" />
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                {/* Announcements list section */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[14px] font-bold text-foreground">
                      Announcements ({announcements.length})
                    </h3>
                    <div className="flex items-center gap-3">
                      {isCR && (
                        <a
                          href={`/cr/announcements/new?date=${dateStr}`}
                          className="text-xs font-semibold text-brand-purple hover:text-brand-purple/80 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          + Add Notice
                        </a>
                      )}
                      {announcements.length > 0 && (
                        <button
                          onClick={() => setActiveTab('announcements')}
                          className="text-[12px] font-semibold cursor-pointer transition-colors text-brand-purple hover:text-[#7c3aed] dark:hover:text-[#a78bfa]"
                        >
                          View all
                        </button>
                      )}
                    </div>
                  </div>
                  {announcements.length === 0 ? (
                    <EmptyState label="No announcements today" />
                  ) : (
                    <div className="flex flex-col gap-2.5">
                      {announcements.slice(0, 4).map((a) => (
                        <Link
                          key={a.id}
                          href={`${prefix}/announcements/${a.id}`}
                          onClick={onClose}
                          className="flex items-center gap-3.5 px-4 py-3.5 rounded-xl transition-all bg-slate-50 hover:bg-slate-100 dark:bg-muted/20 dark:hover:bg-muted/40 border border-slate-200/80 dark:border-border shadow-xs hover:shadow-sm w-full cursor-pointer"
                        >
                          {/* Purple bookmark icon */}
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-brand-purple/10 border border-brand-purple/20">
                            <BookmarkIcon className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-bold text-foreground leading-none truncate">{a.title}</p>
                            <p className="text-[11px] text-muted-foreground mt-1.5 leading-none truncate">
                              {a.body.split(' ').slice(0, 4).join(' ')}
                            </p>
                          </div>
                          <span className="text-[11px] font-semibold text-muted-foreground flex-shrink-0">
                            {formatTime(a.created_at)}
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                {/* Results list section */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[14px] font-bold text-foreground">
                      Results ({results.length})
                    </h3>
                    <div className="flex items-center gap-3">
                      {isCR && (
                        <a
                          href={`/cr/results/publish?date=${dateStr}`}
                          className="text-xs font-semibold text-brand-cyan hover:text-brand-cyan/85 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          + Add Result
                        </a>
                      )}
                      {results.length > 0 && (
                        <button
                          onClick={() => setActiveTab('results')}
                          className="text-[12px] font-semibold cursor-pointer transition-colors text-brand-cyan hover:text-brand-cyan/80"
                        >
                          View all
                        </button>
                      )}
                    </div>
                  </div>
                  {results.length === 0 ? (
                    <EmptyState label="No results published today" />
                  ) : (
                    <div className="flex flex-col gap-2.5">
                      {results.map((r) => (
                        <Link
                          key={r.id}
                          href={`${prefix}/results`}
                          onClick={onClose}
                          className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl cursor-pointer text-left transition-all bg-slate-50 hover:bg-slate-100 dark:bg-muted/20 dark:hover:bg-muted/40 border border-slate-200/80 dark:border-border shadow-xs hover:shadow-sm"
                        >
                          <SquarePlusIcon className="w-5 h-5 text-brand-cyan flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-bold text-foreground leading-none">{r.exam_name}</p>
                            {r.result_sheet_url && (
                              <p className="text-[11px] text-muted-foreground mt-1.5 leading-none">
                                Sheet available
                              </p>
                            )}
                          </div>
                          <ChevronRight className="w-4 h-4 text-brand-cyan flex-shrink-0" />
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ── ANNOUNCEMENTS TAB ── */}
            {activeTab === 'announcements' && (
              <>
                {isCR && (
                  <a
                    href={`/cr/announcements/new?date=${dateStr}`}
                    className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs font-bold transition-all mb-4 cursor-pointer bg-primary/10 border border-primary/25 text-primary hover:bg-primary/20"
                  >
                    <MegaphoneIcon className="w-4 h-4" />
                    + Add Announcement for this Day
                  </a>
                )}
                {announcements.length === 0 ? (
                  <EmptyState label="No announcements today" />
                ) : (
                  <div className="flex flex-col gap-3">
                    {announcements.map((a) => (
                      <Link
                        key={a.id}
                        href={`${prefix}/announcements/${a.id}`}
                        onClick={onClose}
                        className="px-4 py-4 rounded-xl flex flex-col gap-3 transition-all hover:bg-muted/40 bg-muted/20 border border-border cursor-pointer w-full"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-[13px] font-bold text-foreground leading-snug">{a.title}</h4>
                          <ChevronRight className="w-4 h-4 text-muted-foreground/60 flex-shrink-0 mt-0.5" />
                        </div>
                        <p className="text-[12px] text-zinc-800 dark:text-zinc-200 leading-relaxed whitespace-pre-wrap line-clamp-3">{a.body}</p>
                        {a.attachment_url && (
                          <div className="mt-1 flex items-center">
                            <AttachmentViewer url={a.attachment_url} fileName={`${a.title}_attachment`}>
                              <button
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer bg-primary/10 border border-primary/25 text-primary hover:bg-primary/20"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>View Attachment</span>
                              </button>
                            </AttachmentViewer>
                          </div>
                        )}
                        <div
                          className="flex items-center gap-2 pt-2.5 text-[10px] text-muted-foreground font-semibold"
                          style={{ borderTop: '1px solid hsl(var(--border))' }}
                        >
                          <span>By {a.creator?.full_name ?? 'CR'}</span>
                          <span>·</span>
                          <span>{formatTime(a.created_at)}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ── RESULTS TAB ── */}
            {activeTab === 'results' && (
              <>
                {isCR && (
                  <a
                    href={`/cr/results/publish?date=${dateStr}`}
                    className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs font-bold transition-all mb-4 cursor-pointer bg-sky-500/10 border border-sky-500/25 text-sky-700 dark:text-sky-400 hover:bg-sky-500/20"
                  >
                    <SquarePlusIcon className="w-4 h-4" />
                    + Add Result for this Day
                  </a>
                )}
                {results.length === 0 ? (
                  <EmptyState label="No exam results published today" />
                ) : (
                  <div className="flex flex-col gap-3">
                    {results.map((r) => (
                      <div
                        key={r.id}
                        className="px-4 py-4 rounded-xl flex items-center gap-4 bg-muted/20 border border-border"
                      >
                        <SquarePlusIcon className="w-6 h-6 text-brand-cyan flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-bold text-foreground">{r.exam_name}</p>
                          <p className="text-[11px] text-muted-foreground mt-1">
                            Published at {formatTime(r.published_at)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {r.result_sheet_url && (
                            <AttachmentViewer url={r.result_sheet_url} fileName={`${r.exam_name}_results`}>
                              <button
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-sky-500/10 border border-sky-500/25 text-sky-700 dark:text-sky-400 hover:bg-sky-500/20 transition-all cursor-pointer"
                                onClick={(e) => e.stopPropagation()}
                              >
                                View
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            </AttachmentViewer>
                          )}
                          <Link
                            href={`${prefix}/results`}
                            onClick={onClose}
                            className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-bold bg-sky-500/10 border border-sky-500/25 text-sky-700 dark:text-sky-400 hover:bg-sky-500/20 transition-all"
                          >
                            <ChevronRight className="w-3 h-3" />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ── DEADLINES TAB ── */}
            {activeTab === 'deadlines' && (
              <>
                {isCR && (
                  <a
                    href={`/cr/deadlines/new?date=${dateStr}`}
                    className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs font-bold transition-all mb-4 cursor-pointer bg-orange-500/10 border border-orange-500/25 text-orange-600 dark:text-orange-400 hover:bg-orange-500/20"
                  >
                    <CalendarGridIcon className="w-4 h-4" />
                    + Add Deadline for this Day
                  </a>
                )}
                {deadlines.length === 0 ? (
                  <EmptyState label="No deadlines due today" />
                ) : (
                  <div className="flex flex-col gap-3">
                    {deadlines.map((d) => (
                      <Link
                        key={d.id}
                        href={`${prefix}/deadlines/${d.id}`}
                        onClick={onClose}
                        className="px-4 py-4 rounded-xl flex flex-col gap-2.5 transition-all hover:bg-muted/40 bg-muted/20 border border-border w-full cursor-pointer"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-3">
                            <CalendarGridIcon className="w-5 h-5 text-orange-400 flex-shrink-0" />
                            <div>
                              <p className="text-[13px] font-bold text-foreground">{d.title}</p>
                              <p className="text-[11px] text-muted-foreground mt-1">Due {formatTime(d.due_date)}</p>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground/60 flex-shrink-0" />
                        </div>
                        {d.description && (
                          <p
                            className="text-[11px] text-zinc-800 dark:text-zinc-200 leading-relaxed bg-muted/40 rounded-lg px-3 py-2.5 border border-border"
                          >
                            {d.description}
                          </p>
                        )}
                        <p className="text-[10px] text-muted-foreground font-semibold">{d.subject}</p>
                      </Link>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center py-10">
      <p className="text-[12px] text-muted-foreground italic">{label}</p>
    </div>
  );
}
