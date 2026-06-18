import { redirect } from 'next/navigation';
import { Award, FileText, Calendar, ArrowUpRight } from 'lucide-react';
import { getAuthUser } from '@/lib/supabase/server';
import { formatDateTime } from '@/lib/utils/formatters';
import { AttachmentViewer } from '@/components/ui/AttachmentViewer';
import { getCachedResults } from '@/lib/cache/queries';

export const revalidate = 0; // force dynamic rendering

export default async function StudentResultsPage() {
  const { user } = await getAuthUser();
  if (!user) redirect('/login');

  // Uses tenant-scoped unstable_cache internally — DB query shared across all students for 300s.
  const results = await getCachedResults();

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full animate-fade-in">
      {/* Page Header */}
      <div className="page-header">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="page-title">Exam Results</h1>
            <p className="page-subtitle">Class exam results and answer sheets published by your CR</p>
          </div>
        </div>
      </div>

      {!results || results.length === 0 ? (
        <div className="glass-card p-12 text-center flex flex-col items-center justify-center gap-3">
          <Award className="w-12 h-12 text-muted-foreground opacity-30" />
          <h2 className="text-lg font-semibold">No results published yet</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            Exam results will appear here once your class representative publishes them.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {results.map((res) => (
            <div
              key={res.id}
              className="relative rounded-xl overflow-hidden transition-all duration-150 hover:translate-x-0.5"
              style={{
                background: '#1A1D24',
                border: '1px solid #23262D',
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
                    <h3 className="text-sm font-extrabold text-white break-words leading-snug">
                      {res.exam_name}
                    </h3>
                  </div>
                </div>

                {/* Right section: Published Date + Attachment Link */}
                <div className="flex flex-row items-center justify-between sm:justify-end gap-4 sm:gap-6 flex-shrink-0 w-full sm:w-auto mt-2.5 sm:mt-0 pt-2.5 sm:pt-0 border-t border-white/[0.04] sm:border-0">
                  <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-600" />
                    <span className="hidden sm:inline">Published: </span>
                    {formatDateTime(res.published_at)}
                  </span>
                  <div className="flex items-center gap-2 sm:min-w-[140px] sm:justify-end">
                    {res.result_sheet_url ? (
                      <AttachmentViewer url={res.result_sheet_url} fileName={`${res.exam_name}_results`}>
                        <button
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-bold text-[#121214] bg-gradient-to-r from-amber-400 to-amber-500 shadow-[0_4px_12px_rgba(245,158,11,0.2)] hover:shadow-[0_6px_16px_rgba(245,158,11,0.35)] hover:from-amber-300 hover:to-amber-500 active:scale-[0.97] transition-all cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>View Marksheet</span>
                          <ArrowUpRight className="w-3 h-3 flex-shrink-0" />
                        </button>
                      </AttachmentViewer>
                    ) : (
                      <span className="text-[10px] text-slate-600 italic">No attachment</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
