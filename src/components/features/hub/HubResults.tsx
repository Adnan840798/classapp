'use client';

/**
 * HubResults — zero-prop, self-sufficient exam results view.
 *
 * FAST PATH (within-app navigation): hub context is hydrated from the layout
 * preload → renders immediately from in-memory data, no network call at all.
 *
 * FALLBACK PATH (direct URL access): hub is not hydrated on first render,
 * so a client-side server-action call fetches the data and shows a skeleton
 * while loading.
 */

import { useState, useEffect } from 'react';
import { useStudentHub } from '@/context/StudentHubContext';
import { getCachedResults } from '@/lib/cache/queries';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { Award, FileText, Calendar, ArrowUpRight } from 'lucide-react';
import { formatDateTime } from '@/lib/utils/formatters';
import { AttachmentViewer } from '@/components/ui/AttachmentViewer';
import type { ExamResult } from '@/types';

export function HubResults() {
  const { results, isHydrated } = useStudentHub();
  const [fetched, setFetched] = useState<ExamResult[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Self-fetch only when context has no data (direct URL access)
    if (!isHydrated && fetched === null && !loading) {
      setLoading(true);
      getCachedResults()
        .then((data) => setFetched((data || []) as ExamResult[]))
        .catch(() => setFetched([]))
        .finally(() => setLoading(false));
    }
  }, [isHydrated, fetched, loading]);

  // Hub hydrated → instant render from context (most common path)
  const data = isHydrated ? results : (fetched ?? []);
  const isLoadingData = !isHydrated && fetched === null;

  if (isLoadingData) {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} lines={2} />
        ))}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="glass-card p-12 text-center flex flex-col items-center justify-center gap-3">
        <Award className="w-12 h-12 text-muted-foreground opacity-30" />
        <h2 className="text-lg font-semibold">No results published yet</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          Exam results will appear here once your class representative publishes them.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {data.map((res) => (
        <div
          key={res.id}
          className="relative rounded-xl overflow-hidden transition-all duration-150 hover:translate-x-0.5"
          style={{
            background: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
          }}
        >
          <div
            className="absolute left-0 top-0 bottom-0 w-1"
            style={{ background: 'linear-gradient(180deg, #38BDF8, #0ea5e9)' }}
          />

          <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Left section: Icon + Title */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-brand-cyan/10 border border-brand-cyan/20 flex items-center justify-center flex-shrink-0">
                <Award className="w-4 h-4 text-brand-cyan" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-extrabold text-foreground break-words leading-snug">
                  {res.exam_name}
                </h3>
                <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1.5 mt-1.5">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground/80" />
                  <span>Published: {formatDateTime(res.published_at)}</span>
                </span>
              </div>
            </div>

            {/* Right section: Attachment Link */}
            <div className="flex items-center justify-end gap-4 flex-shrink-0 w-full sm:w-auto mt-2.5 sm:mt-0 pt-2.5 sm:pt-0 border-t border-border/50 sm:border-0">
              <div className="flex items-center gap-2 sm:min-w-[140px] sm:justify-end w-full sm:w-auto justify-end">
                {res.result_sheet_url ? (
                  <AttachmentViewer url={res.result_sheet_url} fileName={`${res.exam_name}_results`}>
                    <button
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-bold text-[#121214] bg-gradient-to-r from-amber-400 to-amber-500 shadow-[0_4px_12px_rgba(245,158,11,0.2)] hover:shadow-[0_6px_16px_rgba(245,158,11,0.35)] hover:from-amber-300 hover:to-amber-500 active:scale-[0.97] transition-all cursor-pointer"
                    >
                      <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="hidden xs:inline">View Marksheet</span>
                      <span className="xs:hidden">View</span>
                      <ArrowUpRight className="w-3 h-3 flex-shrink-0" />
                    </button>
                  </AttachmentViewer>
                ) : (
                  <span className="text-[10px] text-muted-foreground/60 italic">No attachment</span>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
