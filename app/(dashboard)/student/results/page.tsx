import { redirect } from 'next/navigation';
import { Award, FileText, Calendar } from 'lucide-react';
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
      <div className="page-header">
        <h1 className="page-title">Exam Results</h1>
        <p className="page-subtitle">Class exam results and answer sheets published by your CR.</p>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {results.map((res) => (
            <div
              key={res.id}
              className="glass-card p-5 flex flex-col justify-between hover:scale-[1.01] transition-transform duration-200"
            >
              <h3 className="text-base font-bold text-foreground leading-snug">
                {res.exam_name}
              </h3>

              <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  Published {formatDateTime(res.published_at)}
                </div>

                {res.result_sheet_url && (
                  <a
                    href={res.result_sheet_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                  >
                    <FileText className="w-4 h-4" />
                    View Attachment
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
