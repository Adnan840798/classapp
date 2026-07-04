'use server';

import { getSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { cookies, headers } from 'next/headers';
import { z } from 'zod';
import { randomInt } from 'crypto';
import { STORAGE_BUCKETS } from '@/lib/constants';
import { generateStoragePath } from '@/lib/utils/formatters';
import { createClient, FunctionsHttpError } from '@supabase/supabase-js';
import { sendEmail, getPasswordResetHtml, getOtpResetHtml } from '@/lib/utils/email';

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
    const { data: { session } } = await supabase.auth.getSession();
    if (!user || !session) return { error: 'Unauthorized' };

    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!callerProfile || (callerProfile.role !== 'cr' && callerProfile.role !== 'admin')) {
      return { error: 'Access denied. Only Class Representatives or Admins can manage accounts.' };
    }

    // Route through the tenant's manage-student Edge Function.
    // The Edge Function runs inside the tenant's own Supabase project and uses its
    // own SUPABASE_SERVICE_ROLE_KEY (Deno.env) — always the correct tenant DB.
    // This fixes the bug where the old admin client used NEXT_PUBLIC_SUPABASE_URL
    // (master project), which would write to the wrong DB when multiple tenants exist.
    const { data: edgeData, error: edgeError } = await supabase.functions.invoke('manage-student', {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      body: {
        action: 'update-role',
        targetUserId,
        newRole,
      },
    });

    if (edgeError || (edgeData && edgeData.error)) {
      const msg = edgeData?.error || edgeError?.message || 'Failed to update role.';
      console.error('updateUserRole edge error:', msg);
      return { error: msg };
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
      if (edgeError) {
        errorMsg = `[EdgeError] name: ${edgeError.name}, message: ${edgeError.message}`;
        if (edgeError instanceof FunctionsHttpError) {
          errorMsg += `, status: ${edgeError.context.status}`;
          try {
            const errorBody = await edgeError.context.json();
            errorMsg += `, body: ${JSON.stringify(errorBody)}`;
          } catch {
            try {
              const errorText = await edgeError.context.text();
              errorMsg += `, bodyText: ${errorText}`;
            } catch {}
          }
        }
      } else if (edgeData?.error) {
        errorMsg = typeof edgeData.error === 'object' ? JSON.stringify(edgeData.error) : String(edgeData.error);
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
      if (edgeError) {
        errorMsg = `[EdgeError] name: ${edgeError.name}, message: ${edgeError.message}`;
        if (edgeError instanceof FunctionsHttpError) {
          errorMsg += `, status: ${edgeError.context.status}`;
          try {
            const errorBody = await edgeError.context.json();
            errorMsg += `, body: ${JSON.stringify(errorBody)}`;
          } catch {
            try {
              const errorText = await edgeError.context.text();
              errorMsg += `, bodyText: ${errorText}`;
            } catch {}
          }
        }
      } else if (edgeData?.error) {
        errorMsg = typeof edgeData.error === 'object' ? JSON.stringify(edgeData.error) : String(edgeData.error);
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
    if (!newPassword || newPassword.length < 8) {
      return { error: 'Password must be at least 8 characters long.' };
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

    // BUG-08 fix: A server-side signInWithPassword() after updateUser() cannot write the
    // refreshed JWT back to the browser's cookie jar (cookie store is read-only in Server Actions).
    // We signal requiresReLogin so the client can do a browser-side sign-in to refresh the session.
    return { success: true, requiresReLogin: true, email: user.email };
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
      .select('id, full_name')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (!profileRow) {
      return {
        success: false,
        unrecognized: true,
        error: 'This email address is not registered in this class portal. Please contact your Class Representative.',
      };
    }

    // Derive the live site URL from the incoming request headers
    const headerStore = await headers();
    const host = headerStore.get('host') || 'classapp0.vercel.app';
    let proto = headerStore.get('x-forwarded-proto');
    if (!proto) {
      proto = host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https';
    }
    const siteUrl = `${proto}://${host}`;
    const redirectTo = `${siteUrl}/reset-password?type=recovery`;

    // 1. Call the manage-student Edge Function to generate a recovery link.
    //    The Edge Function runs inside this tenant's Supabase project and therefore
    //    automatically has the correct SUPABASE_SERVICE_ROLE_KEY — no env var needed.
    const cookieStore = await cookies();
    const tenantUrl = cookieStore.get('tenant_supabase_url')?.value || process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const tenantAnonKey = cookieStore.get('tenant_supabase_anon_key')?.value || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    let resetLink: string | null = null;

    try {
      const fnUrl = `${tenantUrl}/functions/v1/manage-student`;
      const fnRes = await fetch(fnUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': tenantAnonKey,
        },
        body: JSON.stringify({
          action: 'generate-reset-link',
          email: normalizedEmail,
          redirectTo,
        }),
      });

      const fnData = await fnRes.json();
      if (fnData?.link) {
        resetLink = fnData.link;
      } else if (fnData?.error) {
        console.warn('[requestPasswordReset] Edge Function error:', fnData.error);
      }
    } catch (fnErr) {
      console.warn('[requestPasswordReset] Failed to call Edge Function:', fnErr);
    }

    // 2. If we got a link, send via Brevo
    if (resetLink) {
      try {
        const htmlContent = getPasswordResetHtml(resetLink, profileRow.full_name || 'User');
        await sendEmail({
          to: normalizedEmail,
          subject: 'Reset your ClassApp password',
          htmlContent,
        });
        return { success: true };
      } catch (sendError: any) {
        console.error('[requestPasswordReset] Brevo email send error:', sendError);
        return { error: sendError.message || 'Failed to send password reset email.' };
      }
    }

    // 3. Fallback — Brevo not configured or Edge Function unavailable.
    //    Use Supabase's built-in email (will use whatever SMTP is configured in Supabase).
    console.warn('[requestPasswordReset] Falling back to supabase.auth.resetPasswordForEmail');
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo,
    });

    if (resetError) {
      console.error('[requestPasswordReset] resetPasswordForEmail error:', resetError);
      return { error: resetError.message || 'Failed to send password reset email.' };
    }

    return { success: true };
  } catch (err: any) {
    console.error('requestPasswordReset error:', err);
    return { error: err.message || 'An unexpected error occurred.' };
  }
}

/**
 * OTP-based password reset — Step 1.
 * Generates a 6-digit code, stores it in password_reset_otps, sends via Brevo.
 * Rules:
 *   - 60-second cooldown between requests per email
 *   - Previous OTPs for this email are deleted before inserting the new one
 *   - Only the last OTP is ever valid
 */
export async function requestPasswordResetOtp(email: string) {
  try {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) return { error: 'Email is required.' };

    const supabase = await getSupabaseServerClient();

    // ── 1. Cooldown check ──────────────────────────────────────────────────
    const { data: recentOtp } = await supabase
      .from('password_reset_otps')
      .select('created_at')
      .eq('email', normalizedEmail)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recentOtp) {
      const secondsAgo = (Date.now() - new Date(recentOtp.created_at).getTime()) / 1000;
      if (secondsAgo < 60) {
        const wait = Math.ceil(60 - secondsAgo);
        return { error: `Please wait ${wait} second${wait !== 1 ? 's' : ''} before requesting another code.` };
      }
    }

    // ── 2. Verify email exists in this tenant ──────────────────────────────
    const { data: profileRow } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('email', normalizedEmail)
      .maybeSingle();

    // Always return generic success to prevent email enumeration
    if (!profileRow) {
      return { success: true };
    }

    // ── 3. Delete all previous OTPs for this email (keep table tiny) ───────
    await supabase
      .from('password_reset_otps')
      .delete()
      .eq('email', normalizedEmail);

    // ── 4. Generate + insert fresh OTP (crypto.randomInt = cryptographically secure) ─
    const otpCode = String(randomInt(100000, 1000000)); // always 6 digits: 100000–999999
    const { error: insertError } = await supabase
      .from('password_reset_otps')
      .insert({
        email: normalizedEmail,
        otp_code: otpCode,
        user_id: profileRow.id,
      });

    if (insertError) {
      console.error('[requestPasswordResetOtp] Insert error:', insertError);
      return { error: 'Failed to generate reset code. Please try again.' };
    }

    // ── 5. Send via Brevo ──────────────────────────────────────────────────
    const htmlContent = getOtpResetHtml(otpCode, profileRow.full_name || 'User');
    await sendEmail({
      to: normalizedEmail,
      subject: 'Your ClassApp password reset code',
      htmlContent,
    });

    return { success: true };
  } catch (err: any) {
    console.error('[requestPasswordResetOtp] error:', err);
    return { error: err.message || 'An unexpected error occurred.' };
  }
}

/**
 * OTP-based password reset — Step 2.
 * Verifies the OTP, calls the Edge Function to update the password, marks OTP used.
 */
export async function verifyAndResetPassword(email: string, otpCode: string, newPassword: string) {
  try {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !otpCode || !newPassword) {
      return { error: 'All fields are required.' };
    }
    if (newPassword.length < 8) {
      return { error: 'Password must be at least 8 characters long.' };
    }

    const supabase = await getSupabaseServerClient();

    // ── 1. Atomically increment attempts + fetch OTP row ──────────────────
    // We use a plain select then update to keep RLS compatible
    const { data: otpRow } = await supabase
      .from('password_reset_otps')
      .select('id, otp_code, expires_at, used_at, attempts, user_id')
      .eq('email', normalizedEmail)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!otpRow) {
      return { error: 'No reset code found for this email. Please request a new one.' };
    }
    if (otpRow.used_at) {
      return { error: 'This code has already been used. Please request a new one.' };
    }
    if (new Date(otpRow.expires_at) < new Date()) {
      return { error: 'This code has expired. Please request a new one.' };
    }
    if (otpRow.attempts >= 3) {
      return { error: 'Too many incorrect attempts. Please request a new code.' };
    }

    // ── 2. Increment attempt counter first (before checking code) ─────────
    await supabase
      .from('password_reset_otps')
      .update({ attempts: otpRow.attempts + 1 })
      .eq('id', otpRow.id);

    // ── 3. Check code ──────────────────────────────────────────────────────
    if (otpRow.otp_code !== otpCode.trim()) {
      const remaining = 3 - (otpRow.attempts + 1);
      if (remaining <= 0) {
        return { error: 'Too many incorrect attempts. Please request a new code.' };
      }
      return { error: `Invalid code. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.` };
    }

    // ── 4. Call Edge Function to update password (uses tenant service key) ─
    const cookieStore = await cookies();
    const tenantUrl = cookieStore.get('tenant_supabase_url')?.value || process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const tenantAnonKey = cookieStore.get('tenant_supabase_anon_key')?.value || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const fnRes = await fetch(`${tenantUrl}/functions/v1/manage-student`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': tenantAnonKey,
      },
      body: JSON.stringify({
        action: 'reset-password',
        userId: otpRow.user_id,
        newPassword,
      }),
    });

    const fnData = await fnRes.json();
    if (!fnData?.success) {
      console.error('[verifyAndResetPassword] Edge Function error:', fnData);
      return { error: fnData?.error || 'Failed to update password. Please try again.' };
    }

    // ── 5. Mark OTP as used ────────────────────────────────────────────────
    await supabase
      .from('password_reset_otps')
      .update({ used_at: new Date().toISOString() })
      .eq('id', otpRow.id);

    return { success: true };
  } catch (err: any) {
    console.error('[verifyAndResetPassword] error:', err);
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
    revalidateTag('semester_config', { expire: 0 });
    revalidateTag('holiday_days', { expire: 0 }); // start_date change affects week layout

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

/**
 * Update the dynamic Telegram channel config (bot token, channel id, active toggle). CR/Admin only.
 */
export async function updateTelegramConfig(formData: FormData) {
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
      return { error: 'Unauthorized: Only CRs and Admins can update Telegram configuration.' };
    }

    const botTokenRaw = formData.get('bot_token') as string;
    const channelIdRaw = formData.get('channel_id') as string;
    const isEnabledRaw = formData.get('is_enabled') === 'true';

    const bot_token = botTokenRaw?.trim() || null;
    const channel_id = channelIdRaw?.trim() || null;

    // Check if the table exists or if there are any other errors
    const { error } = await supabase
      .from('telegram_config')
      .upsert({
        id: 1,
        bot_token,
        channel_id,
        is_enabled: isEnabledRaw,
        updated_at: new Date().toISOString(),
        updated_by: user.id
      });

    if (error) {
      return { error: error.message };
    }

    revalidatePath('/cr/profile');
    revalidatePath('/student/profile');

    return { success: true };
  } catch (err: any) {
    if (
      err instanceof Error &&
      (err.message === 'NEXT_REDIRECT' || (err as any).digest?.startsWith('NEXT_REDIRECT'))
    ) {
      throw err;
    }
    console.error('updateTelegramConfig error:', err);
    return { error: err.message || 'An unexpected error occurred.' };
  }
}



