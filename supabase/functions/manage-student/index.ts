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

