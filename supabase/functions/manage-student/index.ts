import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const currentProjectUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const currentAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const currentServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    const body = await req.json()
    const { action } = body

    // ─── generate-reset-link ─────────────────────────────────────────────────
    // No auth header required — triggered by unauthenticated users on the login
    // page. Protected by verifying the email exists in profiles first.
    if (action === 'generate-reset-link') {
      const { email, redirectTo } = body
      if (!email || !redirectTo) {
        return new Response(JSON.stringify({ error: 'Missing email or redirectTo' }), { status: 400, headers: corsHeaders })
      }

      const adminClient = createClient(currentProjectUrl, currentServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      })

      // Verify this email belongs to a user in this tenant before generating a link
      const { data: profile } = await adminClient
        .from('profiles')
        .select('id')
        .eq('email', email.trim().toLowerCase())
        .maybeSingle()

      if (!profile) {
        // Return generic success to prevent email enumeration
        return new Response(JSON.stringify({ success: true, link: null }), { status: 200, headers: corsHeaders })
      }

      const { data, error } = await adminClient.auth.admin.generateLink({
        type: 'recovery',
        email: email.trim().toLowerCase(),
        options: { redirectTo },
      })

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders })
      }

      return new Response(
        JSON.stringify({ success: true, link: data?.properties?.action_link ?? null }),
        { status: 200, headers: corsHeaders }
      )
    }

    // ─── request-otp ──────────────────────────────────────────────────────────
    // Generates a secure 6-digit OTP, stores it in the database, and sends it via
    // Brevo. Bypasses RLS using the service role key to securely fetch the API key.
    if (action === 'request-otp') {
      const { email } = body
      if (!email) {
        return new Response(JSON.stringify({ error: 'Missing email' }), { status: 400, headers: corsHeaders })
      }

      const adminClient = createClient(currentProjectUrl, currentServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      })

      const normalizedEmail = email.trim().toLowerCase()

      // 1. Cooldown check
      const { data: recentOtp } = await adminClient
        .from('password_reset_otps')
        .select('created_at')
        .eq('email', normalizedEmail)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (recentOtp) {
        const secondsAgo = (Date.now() - new Date(recentOtp.created_at).getTime()) / 1000
        if (secondsAgo < 60) {
          const wait = Math.ceil(60 - secondsAgo)
          return new Response(
            JSON.stringify({ error: `Please wait ${wait} second${wait !== 1 ? 's' : ''} before requesting another code.` }),
            { status: 429, headers: corsHeaders }
          )
        }
      }

      // 2. Verify email exists in profiles
      const { data: profile } = await adminClient
        .from('profiles')
        .select('id, full_name')
        .eq('email', normalizedEmail)
        .maybeSingle()

      if (!profile) {
        // Return generic success to prevent email enumeration
        return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders })
      }

      // 3. Clear previous OTPs
      await adminClient
        .from('password_reset_otps')
        .delete()
        .eq('email', normalizedEmail)

      // 4. Generate CSPRNG 6-digit code
      const array = new Uint32Array(1)
      crypto.getRandomValues(array)
      const otpCode = String(100000 + (array[0] % 900000))

      // 5. Store new OTP
      const { error: insertError } = await adminClient
        .from('password_reset_otps')
        .insert({
          email: normalizedEmail,
          otp_code: otpCode,
          user_id: profile.id,
        })

      if (insertError) {
        console.error('[Edge request-otp] Insert error:', insertError)
        return new Response(JSON.stringify({ error: 'Failed to generate reset code.' }), { status: 500, headers: corsHeaders })
      }

      // 6. Fetch Brevo Configuration (RLS bypassed)
      const { data: dbConfig } = await adminClient
        .from('brevo_config')
        .select('api_key, sender_email, sender_name, is_enabled')
        .eq('id', 1)
        .maybeSingle()

      let apiKey = Deno.env.get('BREVO_API_KEY')
      let senderEmail = Deno.env.get('BREVO_SENDER_EMAIL') || 'noreply@classapp.com'
      let senderName = Deno.env.get('BREVO_SENDER_NAME') || 'ClassApp Support'

      if (dbConfig && dbConfig.is_enabled && dbConfig.api_key) {
        apiKey = dbConfig.api_key
        senderEmail = dbConfig.sender_email || senderEmail
        senderName = dbConfig.sender_name || senderName
      }

      if (!apiKey) {
        console.error('[Edge request-otp] API key is missing from environment and database.')
        return new Response(JSON.stringify({ error: 'Email sending is not configured.' }), { status: 500, headers: corsHeaders })
      }

      // 7. Send SMTP Email via Brevo API
      const mailRes = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: senderName, email: senderEmail },
          to: [{ email: normalizedEmail }],
          subject: 'Your ClassApp password reset code',
          htmlContent: getOtpResetHtml(otpCode, profile.full_name || 'User'),
        }),
      })

      if (!mailRes.ok) {
        const errText = await mailRes.text()
        console.error('[Edge request-otp] Brevo Send Error:', errText)
        return new Response(JSON.stringify({ error: 'Failed to dispatch email. Please try again.' }), { status: 500, headers: corsHeaders })
      }

      return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders })
    }


    // ─── reset-password ──────────────────────────────────────────────────────
    // Updates a user's password via the admin API.
    // No auth header required — the caller (verifyAndResetPassword server action)
    // has already verified the OTP before calling this endpoint.
    if (action === 'reset-password') {
      const { userId, newPassword } = body
      if (!userId || !newPassword) {
        return new Response(JSON.stringify({ error: 'Missing userId or newPassword' }), { status: 400, headers: corsHeaders })
      }
      if (newPassword.length < 8) {
        return new Response(JSON.stringify({ error: 'Password must be at least 8 characters.' }), { status: 400, headers: corsHeaders })
      }

      const adminClient = createClient(currentProjectUrl, currentServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      })

      const { error } = await adminClient.auth.admin.updateUserById(userId, { password: newPassword })
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders })
      }

      return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders })
    }

    // ─── Authenticated actions below ─────────────────────────────────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing user auth token' }), { status: 401, headers: corsHeaders })
    }

    // 1. Verify caller identity using their own JWT token
    const userClient = createClient(currentProjectUrl, currentAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })
    
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid user session' }), { status: 401, headers: corsHeaders })
    }

    // 2. Validate that the caller is a verified CR or Admin in the database
    const { data: profile, error: profileError } = await userClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || (profile.role !== 'cr' && profile.role !== 'admin')) {
      return new Response(JSON.stringify({ error: 'Forbidden: CR privileges required' }), { status: 403, headers: corsHeaders })
    }

    // 3. User is authorized. Initialize administrative client safely inside the cluster
    const adminClient = createClient(currentProjectUrl, currentServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const { email, password, studentId, fullName, universityId, batch, department, targetUserId, newRole } = body

    // Handle Account Creation
    if (action === 'create-student') {
      if (!email || !password || !fullName || !universityId) {
        return new Response(JSON.stringify({ error: 'Missing required parameters' }), { status: 400, headers: corsHeaders })
      }

      // Check if student ID already registered
      const { data: existing } = await adminClient
        .from('profiles')
        .select('id')
        .eq('university_id', universityId.trim())
        .maybeSingle()

      if (existing) {
        return new Response(JSON.stringify({ error: 'Student ID is already registered.' }), { status: 400, headers: corsHeaders })
      }

      // Create auth user. Role is strictly set to student to prevent privilege escalation.
      const { data: newAuthUser, error: createError } = await adminClient.auth.admin.createUser({
        email: email.trim().toLowerCase(),
        password: password,
        email_confirm: true,
        user_metadata: {
          role: 'student',
          full_name: fullName.trim(),
          university_id: universityId.trim(),
          batch: batch?.trim() || 'N/A',
          department: department?.trim() || 'N/A',
          must_reset_password: true // Trigger auto-reset
        }
      })

      if (createError) throw createError
      return new Response(JSON.stringify({ success: true, userId: newAuthUser.user.id }), { status: 200, headers: corsHeaders })
    }

    // Handle Account Deletion
    if (action === 'delete-student') {
      if (!studentId) return new Response(JSON.stringify({ error: 'Missing student ID' }), { status: 400, headers: corsHeaders })
      if (studentId === user.id) return new Response(JSON.stringify({ error: 'You cannot delete your own account.' }), { status: 400, headers: corsHeaders })

      const { error: deleteError } = await adminClient.auth.admin.deleteUser(studentId)
      if (deleteError) throw deleteError

      return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders })
    }

    // Handle Role Update
    if (action === 'update-role') {
      if (!targetUserId || !newRole) {
        return new Response(JSON.stringify({ error: 'Missing targetUserId or newRole' }), { status: 400, headers: corsHeaders })
      }
      const validRoles = ['student', 'cr', 'admin']
      if (!validRoles.includes(newRole)) {
        return new Response(JSON.stringify({ error: 'Invalid role. Must be student, cr, or admin.' }), { status: 400, headers: corsHeaders })
      }
      if (targetUserId === user.id) {
        return new Response(JSON.stringify({ error: 'You cannot change your own role.' }), { status: 400, headers: corsHeaders })
      }

      // Update profiles table (RLS bypassed by service role key)
      const { error: dbError } = await adminClient
        .from('profiles')
        .update({ role: newRole })
        .eq('id', targetUserId)

      if (dbError) throw dbError

      // Sync auth metadata (non-critical — log warning if it fails)
      const { error: authMetaError } = await adminClient.auth.admin.updateUserById(targetUserId, {
        user_metadata: { role: newRole }
      })
      if (authMetaError) {
        console.warn('[update-role] Auth metadata sync failed (non-critical):', authMetaError.message)
      }

      return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders })
    }

    return new Response(JSON.stringify({ error: 'Unsupported action' }), { status: 400, headers: corsHeaders })

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders })
  }
})

function getOtpResetHtml(otpCode: string, userName: string = 'User') {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your Password Reset Code</title>
        <style>
          body { background-color: #0f172a; color: #f8fafc; font-family: 'Inter', -apple-system, sans-serif; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
          .wrapper { width: 100%; background-color: #0f172a; padding: 40px 20px; box-sizing: border-box; }
          .container { max-width: 480px; margin: 0 auto; background-color: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 40px; box-shadow: 0 10px 30px rgba(0,0,0,0.25); }
          .logo { text-align: center; margin-bottom: 28px; }
          .logo-text { font-size: 22px; font-weight: 800; color: #f8fafc; letter-spacing: -0.05em; }
          .logo-accent { color: #10b981; }
          h1 { font-size: 20px; font-weight: 800; color: #f8fafc; margin: 0 0 8px 0; text-align: center; letter-spacing: -0.02em; }
          .subtitle { font-size: 13px; color: #94a3b8; text-align: center; margin: 0 0 28px 0; }
          .otp-box { background: linear-gradient(135deg, rgba(16,185,129,0.12), rgba(5,150,105,0.08)); border: 2px solid rgba(16,185,129,0.35); border-radius: 16px; padding: 28px 20px; text-align: center; margin: 0 0 24px 0; }
          .otp-label { font-size: 11px; font-weight: 700; color: #10b981; text-transform: uppercase; letter-spacing: 0.12em; margin: 0 0 12px 0; }
          .otp-code { font-size: 48px; font-weight: 900; color: #f8fafc; letter-spacing: 0.22em; line-height: 1; margin: 0 0 14px 0; font-variant-numeric: tabular-nums; }
          .otp-expiry { font-size: 12px; color: #f59e0b; font-weight: 600; margin: 0; }
          p { font-size: 13px; color: #94a3b8; line-height: 1.6; margin: 0 0 16px 0; }
          .warning { background-color: rgba(239,68,68,0.07); border: 1px solid rgba(239,68,68,0.2); border-radius: 10px; padding: 12px 14px; font-size: 12px; color: #fca5a5; line-height: 1.5; margin-bottom: 24px; }
          .footer { padding-top: 20px; border-top: 1px solid #334155; font-size: 11px; color: #64748b; text-align: center; line-height: 1.5; }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="container">
            <div class="logo"><span class="logo-text">Class<span class="logo-accent">App</span></span></div>
            <h1>Password Reset Code</h1>
            <p class="subtitle">Hello ${userName}, here is your one-time reset code</p>

            <div class="otp-box">
              <p class="otp-label">Your verification code</p>
              <p class="otp-code">${otpCode}</p>
              <p class="otp-expiry">⏱ Expires in 5 minutes</p>
            </div>

            <p>Enter this code in the ClassApp reset screen along with your new password. Only the most recently requested code is valid — previous codes are automatically invalidated.</p>

            <div class="warning">
              🔒 Never share this code with anyone. ClassApp staff will never ask for it. If you did not request a password reset, ignore this email — your account remains secure.
            </div>

            <div class="footer">
              This email was sent automatically by ClassApp.<br>
              &copy; ${new Date().getFullYear()} ClassApp. All rights reserved.
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}


