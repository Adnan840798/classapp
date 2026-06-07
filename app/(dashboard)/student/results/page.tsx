import { redirect } from 'next/navigation';
import { Award, FileText, Calendar, ArrowUpRight } from 'lucide-react';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { formatDateTime } from '@/lib/utils/formatters';

export const revalidate = 0; // force dynamic rendering

export default async function StudentResultsPage() {
  const supabase = await getSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: results, error } = await supabase
    .from('exam_results')
    .select('id, exam_name, result_sheet_url, published_at')
    .order('published_at', { ascending: false });

  if (error) {
    console.error('Failed to load results:', error);
  }

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
                background: 'rgba(11,14,30,0.4)',
                border: '1px solid #1e2a4a',
              }}
            >
              {/* Left purple colored accent line */}
              <div
                className="absolute left-0 top-0 bottom-0 w-1"
                style={{ background: 'linear-gradient(180deg, #6366f1, #a855f7)' }}
              />

              <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                {/* Left section: Icon + Title */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center flex-shrink-0">
                    <Award className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-extrabold text-white break-words leading-snug">
                      {res.exam_name}
                    </h3>
                  </div>
                </div>

                {/* Right section: Published Date + Attachment Link */}
                <div className="flex items-center justify-between sm:justify-end gap-6 flex-shrink-0">
                  <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-600" />
                    Published: {formatDateTime(res.published_at)}
                  </span>
                  <div className="flex items-center gap-2">
                    {res.result_sheet_url ? (
                      <a
                        href={res.result_sheet_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 rounded-lg text-indigo-400 border border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-500/10 transition-all"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>View Marksheet</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </a>
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
