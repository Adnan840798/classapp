'use client';

import { useState } from 'react';
import { X, ChevronRight, ExternalLink } from 'lucide-react';

interface DayDetailPanelProps {
  isOpen: boolean;
  onClose: () => void;
  dayName: string;
  dateStr: string;
  dateLabel: string;
  announcements: any[];
  deadlines: any[];
  results: any[];
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
      <rect x="3" y="3" width="18" height="18" rx="3" fill="#6366f1" fillOpacity="0.15" />
      <path d="M8 3h8a1 1 0 0 1 1 1v16l-5-3-5 3V4a1 1 0 0 1 1-1z" fill="#6366f1" />
    </svg>
  );
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
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
  dateLabel,
  announcements,
  deadlines,
  results,
}: DayDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  if (!isOpen) return null;

  return (
    <>
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .detail-panel {
          animation: slideInRight 0.28s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .detail-scroll::-webkit-scrollbar { width: 4px; }
        .detail-scroll::-webkit-scrollbar-track { background: transparent; }
        .detail-scroll::-webkit-scrollbar-thumb { background: #1e2a50; border-radius: 99px; }
      `}</style>

      <div className="fixed inset-0 z-50">
        {/* Scrim */}
        <div
          className="absolute inset-0"
          style={{ background: 'rgba(4,6,15,0.7)' }}
          onClick={onClose}
        />

        {/* Panel */}
        <div
          className="detail-panel absolute right-0 top-0 bottom-0 flex flex-col"
          style={{
            width: 'min(420px, 100vw)',
            background: '#060813',
            borderLeft: '1px solid #141b30',
          }}
        >
          {/* Header */}
          <div
            className="flex items-start justify-between px-6 pt-7 pb-5 flex-shrink-0"
            style={{ borderBottom: '1px solid #141b30', background: '#060813' }}
          >
            <div>
              <h2 className="text-[26px] font-black text-white tracking-tight leading-none uppercase">
                {dayName}
              </h2>
              <p className="text-[15px] text-slate-400 font-semibold mt-1.5">{dateLabel}</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer mt-0.5"
              style={{ background: '#131929', border: '1px solid #1e2a4a' }}
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          {/* Tabs */}
          <div
            className="flex flex-shrink-0"
            style={{ borderBottom: '1px solid #141b30', background: '#060813' }}
          >
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="flex-1 text-[12px] font-semibold py-3.5 transition-all cursor-pointer relative"
                style={{
                  color: activeTab === tab.key ? '#ffffff' : '#64748b',
                  borderBottom: activeTab === tab.key ? '2px solid #6366f1' : '2px solid transparent',
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
                    className="flex flex-col items-start p-3.5 rounded-xl cursor-pointer transition-all hover:brightness-110"
                    style={{ background: '#0f1428', border: '1px solid #1e2a4a' }}
                  >
                    <span className="text-[10px] font-bold text-slate-400 leading-none mb-2.5">Deadlines</span>
                    <div className="flex items-center gap-2">
                      <CalendarGridIcon className="w-5 h-5 text-orange-400" />
                      <span className="text-[20px] font-black text-white leading-none">{deadlines.length}</span>
                    </div>
                  </button>

                  {/* Announcements chip */}
                  <button
                    onClick={() => setActiveTab('announcements')}
                    className="flex flex-col items-start p-3.5 rounded-xl cursor-pointer transition-all hover:brightness-110"
                    style={{ background: '#0b0e1e', border: '1px solid #141b30' }}
                  >
                    <span className="text-[10px] font-bold text-slate-400 leading-none mb-2.5">Announcements</span>
                    <div className="flex items-center gap-2">
                      <MegaphoneIcon className="w-5 h-5 text-violet-400" />
                      <span className="text-[20px] font-black text-white leading-none">{announcements.length}</span>
                    </div>
                  </button>

                  {/* Results chip */}
                  <button
                    onClick={() => setActiveTab('results')}
                    className="flex flex-col items-start p-3.5 rounded-xl cursor-pointer transition-all hover:brightness-110"
                    style={{ background: '#0b0e1e', border: '1px solid #141b30' }}
                  >
                    <span className="text-[10px] font-bold text-slate-400 leading-none mb-2.5">Results</span>
                    <div className="flex items-center gap-2">
                      <SquarePlusIcon className="w-5 h-5 text-emerald-400" />
                      <span className="text-[20px] font-black text-white leading-none">{results.length}</span>
                    </div>
                  </button>
                </div>

                {/* Deadlines list section */}
                <div>
                  <h3 className="text-[14px] font-bold text-white mb-3">
                    Deadlines ({deadlines.length})
                  </h3>
                  {deadlines.length === 0 ? (
                    <EmptyState label="No deadlines due today" />
                  ) : (
                    <div className="flex flex-col gap-2.5">
                      {deadlines.map((d) => (
                        <button
                          key={d.id}
                          onClick={() => setActiveTab('deadlines')}
                          className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl cursor-pointer text-left transition-all hover:brightness-105"
                          style={{ background: '#0b0e1e', border: '1px solid #141b30' }}
                        >
                          <CalendarGridIcon className="w-5 h-5 text-orange-400 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-bold text-white leading-none">{d.title}</p>
                            <p className="text-[11px] text-slate-400 mt-1.5 leading-none">
                              Due {formatTime(d.due_date)}
                            </p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-600 flex-shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Announcements list section */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[14px] font-bold text-white">
                      Announcements ({announcements.length})
                    </h3>
                    {announcements.length > 0 && (
                      <button
                        onClick={() => setActiveTab('announcements')}
                        className="text-[12px] font-semibold cursor-pointer"
                        style={{ color: '#818cf8' }}
                      >
                        View all
                      </button>
                    )}
                  </div>
                  {announcements.length === 0 ? (
                    <EmptyState label="No announcements today" />
                  ) : (
                    <div className="flex flex-col gap-2.5">
                      {announcements.slice(0, 4).map((a) => (
                        <div
                          key={a.id}
                          className="flex items-center gap-3.5 px-4 py-3.5 rounded-xl"
                          style={{ background: '#0b0e1e', border: '1px solid #141b30' }}
                        >
                          {/* Purple bookmark icon */}
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#1a1d40' }}>
                            <BookmarkIcon className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-bold text-white leading-none truncate">{a.title}</p>
                            <p className="text-[11px] text-slate-500 mt-1.5 leading-none truncate">
                              {a.body.split(' ').slice(0, 4).join(' ')}
                            </p>
                          </div>
                          <span className="text-[11px] font-semibold text-slate-500 flex-shrink-0">
                            {formatTime(a.created_at)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Results list section */}
                <div>
                  <h3 className="text-[14px] font-bold text-white mb-3">
                    Results ({results.length})
                  </h3>
                  {results.length === 0 ? (
                    <EmptyState label="No results published today" />
                  ) : (
                    <div className="flex flex-col gap-2.5">
                      {results.map((r) => (
                        <button
                          key={r.id}
                          onClick={() => setActiveTab('results')}
                          className="w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl cursor-pointer text-left transition-all hover:brightness-105"
                          style={{ background: '#0b0e1e', border: '1px solid #141b30' }}
                        >
                          <SquarePlusIcon className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-bold text-white leading-none">{r.exam_name}</p>
                            {r.result_sheet_url && (
                              <p className="text-[11px] text-slate-400 mt-1.5 leading-none">
                                Score: View attachment
                              </p>
                            )}
                          </div>
                          <span
                            className="text-[10px] font-black px-2.5 py-1 rounded-full flex-shrink-0"
                            style={{
                              background: 'rgba(16,185,129,0.12)',
                              color: '#34d399',
                              border: '1px solid rgba(16,185,129,0.2)',
                            }}
                          >
                            Completed
                          </span>
                          <ChevronRight className="w-4 h-4 text-slate-600 flex-shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ── ANNOUNCEMENTS TAB ── */}
            {activeTab === 'announcements' && (
              <>
                {announcements.length === 0 ? (
                  <EmptyState label="No announcements today" />
                ) : (
                  <div className="flex flex-col gap-3">
                    {announcements.map((a) => (
                      <div
                        key={a.id}
                        className="px-4 py-4 rounded-xl flex flex-col gap-3"
                        style={{ background: '#0f1428', border: '1px solid #1e2a4a' }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-[13px] font-bold text-white leading-snug">{a.title}</h4>
                          {a.is_important && (
                            <span
                              className="text-[9px] font-black px-2 py-0.5 rounded flex-shrink-0"
                              style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}
                            >
                              IMPORTANT
                            </span>
                          )}
                        </div>
                        <p className="text-[12px] text-slate-300 leading-relaxed whitespace-pre-wrap">{a.body}</p>
                        {a.attachment_url && (
                          <a
                            href={a.attachment_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-[11px] font-semibold"
                            style={{ color: '#818cf8' }}
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            View attachment
                          </a>
                        )}
                        <div
                          className="flex items-center gap-2 pt-2.5 text-[10px] text-slate-500 font-semibold"
                          style={{ borderTop: '1px solid #1a2240' }}
                        >
                          <span>By {a.creator?.full_name ?? 'CR'}</span>
                          <span>·</span>
                          <span>{formatTime(a.created_at)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ── RESULTS TAB ── */}
            {activeTab === 'results' && (
              <>
                {results.length === 0 ? (
                  <EmptyState label="No exam results published today" />
                ) : (
                  <div className="flex flex-col gap-3">
                    {results.map((r) => (
                      <div
                        key={r.id}
                        className="px-4 py-4 rounded-xl flex items-center gap-4"
                        style={{ background: '#0f1428', border: '1px solid #1e2a4a' }}
                      >
                        <SquarePlusIcon className="w-6 h-6 text-emerald-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-bold text-white">{r.exam_name}</p>
                          <p className="text-[11px] text-slate-400 mt-1">
                            Published at {formatTime(r.published_at)}
                          </p>
                        </div>
                        {r.result_sheet_url && (
                          <a
                            href={r.result_sheet_url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors flex-shrink-0"
                            style={{ background: 'rgba(99,102,241,0.12)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)' }}
                          >
                            View
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ── DEADLINES TAB ── */}
            {activeTab === 'deadlines' && (
              <>
                {deadlines.length === 0 ? (
                  <EmptyState label="No deadlines due today" />
                ) : (
                  <div className="flex flex-col gap-3">
                    {deadlines.map((d) => (
                      <div
                        key={d.id}
                        className="px-4 py-4 rounded-xl flex flex-col gap-2.5"
                        style={{ background: '#0f1428', border: '1px solid #1e2a4a' }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-3">
                            <CalendarGridIcon className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-[13px] font-bold text-white">{d.title}</p>
                              <p className="text-[11px] text-slate-400 mt-1">Due {formatTime(d.due_date)}</p>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-600 flex-shrink-0 mt-0.5" />
                        </div>
                        {d.description && (
                          <p
                            className="text-[11px] text-slate-300 leading-relaxed bg-[#070a17] rounded-lg px-3 py-2.5"
                            style={{ border: '1px solid #151f3a' }}
                          >
                            {d.description}
                          </p>
                        )}
                        <p className="text-[10px] text-slate-500 font-semibold">{d.subject}</p>
                      </div>
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
      <p className="text-[12px] text-slate-500 italic">{label}</p>
    </div>
  );
}
