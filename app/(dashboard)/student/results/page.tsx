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
    .select('*')
    .eq('student_id', user.id)
    .order('published_at', { ascending: false });

  if (error) {
    console.error('Failed to load results:', error);
  }

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">My Exam Results</h1>
        <p className="page-subtitle">Your graded exams, tests, and answer sheets. Results are private to you.</p>
      </div>

      {!results || results.length === 0 ? (
        <div className="glass-card p-12 text-center flex flex-col items-center justify-center gap-3">
          <Award className="w-12 h-12 text-muted-foreground opacity-30" />
          <h2 className="text-lg font-semibold">No results published yet</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            Your exam grades will appear here once your class representative publishes them.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {results.map((res) => {
            const hasMarks = res.marks !== null && res.total_marks !== null;
            const percentage = hasMarks ? Math.round((res.marks! / res.total_marks!) * 100) : null;
            
            return (
              <div key={res.id} className="glass-card p-5 flex flex-col justify-between hover:scale-[1.01] transition-transform duration-200">
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold text-muted-foreground bg-accent px-2 py-1 rounded border border-border">
                      {res.subject}
                    </span>
                    {res.grade && (
                      <span className="badge bg-primary/10 text-primary border border-primary/20 px-2.5 py-0.5 rounded text-xs font-bold">
                        Grade: {res.grade}
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-foreground mb-1 leading-snug">
                    {res.exam_name}
                  </h3>
                  
                  {hasMarks && (
                    <div className="mt-3 flex items-baseline gap-2">
                      <span className="text-2xl font-extrabold text-foreground">
                        {res.marks}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        / {res.total_marks} marks
                      </span>
                      {percentage !== null && (
                        <span className="text-xs font-semibold text-emerald-400 ml-2">
                          ({percentage}%)
                        </span>
                      )}
                    </div>
                  )}
                </div>

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
                      View Sheet
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
