'use server';

import { getSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { STORAGE_BUCKETS } from '@/lib/constants';
import { compressFileForStorage } from '@/lib/utils/compress';

/**
 * Upload class routine (CR only)
 */
export async function uploadRoutine(formData: FormData) {
  const supabase = await getSupabaseServerClient();

  // Authentication check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Role check
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || (profile.role !== 'cr' && profile.role !== 'admin')) {
    return { error: 'Unauthorized: Only CRs and Admins can upload routines.' };
  }

  const file = formData.get('routine') as File | null;
  if (!file || file.size === 0) {
    return { error: 'No file provided.' };
  }

  if (!file.type.startsWith('image/')) {
    return { error: 'Only image files are accepted.' };
  }

  if (file.size > 5 * 1024 * 1024) {
    return { error: 'Image must be under 5 MB.' };
  }

  try {
    // 1. Delete previous routine from storage if exists (defensive check)
    const { data: oldRoutine } = await supabase
      .from('class_routine')
      .select('image_url')
      .order('uploaded_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (oldRoutine?.image_url) {
      try {
        const urlParts = oldRoutine.image_url.split('/public/notices/');
        if (urlParts.length > 1) {
          const oldStoragePath = urlParts[1];
          await supabase.storage
            .from(STORAGE_BUCKETS.NOTICES)
            .remove([oldStoragePath]);
        }
      } catch (err) {
        console.warn('Failed to delete old routine from storage (non-fatal):', err);
      }
    }

    // 2. Compress the image for storage
    const { buffer, contentType, fileName } = await compressFileForStorage(file);
    const safeName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const path = `routine/${Date.now()}-${safeName}`;

    // 3. Upload to notices bucket
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKETS.NOTICES)
      .upload(path, buffer, { contentType, upsert: false });

    if (uploadError) {
      return { error: `Upload failed: ${uploadError.message}` };
    }

    // 4. Get public URL
    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKETS.NOTICES)
      .getPublicUrl(uploadData.path);

    const imageUrl = urlData.publicUrl;

    // 5. Delete old rows from table and insert new one
    const { error: deleteError } = await supabase.from('class_routine').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (deleteError) {
      console.warn('Failed to delete old routine database rows (non-fatal):', deleteError.message);
    }

    const { error: insertError } = await supabase.from('class_routine').insert({
      image_url: imageUrl,
      uploaded_by: user.id,
    });

    if (insertError) {
      return { error: `Database insert failed: ${insertError.message}` };
    }

    revalidatePath('/cr/timeline');
    revalidatePath('/student/timeline');
    return { success: true };
  } catch (err: any) {
    console.error('Routine upload error:', err);
    return { error: err.message || 'An unexpected error occurred during upload.' };
  }
}

/**
 * Delete class routine (CR only)
 */
export async function deleteRoutine() {
  const supabase = await getSupabaseServerClient();

  // Authentication check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Role check
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || (profile.role !== 'cr' && profile.role !== 'admin')) {
    return { error: 'Unauthorized: Only CRs and Admins can delete routines.' };
  }

  try {
    const { data: routine } = await supabase
      .from('class_routine')
      .select('image_url')
      .order('uploaded_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (routine?.image_url) {
      const urlParts = routine.image_url.split('/public/notices/');
      if (urlParts.length > 1) {
        const storagePath = urlParts[1];
        await supabase.storage
          .from(STORAGE_BUCKETS.NOTICES)
          .remove([storagePath]);
      }
    }

    const { error: deleteError } = await supabase.from('class_routine').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (deleteError) {
      return { error: `Failed to delete routine record: ${deleteError.message}` };
    }

    revalidatePath('/cr/timeline');
    revalidatePath('/student/timeline');
    return { success: true };
  } catch (err: any) {
    console.error('Routine deletion error:', err);
    return { error: err.message || 'An unexpected error occurred.' };
  }
}
