'use server';

import { getSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { STORAGE_BUCKETS } from '@/lib/constants';
import { generateStoragePath } from '@/lib/utils/formatters';
import { createClient } from '@supabase/supabase-js';

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
  try {
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

      if (uploadError || !uploadData) {
        return { error: `Avatar upload failed: ${uploadError?.message || 'Unknown upload error'}` };
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
    revalidatePath('/cr/profile');
    return { success: true };
  } catch (err: any) {
    if (
      err instanceof Error &&
      (err.message === 'NEXT_REDIRECT' || (err as any).digest?.startsWith('NEXT_REDIRECT'))
    ) {
      throw err;
    }
    console.error('updateProfile error:', err);
    return { error: err.message || 'An unexpected error occurred.' };
  }
}

export async function updateUserRole(targetUserId: string, newRole: 'student' | 'cr' | 'admin') {
  try {
    const supabase = await getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Unauthorized' };

    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!callerProfile || (callerProfile.role !== 'cr' && callerProfile.role !== 'admin')) {
      return { error: 'Access denied. Only Class Representatives or Admins can manage accounts.' };
    }

    // Initialize admin client to update user role
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Update in profiles table
    const { error: dbError } = await supabaseAdmin
      .from('profiles')
      .update({ role: newRole })
      .eq('id', targetUserId);

    if (dbError) {
      return { error: dbError.message };
    }

    // Also update in user raw_user_meta_data so it matches
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      targetUserId,
      { user_metadata: { role: newRole } }
    );

    if (authError) {
      console.warn('Auth metadata update failed:', authError.message);
    }

    revalidatePath('/student/profile');
    revalidatePath('/cr/profile');
    return { success: true };
  } catch (err: any) {
    console.error('updateUserRole error:', err);
    return { error: err.message || 'An unexpected error occurred.' };
  }
}

export async function deleteUserAccount(targetUserId: string) {
  try {
    const supabase = await getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Unauthorized' };

    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!callerProfile || (callerProfile.role !== 'cr' && callerProfile.role !== 'admin')) {
      return { error: 'Access denied. Only Class Representatives or Admins can manage accounts.' };
    }

    // Prevent deleting own account
    if (user.id === targetUserId) {
      return { error: 'You cannot delete your own account.' };
    }

    // Initialize admin client to delete user from auth
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);
    if (authError) {
      return { error: authError.message };
    }

    revalidatePath('/student/profile');
    revalidatePath('/cr/profile');
    return { success: true };
  } catch (err: any) {
    console.error('deleteUserAccount error:', err);
    return { error: err.message || 'An unexpected error occurred.' };
  }
}

export async function createStudentAccount(input: {
  email: string;
  password: string;
  full_name: string;
  university_id: string;
  batch?: string;
  department?: string;
}) {
  try {
    const supabase = await getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Unauthorized' };

    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!callerProfile || (callerProfile.role !== 'cr' && callerProfile.role !== 'admin')) {
      return { error: 'Access denied. Only Class Representatives or Admins can create accounts.' };
    }

    // Validate required fields
    const email = input.email.trim().toLowerCase();
    const full_name = input.full_name.trim();
    const university_id = input.university_id.trim().toUpperCase();
    if (!email || !full_name || !university_id || !input.password) {
      return { error: 'Email, full name, university ID, and password are all required.' };
    }
    if (input.password.length < 8) {
      return { error: 'Temporary password must be at least 8 characters.' };
    }

    // Pre-check: ensure university_id is not already taken
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('university_id', university_id)
      .maybeSingle();
    if (existingProfile) {
      return { error: `University ID "${university_id}" is already registered to another account.` };
    }

    // Admin client uses service role — bypasses RLS and email confirmation
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Create the auth.users record.
    // The handle_new_user database trigger will automatically INSERT a matching
    // row in public.profiles (with password_reset_required = true) from the
    // user_metadata we pass here. No manual upsert needed.
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: input.password,
      email_confirm: true,
      user_metadata: {
        full_name,
        university_id,
        role: 'student',
        batch: input.batch?.trim() || 'N/A',
        department: input.department?.trim() || 'N/A',
      },
    });

    if (createError || !newUser?.user) {
      console.error('createStudentAccount auth error:', createError);
      return { error: createError?.message || 'Failed to create auth account.' };
    }

    revalidatePath('/student/profile');
    revalidatePath('/cr/profile');
    return { success: true, userId: newUser.user.id };
  } catch (err: any) {
    console.error('createStudentAccount error:', err);
    return { error: err.message || 'An unexpected error occurred.' };
  }
}

export async function resetFirstTimePassword(newPassword: string) {
  try {
    if (!newPassword || newPassword.length < 6) {
      return { error: 'Password must be at least 6 characters long.' };
    }

    const supabase = await getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Not authenticated. Please log in again.' };

    // Step 1: Update the password in Supabase Auth using the user's own session.
    // This is the correct approach — updateUser() operates on the currently
    // signed-in user and doesn't require the service role.
    const { error: authError } = await supabase.auth.updateUser({ password: newPassword });
    if (authError) {
      console.error('resetFirstTimePassword auth error:', authError);
      return { error: authError.message };
    }

    // Step 2: Use the admin (service role) client to mark password_reset_required = false.
    // We bypass the anon client here so RLS can never block this critical update.
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { error: dbError } = await supabaseAdmin
      .from('profiles')
      .update({ password_reset_required: false })
      .eq('id', user.id);

    if (dbError) {
      console.error('resetFirstTimePassword profile update error:', dbError);
      return { error: `Password updated but profile flag failed: ${dbError.message}` };
    }

    revalidatePath('/student/profile');
    revalidatePath('/cr/profile');
    return { success: true };
  } catch (err: any) {
    console.error('resetFirstTimePassword error:', err);
    return { error: err.message || 'An unexpected error occurred.' };
  }
}

