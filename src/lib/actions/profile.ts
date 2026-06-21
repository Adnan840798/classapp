'use server';

import { getSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { STORAGE_BUCKETS } from '@/lib/constants';
import { generateStoragePath } from '@/lib/utils/formatters';
import { createClient, FunctionsHttpError } from '@supabase/supabase-js';

function normalizeBdNumber(num: string | null | undefined): string | null {
  if (!num) return null;
  const cleaned = num.trim();
  if (cleaned === '') return null;
  
  const digits = cleaned.replace(/\D/g, ''); // strip all non-digits
  if (digits.length === 10 && digits.startsWith('1')) {
    return '+880' + digits;
  }
  if (digits.length === 11 && digits.startsWith('01')) {
    return '+88' + digits;
  }
  if (digits.length === 13 && digits.startsWith('8801')) {
    return '+' + digits;
  }
  if (cleaned.startsWith('+')) {
    const plusDigits = cleaned.slice(1).replace(/\D/g, '');
    if (plusDigits.length === 13 && plusDigits.startsWith('8801')) {
      return '+' + plusDigits;
    }
  }
  return cleaned; // return original for validation failure
}

const ProfileSchema = z.object({
  full_name: z.string().min(1, 'Full name is required').max(100),
  phone: z.string()
    .transform((val) => normalizeBdNumber(val))
    .refine((val) => val === null || val === undefined || /^\+8801[3-9]\d{8}$/.test(val), {
      message: 'Invalid Bangladeshi phone number. Must be a valid 11-digit mobile number.',
    })
    .optional()
    .nullable(),
  whatsapp: z.string()
    .transform((val) => normalizeBdNumber(val))
    .refine((val) => val === null || val === undefined || /^\+8801[3-9]\d{8}$/.test(val), {
      message: 'Invalid Bangladeshi WhatsApp number. Must be a valid 11-digit mobile number.',
    })
    .optional()
    .nullable(),
  telegram_handle: z.string().max(100).optional().nullable(),
  notif_enabled: z.boolean().default(true),
});


export async function updateProfile(formData: FormData) {
  try {
    const supabase = await getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const raw = {
      full_name: formData.get('full_name') as string,
      phone: (formData.get('phone') as string) || null,
      whatsapp: (formData.get('whatsapp') as string) || null,
      telegram_handle: (formData.get('telegram_handle') as string) || null,
      notif_enabled: formData.get('notif_enabled') === 'true',
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
      whatsapp: parsed.data.whatsapp,
      telegram_handle: parsed.data.telegram_handle,
      notif_enabled: parsed.data.notif_enabled,
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
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user || !session) return { error: 'Unauthorized' };

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

    // Invoke the tenant's administrative Edge Function to delete the student
    const { data: edgeData, error: edgeError } = await supabase.functions.invoke('manage-student', {
      headers: {
        Authorization: `Bearer ${session.access_token}`
      },
      body: {
        action: 'delete-student',
        studentId: targetUserId
      }
    });

    if (edgeError || (edgeData && edgeData.error)) {
      console.error('deleteUserAccount edge error:', edgeError || edgeData?.error);
      let errorMsg = 'Failed to delete student account.';
      if (edgeError instanceof FunctionsHttpError) {
        try {
          const errorBody = await edgeError.context.json();
          errorMsg = errorBody.error || errorBody.message || errorMsg;
        } catch {
          try {
            const errorText = await edgeError.context.text();
            errorMsg = errorText || errorMsg;
          } catch {}
        }
      } else if (edgeError) {
        errorMsg = edgeError.message;
      } else if (edgeData?.error) {
        errorMsg = edgeData.error;
      }
      return { error: errorMsg };
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
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user || !session) return { error: 'Unauthorized' };

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

    // Invoke the tenant's administrative Edge Function to create the student account
    const { data: edgeData, error: edgeError } = await supabase.functions.invoke('manage-student', {
      headers: {
        Authorization: `Bearer ${session.access_token}`
      },
      body: {
        action: 'create-student',
        email,
        password: input.password,
        fullName: full_name,
        universityId: university_id,
        batch: input.batch?.trim() || 'N/A',
        department: input.department?.trim() || 'N/A',
      }
    });

    if (edgeError || (edgeData && edgeData.error)) {
      console.error('createStudentAccount edge error:', edgeError || edgeData?.error);
      let errorMsg = 'Failed to create student account.';
      if (edgeError instanceof FunctionsHttpError) {
        try {
          const errorBody = await edgeError.context.json();
          errorMsg = errorBody.error || errorBody.message || errorMsg;
        } catch {
          try {
            const errorText = await edgeError.context.text();
            errorMsg = errorText || errorMsg;
          } catch {}
        }
      } else if (edgeError) {
        errorMsg = edgeError.message;
      } else if (edgeData?.error) {
        errorMsg = edgeData.error;
      }
      return { error: errorMsg };
    }

    revalidatePath('/student/profile');
    revalidatePath('/cr/profile');
    return { success: true, userId: edgeData.userId };
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

    // Step 2: Use the authenticated user client to mark password_reset_required = false.
    // Since the user is authenticated and updating their own row, RLS allows this update.
    const { error: dbError } = await supabase
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

/**
 * Changes the authenticated user's password after verifying their current password.
 * Used from the Profile page when the user knows their old password.
 */
export async function changePassword(currentPassword: string, newPassword: string) {
  try {
    if (!newPassword || newPassword.length < 8) {
      return { error: 'New password must be at least 8 characters long.' };
    }
    if (currentPassword === newPassword) {
      return { error: 'New password must be different from your current password.' };
    }

    const supabase = await getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !user.email) return { error: 'Not authenticated. Please log in again.' };

    // Re-authenticate to verify the current password is correct
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });

    if (signInError) {
      return { error: 'Current password is incorrect.' };
    }

    // Update to the new password
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    if (updateError) {
      return { error: updateError.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('changePassword error:', err);
    return { error: err.message || 'An unexpected error occurred.' };
  }
}

/**
 * Sends a password reset email after verifying the email exists in this class's database.
 * This ensures users from other classes cannot use reset emails via this class's endpoint.
 */
export async function requestPasswordReset(email: string) {
  try {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return { error: 'Email is required.' };

    const supabase = await getSupabaseServerClient();

    // Verify the email belongs to a profile in this tenant's class
    const { data: profileRow } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (!profileRow) {
      return {
        success: false,
        unrecognized: true,
        error: 'This email address is not registered in this class portal. Please contact your Class Representative.',
      };
    }

    // Send the Supabase password reset email
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://classapp.vercel.app';
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: `${siteUrl}/reset-password?type=recovery`,
    });

    if (resetError) {
      console.error('requestPasswordReset error:', resetError);
      return { error: 'Failed to send reset email. Please try again later.' };
    }

    return { success: true };
  } catch (err: any) {
    console.error('requestPasswordReset error:', err);
    return { error: err.message || 'An unexpected error occurred.' };
  }
}

/**
 * Update the global semester config (total weeks and start date). CR/Admin only.
 */
export async function updateSemesterConfig(formData: FormData) {
  try {
    const supabase = await getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || (profile.role !== 'cr' && profile.role !== 'admin')) {
      return { error: 'Unauthorized: Only CRs and Admins can update semester config.' };
    }

    const totalWeeksStr = formData.get('total_weeks') as string;
    const startDate = formData.get('start_date') as string;

    const totalWeeks = parseInt(totalWeeksStr, 10);
    if (isNaN(totalWeeks) || totalWeeks < 1 || totalWeeks > 52) {
      return { error: 'Total weeks must be a number between 1 and 52.' };
    }

    if (!startDate || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      return { error: 'Start date must be in YYYY-MM-DD format.' };
    }

    const { error } = await supabase
      .from('semester_config')
      .update({
        total_weeks: totalWeeks,
        start_date: startDate,
        updated_at: new Date().toISOString(),
        updated_by: user.id
      })
      .eq('id', 1);

    if (error) {
      return { error: error.message };
    }

    revalidatePath('/cr/timeline');
    revalidatePath('/student/timeline');
    revalidatePath('/cr/profile');
    revalidatePath('/student/profile');

    return { success: true };
  } catch (err: any) {
    console.error('updateSemesterConfig error:', err);
    return { error: err.message || 'An unexpected error occurred.' };
  }
}

/**
 * Update only the avatar (profile picture) directly.
 */
export async function updateAvatar(formData: FormData) {
  try {
    const supabase = await getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const avatarFile = formData.get('avatar') as File | null;
    if (!avatarFile || avatarFile.size === 0) {
      return { error: 'No avatar image file provided.' };
    }
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

    const profile_pic_url = urlData.publicUrl;

    const { error } = await supabase
      .from('profiles')
      .update({
        profile_pic_url,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (error) {
      return { error: error.message };
    }

    revalidatePath('/student/profile');
    revalidatePath('/cr/profile');
    return { success: true, url: profile_pic_url };
  } catch (err: any) {
    if (
      err instanceof Error &&
      (err.message === 'NEXT_REDIRECT' || (err as any).digest?.startsWith('NEXT_REDIRECT'))
    ) {
      throw err;
    }
    console.error('updateAvatar error:', err);
    return { error: err.message || 'Failed to update profile picture.' };
  }
}

export async function removeAvatar() {
  try {
    const supabase = await getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { error } = await supabase
      .from('profiles')
      .update({
        profile_pic_url: null,
        updated_at: new Date().toISOString(),
      })
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
    console.error('removeAvatar error:', err);
    return { error: err.message || 'Failed to remove profile picture.' };
  }
}

export async function updateNotifEnabled(enabled: boolean) {
  try {
    const supabase = await getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { error } = await supabase
      .from('profiles')
      .update({
        notif_enabled: enabled,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (error) return { error: error.message };

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
    console.error('updateNotifEnabled error:', err);
    return { error: err.message || 'An unexpected error occurred.' };
  }
}


