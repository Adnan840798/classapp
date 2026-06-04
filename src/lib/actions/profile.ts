'use server';

import { getSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { STORAGE_BUCKETS } from '@/lib/constants';
import { generateStoragePath } from '@/lib/utils/formatters';

const ProfileSchema = z.object({
  full_name: z.string().min(1, 'Full name is required').max(100),
  phone: z.string().max(20).optional().nullable(),
  facebook_id: z.string().max(100).optional().nullable(),
  whatsapp: z.string().max(20).optional().nullable(),
  telegram_handle: z.string().max(100).optional().nullable(),
  blood_group: z.string().max(10).optional().nullable(),
  address: z.string().max(300).optional().nullable(),
  notif_enabled: z.boolean().default(true),
  notif_sound_on: z.boolean().default(true),
});

export async function updateProfile(formData: FormData) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const raw = {
    full_name: formData.get('full_name') as string,
    phone: (formData.get('phone') as string) || null,
    facebook_id: (formData.get('facebook_id') as string) || null,
    whatsapp: (formData.get('whatsapp') as string) || null,
    telegram_handle: (formData.get('telegram_handle') as string) || null,
    blood_group: (formData.get('blood_group') as string) || null,
    address: (formData.get('address') as string) || null,
    notif_enabled: formData.get('notif_enabled') === 'true',
    notif_sound_on: formData.get('notif_sound_on') === 'true',
  };

  const parsed = ProfileSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  // Handle avatar upload if provided
  let profile_pic_url: string | null = null;
  const avatarFile = formData.get('avatar') as File | null;
  
  if (avatarFile && avatarFile.size > 0) {
    if (!avatarFile.type.startsWith('image/')) {
      return { error: 'Only images are accepted for profile picture.' };
    }
    if (avatarFile.size > 2 * 1024 * 1024) {
      return { error: 'Avatar must be under 2MB.' };
    }

    const path = generateStoragePath(user.id, avatarFile.name);
    
    // Upload image
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKETS.AVATARS)
      .upload(path, avatarFile, { contentType: avatarFile.type, upsert: true });

    if (uploadError) {
      return { error: `Avatar upload failed: ${uploadError.message}` };
    }

    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKETS.AVATARS)
      .getPublicUrl(uploadData.path);

    profile_pic_url = urlData.publicUrl;
  }

  const updateData: any = {
    full_name: parsed.data.full_name,
    phone: parsed.data.phone,
    facebook_id: parsed.data.facebook_id,
    whatsapp: parsed.data.whatsapp,
    telegram_handle: parsed.data.telegram_handle,
    blood_group: parsed.data.blood_group,
    address: parsed.data.address,
    notif_enabled: parsed.data.notif_enabled,
    notif_sound_on: parsed.data.notif_sound_on,
    updated_at: new Date().toISOString(),
  };

  if (profile_pic_url) {
    updateData.profile_pic_url = profile_pic_url;
  }

  const { error } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/student/profile');
  return { success: true };
}
