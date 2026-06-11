import Link from 'next/link';
import { Plus, Award, Calendar, FileText, ArrowUpRight } from 'lucide-react';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { formatDateTime } from '@/lib/utils/formatters';
import { deleteResult } from '@/lib/actions/results';
import { DeleteButton } from '@/components/ui/DeleteButton';
import { AttachmentViewer } from '@/components/ui/AttachmentViewer';

export const revalidate = 0; // force dynamic rendering

export default async function CRResultsPage() {
  const supabase = await getSupabaseServerClient();

  const { data: results, error } = await supabase
    .from('exam_results')
    .select('*')
    .order('published_at', { ascending: false });

  if (error) {
    console.error('Failed to load results:', error);
  }

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="page-header mb-0">
          <h1 className="page-title">Exam Results</h1>
          <p className="page-subtitle">Publish and manage academic marksheets for the class</p>
        </div>
        <Link href="/cr/results/publish" className="btn-yellow w-full sm:w-auto justify-center flex-shrink-0">
          <Plus className="w-4 h-4" />
          Publish Result
        </Link>
      </div>

      {!results || results.length === 0 ? (
        <div className="glass-card p-12 text-center flex flex-col items-center justify-center gap-3">
          <Award className="w-12 h-12 text-muted-foreground opacity-30 animate-pulse" />
          <h2 className="text-lg font-semibold">No results published yet</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            Publish exam sheets and results class-wide. All students will be able to view these results.
          </p>
          <Link href="/cr/results/publish" className="btn-yellow mt-2">
            <Plus className="w-4 h-4" />
            Publish a Result
          </Link>
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
                style={{ background: 'linear-gradient(180deg, #34D399, #059669)' }}
              />

              <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                {/* Left section: Icon + Title */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                    <Award className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-extrabold text-white break-words leading-snug">
                      {res.exam_name}
                    </h3>
                  </div>
                </div>

                {/* Right section: Published Date + Actions */}
                <div className="flex flex-row items-center justify-between sm:justify-end gap-4 sm:gap-6 flex-shrink-0 w-full sm:w-auto mt-2.5 sm:mt-0 pt-2.5 sm:pt-0 border-t border-white/[0.04] sm:border-0">
                  <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-600" />
                    <span className="hidden sm:inline">Published: </span>
                    {formatDateTime(res.published_at)}
                  </span>
                  <div className="flex items-center gap-2">
                    {res.result_sheet_url ? (
                      <AttachmentViewer url={res.result_sheet_url} fileName={`${res.exam_name}_results`}>
                        <button
                          className="flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 rounded-lg text-emerald-400 border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 transition-all cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>View Marksheet</span>
                          <ArrowUpRight className="w-3 h-3 flex-shrink-0" />
                        </button>
                      </AttachmentViewer>
                    ) : (
                      <span className="text-[10px] text-slate-600 italic">No attachment</span>
                    )}
                    <DeleteButton
                      id={res.id}
                      onDelete={deleteResult}
                      confirmMessage="Are you sure you want to delete this result?"
                    />
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
