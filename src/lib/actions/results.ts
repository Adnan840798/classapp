'use server';

import { getSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { STORAGE_BUCKETS, STORAGE_PATHS } from '@/lib/constants';
import { generateStoragePath } from '@/lib/utils/formatters';

const ResultSchema = z.object({
  university_id: z.string().min(1, 'University ID is required'),
  exam_name: z.string().min(1, 'Exam name is required').max(200),
  subject: z.string().min(1, 'Subject is required').max(100),
  marks: z.string().optional(),
  total_marks: z.string().optional(),
  grade: z.string().max(10).optional(),
});

export async function publishResult(formData: FormData) {
  const supabase = await getSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const raw = {
    university_id: formData.get('university_id') as string,
    exam_name: formData.get('exam_name') as string,
    subject: formData.get('subject') as string,
    marks: (formData.get('marks') as string) || undefined,
    total_marks: (formData.get('total_marks') as string) || undefined,
    grade: (formData.get('grade') as string) || undefined,
  };

  const parsed = ResultSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  // Look up student by university_id
  const { data: student, error: studentError } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('university_id', parsed.data.university_id)
    .eq('role', 'student')
    .single();

  if (studentError || !student) {
    return { error: 'Student not found with this University ID.' };
  }

  // Handle result sheet upload
  let result_sheet_url: string | null = null;
  const file = formData.get('result_sheet') as File | null;
  if (file && file.size > 0) {
    const isImage = file.type.startsWith('image/');
    const isPDF = file.type === 'application/pdf';
    if (!isImage && !isPDF) {
      return { error: 'Only images and PDF files are accepted.' };
    }
    const path = generateStoragePath(STORAGE_PATHS.RESULTS, file.name);
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKETS.NOTICES)
      .upload(path, file, { contentType: file.type });
    if (uploadError) return { error: `Upload failed: ${uploadError.message}` };
    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKETS.NOTICES)
      .getPublicUrl(uploadData.path);
    result_sheet_url = urlData.publicUrl;
  }

  // Insert result
  const { data: result, error: insertError } = await supabase
    .from('exam_results')
    .insert({
      student_id: student.id,
      exam_name: parsed.data.exam_name,
      subject: parsed.data.subject,
      marks: parsed.data.marks ? parseFloat(parsed.data.marks) : null,
      total_marks: parsed.data.total_marks ? parseFloat(parsed.data.total_marks) : null,
      grade: parsed.data.grade ?? null,
      result_sheet_url,
      published_by: user.id,
    })
    .select('id')
    .single();

  if (insertError || !result) {
    return { error: `Failed to publish result: ${insertError?.message}` };
  }

  // Notify that specific student
  await supabase.rpc('notify_single_student', {
    p_student_id: student.id,
    p_title: `Result Published: ${parsed.data.exam_name}`,
    p_message: `Your result for ${parsed.data.subject} has been published.${parsed.data.grade ? ` Grade: ${parsed.data.grade}` : ''}`,
    p_type: 'result',
    p_reference_id: result.id,
  });

  revalidatePath('/cr/results');
  redirect('/cr/results');
}

export async function deleteResult(id: string) {
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.from('exam_results').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/cr/results');
  return { success: true };
}
