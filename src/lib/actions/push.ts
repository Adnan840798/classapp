'use server';

import { getSupabaseServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

// Helper to sanitize variables (remove surrounding quotes or whitespace)
const sanitizeEnvVar = (val: string | undefined) => {
  if (!val) return '';
  return val.trim().replace(/^["']|["']$/g, '');
};

const vapidPublicKey = sanitizeEnvVar(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);
const vapidPrivateKey = sanitizeEnvVar(process.env.VAPID_PRIVATE_KEY);
const vapidSubject = sanitizeEnvVar(process.env.VAPID_SUBJECT) || 'https://classapp0.vercel.app';

// Initialize web-push configuration
if (vapidPublicKey && vapidPrivateKey) {
  try {
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  } catch (err) {
    console.error('[Web Push Actions] Error configuring VAPID details:', err);
  }
} else {
  console.warn('[Web Push Actions] VAPID keys not configured in environment variables.');
}

/**
 * Saves a new push subscription or updates an existing one for the logged in user
 */
export async function saveSubscriptionAction(subscription: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}) {
  try {
    const supabase = await getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Use the Supabase Service Role client to bypass RLS policies and retrieve/upsert devices for all users
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Insert or update the device in push_devices
    const { data: device, error: deviceError } = await adminClient
      .from('push_devices')
      .upsert({
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      }, { onConflict: 'endpoint' })
      .select()
      .single();

    if (deviceError) {
      console.error('[saveSubscriptionAction] Device DB Error:', deviceError);
      return { success: false, error: deviceError.message };
    }

    // 2. Link user to device in user_push_devices (if not already linked)
    const { error: linkError } = await adminClient
      .from('user_push_devices')
      .upsert({
        user_id: user.id,
        device_id: device.id,
      }, { onConflict: 'user_id,device_id' });

    if (linkError) {
      console.error('[saveSubscriptionAction] Link DB Error:', linkError);
      return { success: false, error: linkError.message };
    }

    return { success: true, data: device };
  } catch (error: any) {
    console.error('[saveSubscriptionAction] Error:', error);
    return { success: false, error: error.message || 'Internal server error' };
  }
}

/**
 * Deletes a push subscription relationship for the logged in user
 */
export async function deleteSubscriptionAction(endpoint: string) {
  try {
    const supabase = await getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Use admin client to query across relationships and delete relationship
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Find the device by endpoint
    const { data: device, error: findError } = await adminClient
      .from('push_devices')
      .select('id')
      .eq('endpoint', endpoint)
      .maybeSingle();

    if (findError) {
      console.error('[deleteSubscriptionAction] Error finding device:', findError);
      return { success: false, error: findError.message };
    }

    if (!device) {
      return { success: true }; // Device not registered or already removed
    }

    // 2. Delete the user-device relationship
    const { error: deleteLinkError } = await adminClient
      .from('user_push_devices')
      .delete()
      .match({ user_id: user.id, device_id: device.id });

    if (deleteLinkError) {
      console.error('[deleteSubscriptionAction] Error deleting link:', deleteLinkError);
      return { success: false, error: deleteLinkError.message };
    }

    // Note: The database trigger 'trigger_cleanup_orphaned_push_devices' will automatically
    // delete the row in 'push_devices' if there are no more users linked to it.

    return { success: true };
  } catch (error: any) {
    console.error('[deleteSubscriptionAction] Error:', error);
    return { success: false, error: error.message || 'Internal server error' };
  }
}

/**
 * Sends a push notification to all unique active device endpoints
 */
export async function sendWebPush(payload: {
  title: string;
  body: string;
  url: string;
}) {
  // Web push is disabled in favor of native Android APK push notifications
  return { success: true, sentCount: 0 };
}

/**
 * Retrieves the public VAPID key dynamically from the server environment at runtime
 */
export async function getVapidPublicKey() {
  return vapidPublicKey || null;
}

// ─────────────────────────────────────────────────────────────────────────────
// FCM Push Notifications (Android APK via Firebase Cloud Messaging)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Saves (upserts) the FCM device token for the currently logged-in user
 * into their profiles row. Called from the Android app after token registration.
 */
export async function saveFcmToken(token: string) {
  try {
    const supabase = await getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { error } = await supabase
      .from('profiles')
      .update({ fcm_token: token })
      .eq('id', user.id);

    if (error) {
      console.error('[saveFcmToken] DB Error:', error);
      return { success: false, error: error.message };
    }

    console.log('[saveFcmToken] FCM token saved for user:', user.id);
    return { success: true };
  } catch (error: any) {
    console.error('[saveFcmToken] Error:', error);
    return { success: false, error: error.message || 'Internal server error' };
  }
}

/**
 * Sends an FCM push notification to all users who have registered an FCM token.
 * Uses the modern Firebase Cloud Messaging HTTP v1 API.
 * Requires FCM_SERVICE_ACCOUNT JSON string in environment variables.
 */
export async function sendFCMPush(payload: {
  title: string;
  body: string;
  url?: string;
}) {
  const fcmServiceAccountStr = process.env.FCM_SERVICE_ACCOUNT;

  if (!fcmServiceAccountStr) {
    console.warn('[sendFCMPush] FCM_SERVICE_ACCOUNT environment variable not configured. Skipping FCM push.');
    return { success: false, error: 'FCM_SERVICE_ACCOUNT not configured' };
  }

  try {
    const credentials = JSON.parse(fcmServiceAccountStr);
    const clientEmail = credentials.client_email;
    const privateKey = credentials.private_key;
    const projectId = credentials.project_id;

    if (!clientEmail || !privateKey || !projectId) {
      throw new Error('Invalid service account JSON format');
    }

    // Dynamic import to prevent client-side build errors if called from client
    const { JWT } = await import('google-auth-library');

    // 1. Get OAuth2 access token
    const jwtClient = new JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/firebase.messaging'],
    });

    const tokenResponse = await jwtClient.getAccessToken();
    const accessToken = tokenResponse.token;

    if (!accessToken) {
      throw new Error('Failed to retrieve FCM access token');
    }

    // 2. Fetch all profiles that have a registered FCM token
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: profiles, error } = await adminClient
      .from('profiles')
      .select('id, fcm_token')
      .not('fcm_token', 'is', null);

    if (error) {
      console.error('[sendFCMPush] Error fetching FCM tokens:', error);
      return { success: false, error: error.message };
    }

    if (!profiles || profiles.length === 0) {
      console.log('[sendFCMPush] No FCM tokens registered. Skipping.');
      return { success: true, sentCount: 0 };
    }

    // 3. Send message to each device in parallel
    const sendPromises = profiles.map(async (profile) => {
      const token = profile.fcm_token;
      if (!token) return { success: false, id: profile.id };

      try {
        const response = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            message: {
              token: token,
              notification: {
                title: payload.title,
                body: payload.body,
              },
              data: {
                url: payload.url || '/',
                title: payload.title,
                body: payload.body,
              },
              android: {
                priority: 'high',
                notification: {
                  sound: 'default',
                },
              },
            },
          }),
        });

        if (!response.ok) {
          const text = await response.text();
          let errData;
          try {
            errData = JSON.parse(text);
          } catch (_) {}

          const errorCode = errData?.error?.details?.[0]?.errorCode || errData?.error?.status;

          // Clear expired or invalid tokens
          if (
            response.status === 404 ||
            response.status === 410 ||
            errorCode === 'UNREGISTERED' ||
            errorCode === 'INVALID_ARGUMENT'
          ) {
            console.log(`[sendFCMPush] Token unregistered or invalid for user: ${profile.id}, cleaning up.`);
            await adminClient
              .from('profiles')
              .update({ fcm_token: null })
              .eq('id', profile.id);
          } else {
            console.error(`[sendFCMPush] Error sending to user ${profile.id}:`, text);
          }
          return { success: false, id: profile.id };
        }

        return { success: true, id: profile.id };
      } catch (err: any) {
        console.error(`[sendFCMPush] Failed to send to token for user ${profile.id}:`, err);
        return { success: false, id: profile.id, error: err.message };
      }
    });

    const results = await Promise.allSettled(sendPromises);
    const successCount = results.filter(
      (r) => r.status === 'fulfilled' && (r.value as any).success
    ).length;

    console.log(`[sendFCMPush] FCM HTTP v1 broadcast complete. Sent successfully to ${successCount}/${profiles.length} devices.`);
    return { success: true, sentCount: successCount };
  } catch (error: any) {
    console.error('[sendFCMPush] Failed sending FCM push:', error);
    return { success: false, error: error.message || 'Internal server error' };
  }
}




