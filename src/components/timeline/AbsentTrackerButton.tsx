'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { UserX, Plus, Minus, Trash2, X, AlertCircle, Loader2, RefreshCw, AlertTriangle } from 'lucide-react';
import { overlayStack } from '@/lib/utils/overlayStack';
import {
  getAbsentTrackers,
  createAbsentTracker,
  updateAbsentTracker,
  deleteAbsentTracker
} from '@/lib/actions/absentTracker';

interface CourseAbsent {
  id: string;
  course_name: string;
  count: number;
}

const MAX_COURSES = 20;

export function AbsentTrackerButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [courses, setCourses] = useState<CourseAbsent[]>([]);
  const [newCourseName, setNewCourseName] = useState('');
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);
  const [, startTransition] = useTransition();

  useEffect(() => { setMounted(true); }, []);

  // Auto-focus input when modal opens
  useEffect(() => {
    if (isModalOpen) {
      setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [isModalOpen]);

  // Close on back gesture event
  useEffect(() => {
    if (!isModalOpen) return;
    const closeFn = () => setIsModalOpen(false);
    overlayStack.push(closeFn);
    return () => overlayStack.pop(closeFn);
  }, [isModalOpen]);

  // Fetch on first open only
  useEffect(() => {
    if (!isModalOpen || !mounted || hasLoaded) return;
    loadData();
  }, [isModalOpen, mounted, hasLoaded]);

  async function loadData() {
    setIsLoading(true);
    setError(null);
    const res = await getAbsentTrackers();
    if (res.success && res.data) {
      setCourses(res.data as CourseAbsent[]);
      setHasLoaded(true);
    } else {
      setError(res.error || 'Failed to load absent counts');
    }
    setIsLoading(false);
  }

  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCourseName.trim();
    if (!trimmed) return;

    if (courses.length >= MAX_COURSES) {
      setError(`Maximum ${MAX_COURSES} courses allowed.`);
      return;
    }

    if (courses.some((c) => c.course_name.toLowerCase() === trimmed.toLowerCase())) {
      setError('This course is already being tracked.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const res = await createAbsentTracker(trimmed);
    if (res.success && res.data) {
      setCourses((prev) => [...prev, res.data as CourseAbsent]);
      setNewCourseName('');
      inputRef.current?.focus();
    } else {
      setError(res.error || 'Failed to add course');
    }
    setIsSubmitting(false);
  };

  const handleUpdateCount = (id: string, newCount: number) => {
    if (newCount < 0) return;
    // Ignore if already a pending DB call for this item
    if (pendingIds.has(id)) return;

    const previousCourses = courses.map(c => ({ ...c }));

    // Optimistic update
    setCourses((prev) =>
      prev.map((c) => (c.id === id ? { ...c, count: newCount } : c))
    );

    setPendingIds((s) => new Set(s).add(id));

    startTransition(async () => {
      const res = await updateAbsentTracker(id, newCount);
      if (!res.success) {
        setCourses(previousCourses);
        setError(res.error || 'Failed to update count');
      }
      setPendingIds((s) => { const next = new Set(s); next.delete(id); return next; });
    });
  };

  const handleDeleteCourse = async (id: string) => {
    const previousCourses = courses.map(c => ({ ...c }));
    setConfirmDeleteId(null);

    // Optimistic remove
    setCourses((prev) => prev.filter((c) => c.id !== id));

    const res = await deleteAbsentTracker(id);
    if (!res.success) {
      setCourses(previousCourses);
      setError(res.error || 'Failed to delete course');
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setConfirmDeleteId(null);
    setError(null);
  };

  if (!mounted) return null;

  const totalAbsences = courses.reduce((sum, c) => sum + c.count, 0);

  // ── Severity helpers ──────────────────────────────────
  function getSeverity(count: number) {
    if (count === 0) return 'clean';
    if (count <= 2) return 'warn';
    return 'danger';
  }
  const accentColors = {
    clean:  { bar: 'rgba(52,211,153,0.75)',  bubbleBg: 'rgba(52,211,153,0.12)',  bubbleBorder: 'rgba(52,211,153,0.3)',  text: 'text-emerald-400' },
    warn:   { bar: 'rgba(245,158,11,0.8)',   bubbleBg: 'rgba(245,158,11,0.13)',  bubbleBorder: 'rgba(245,158,11,0.3)', text: 'text-amber-400'   },
    danger: { bar: 'rgba(251,146,60,0.85)',  bubbleBg: 'rgba(251,146,60,0.13)',  bubbleBorder: 'rgba(251,146,60,0.3)', text: 'text-orange-400'  },
  };

  return (
    <>
      {/* ── Trigger Button ─────────────────────────── */}
      <button
        onClick={() => { setError(null); setIsModalOpen(true); }}
        className="group flex items-center gap-2.5 pl-2 pr-4 py-1.5 border border-amber-500/30 hover:border-amber-500/50 bg-amber-500/10 hover:bg-amber-500/20 rounded-xl transition-all cursor-pointer select-none active:scale-[0.98]"
      >
        <div className="w-8 h-8 rounded-lg border border-amber-500/20 bg-background flex items-center justify-center flex-shrink-0 text-amber-500">
          <UserX className="w-4 h-4" />
        </div>
        <span className="text-amber-700 dark:text-amber-400 group-hover:dark:text-white font-semibold text-sm transition-colors">
          Absent Count
        </span>
      </button>

      {/* ── Modal ─────────────────────────────────── */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-[10001] flex items-end sm:items-center justify-center p-3 sm:p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            onClick={closeModal}
          />

          {/* Panel */}
          <div
            className="relative w-full max-w-[420px] rounded-2xl overflow-hidden z-10 flex flex-col max-h-[88vh] animate-slide-up"
            style={{
              background: 'linear-gradient(160deg, #16151a 0%, #1c1b22 100%)',
              border: '1px solid rgba(245,158,11,0.2)',
              boxShadow: '0 32px 80px rgba(0,0,0,0.9), 0 0 0 1px rgba(245,158,11,0.06)',
            }}
          >
            {/* ── Header ── */}
            <div
              className="flex items-center justify-between px-5 py-4 flex-shrink-0"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(217,119,6,0.12))',
                    border: '1px solid rgba(245,158,11,0.25)',
                    boxShadow: '0 0 16px rgba(245,158,11,0.1)',
                  }}
                >
                  <UserX className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white leading-none">Absent Count</h3>
                  {hasLoaded && courses.length > 0 && (
                    <p className="text-[10px] text-slate-500 mt-0.5 font-medium">
                      {courses.length}/{MAX_COURSES} course{courses.length !== 1 ? 's' : ''} · {totalAbsences} total absence{totalAbsences !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={closeModal}
                className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/[0.06] text-slate-500 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* ── Add Course Form ── */}
            <div className="px-4 pt-4 pb-3 flex-shrink-0">
              <form onSubmit={handleAddCourse} className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={newCourseName}
                  onChange={(e) => { setNewCourseName(e.target.value); setError(null); }}
                  placeholder="Course name  (e.g. CSE 301)"
                  maxLength={40}
                  disabled={isSubmitting || courses.length >= MAX_COURSES}
                  className="flex-1 h-9 px-3 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none transition-all disabled:opacity-40"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.07)',
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'rgba(245,158,11,0.35)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')}
                />
                <button
                  type="submit"
                  disabled={isSubmitting || !newCourseName.trim() || courses.length >= MAX_COURSES}
                  className="h-9 px-3.5 rounded-xl text-[11px] font-black text-black flex items-center gap-1 transition-all cursor-pointer active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                  style={{
                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                    boxShadow: '0 4px 14px rgba(245,158,11,0.25)',
                  }}
                >
                  {isSubmitting
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <><Plus className="w-3.5 h-3.5" />Add</>
                  }
                </button>
              </form>

              {/* Error / hint */}
              {error && (
                <div className="flex items-center justify-between text-[11px] text-amber-400 font-semibold mt-2 px-1">
                  <div className="flex items-center gap-1.5">
                    <AlertCircle className="w-3 h-3 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                  <button
                    onClick={() => setError(null)}
                    className="text-slate-500 hover:text-white transition-colors ml-2"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            {/* ── Course List ── */}
            <div className="overflow-y-auto flex-1 px-4 pb-4 flex flex-col gap-2">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="w-7 h-7 text-amber-500 animate-spin" />
                  <p className="text-[11px] text-slate-600 mt-2.5 font-medium">Loading courses…</p>
                </div>

              ) : !hasLoaded && error ? (
                /* Load-failure state with retry */
                <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
                  <AlertCircle className="w-8 h-8 text-amber-500/50" />
                  <p className="text-xs font-bold text-slate-400">Failed to load</p>
                  <p className="text-[11px] text-slate-600">{error}</p>
                  <button
                    onClick={() => { setError(null); loadData(); }}
                    className="flex items-center gap-1.5 text-[11px] font-bold text-amber-400 hover:text-amber-300 border border-amber-500/25 hover:border-amber-500/40 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" /> Try again
                  </button>
                </div>

              ) : courses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
                    style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.12)' }}
                  >
                    <UserX className="w-6 h-6 text-amber-500/40" />
                  </div>
                  <p className="text-xs font-bold text-slate-400">No courses yet</p>
                  <p className="text-[11px] text-slate-600 mt-1 max-w-[200px] leading-relaxed">
                    Type a course name above and tap Add to start tracking.
                  </p>
                </div>

              ) : (
                courses.map((course) => {
                  const sev = getSeverity(course.count);
                  const ac = accentColors[sev];
                  const statusText = sev === 'clean'
                    ? 'Perfect attendance'
                    : course.count === 1 ? '1 class missed' : `${course.count} classes missed`;
                  const isPending = pendingIds.has(course.id);
                  const isConfirmingDelete = confirmDeleteId === course.id;

                  return (
                    <div
                      key={course.id}
                      className="relative rounded-xl overflow-hidden transition-all"
                      style={{
                        background: 'rgba(255,255,255,0.02)',
                        border: `1px solid ${isConfirmingDelete ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.055)'}`,
                      }}
                    >
                      {/* Left accent bar */}
                      <div
                        className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl transition-all"
                        style={{ background: isConfirmingDelete ? 'rgba(239,68,68,0.7)' : ac.bar }}
                      />

                      {/* Normal row */}
                      {!isConfirmingDelete ? (
                        <div className="flex items-center gap-3 pl-4 pr-3 py-3.5">
                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-black text-white truncate leading-tight" title={course.course_name}>
                              {course.course_name}
                            </h4>
                            <p className={`text-[10px] font-semibold mt-0.5 ${ac.text} transition-colors`}>
                              {statusText}
                            </p>
                          </div>

                          {/* Counter */}
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {/* − */}
                            <button
                              onClick={() => handleUpdateCount(course.id, course.count - 1)}
                              disabled={course.count <= 0 || isPending}
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white disabled:opacity-20 transition-all cursor-pointer active:scale-90 disabled:cursor-not-allowed"
                              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}
                            >
                              <Minus className="w-3 h-3" />
                            </button>

                            {/* Count bubble */}
                            <div
                              className="w-8 h-7 rounded-lg flex items-center justify-center transition-all"
                              style={{
                                background: course.count > 0 ? ac.bubbleBg : 'rgba(255,255,255,0.04)',
                                border: `1px solid ${ac.bubbleBorder}`,
                              }}
                            >
                              {isPending
                                ? <Loader2 className="w-3 h-3 animate-spin text-slate-500" />
                                : <span className="text-xs font-black leading-none" style={{ color: course.count === 0 ? '#6b7280' : '#ffffff' }}>
                                    {course.count}
                                  </span>
                              }
                            </div>

                            {/* + */}
                            <button
                              onClick={() => handleUpdateCount(course.id, course.count + 1)}
                              disabled={isPending}
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-amber-400 disabled:opacity-40 transition-all cursor-pointer active:scale-90 hover:bg-amber-500 hover:text-black disabled:cursor-not-allowed"
                              style={{
                                background: 'linear-gradient(135deg, rgba(245,158,11,0.18), rgba(217,119,6,0.12))',
                                border: '1px solid rgba(245,158,11,0.25)',
                              }}
                            >
                              <Plus className="w-3 h-3" />
                            </button>

                            <div className="w-px h-5 bg-white/[0.06] mx-0.5" />

                            {/* Trash → triggers inline confirm */}
                            <button
                              onClick={() => setConfirmDeleteId(course.id)}
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* ── Inline delete confirmation ── */
                        <div className="flex items-center gap-2 pl-4 pr-3 py-3">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                          <p className="text-[11px] text-slate-300 flex-1 font-medium">
                            Delete <span className="font-black text-white">{course.course_name}</span>?
                          </p>
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2.5 h-6 rounded-md text-[10px] font-bold text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer"
                            >
                              Keep
                            </button>
                            <button
                              onClick={() => handleDeleteCourse(course.id)}
                              className="px-2.5 h-6 rounded-md text-[10px] font-bold text-white bg-red-500/80 hover:bg-red-500 transition-all cursor-pointer"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
