import Link from 'next/link';
import { Plus, Award, Trash2, Calendar, FileText, CheckCircle } from 'lucide-react';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { formatDateTime } from '@/lib/utils/formatters';
import { deleteResult } from '@/lib/actions/results';
import { DeleteButton } from '@/components/ui/DeleteButton';

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
    <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="page-header mb-0">
          <h1 className="page-title">Exam Results</h1>
          <p className="page-subtitle">Publish the marksheets</p>
        </div>
        <Link href="/cr/results/publish" className="btn-primary self-start sm:self-auto">
          <Plus className="w-4 h-4" />
          Publish Result
        </Link>
      </div>

      {!results || results.length === 0 ? (
        <div className="glass-card p-12 text-center flex flex-col items-center justify-center gap-3">
          <Award className="w-12 h-12 text-muted-foreground opacity-30 animate-pulse" />
          <h2 className="text-lg font-semibold">No results published</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            Publish exam sheets and results class-wide. All students will be able to view these results.
          </p>
          <Link href="/cr/results/publish" className="btn-primary mt-2">
            <Plus className="w-4 h-4" />
            Publish a Result
          </Link>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-accent/30 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <th className="p-4">Exam Name</th>
                  <th className="p-4">File</th>
                  <th className="p-4">Published At</th>
                  <th className="p-4 ">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-sm">
                {results.map((res) => (
                  <tr key={res.id} className="hover:bg-accent/10 transition-colors">
                    <td className="p-4 font-semibold text-foreground">
                      {res.exam_name}
                    </td>
                    <td className="p-4">
                      {res.result_sheet_url ? (
                        <a
                          href={res.result_sheet_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          Attachment
                        </a>
                      ) : (
                        <span className="text-muted-foreground italic text-xs">None</span>
                      )}
                    </td>
                    <td className="p-4 text-xs text-muted-foreground">
                      {formatDateTime(res.published_at)}
                    </td>
                    <td className="p-4 text-right">
                      <DeleteButton
                        id={res.id}
                        onDelete={deleteResult}
                        confirmMessage="Are you sure you want to delete this result?"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
