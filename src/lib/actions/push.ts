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
const vapidSubject = sanitizeEnvVar(process.env.VAPID_SUBJECT) || 'mailto:adnan@example.com';

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
  try {
    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error('[sendWebPush] VAPID keys are missing from environment.');
      return { success: false, error: 'VAPID keys not configured.' };
    }

    // Use the Supabase Service Role client to retrieve subscriptions for all users
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // Fetch all active devices
    const { data: devices, error } = await supabase
      .from('push_devices')
      .select('id, endpoint, p256dh, auth');

    if (error) {
      console.error('[sendWebPush] Error fetching devices:', error);
      return { success: false, error: error.message };
    }

    if (!devices || devices.length === 0) {
      return { success: true, sentCount: 0 };
    }

    const payloadString = JSON.stringify(payload);

    // Send to all devices in parallel, clean up expired ones
    const sendPromises = devices.map(async (device) => {
      try {
        const pushSubscription = {
          endpoint: device.endpoint,
          keys: {
            p256dh: device.p256dh,
            auth: device.auth
          }
        };

        await webpush.sendNotification(pushSubscription, payloadString);
        return { success: true, id: device.id };
      } catch (err: any) {
        // Delete device from DB if push service reports expired or gone (410, 404)
        // This automatically cascade deletes links in user_push_devices
        if (err.statusCode === 410 || err.statusCode === 404) {
          console.log(`[sendWebPush] Device subscription expired (status: ${err.statusCode}), deleting device id: ${device.id}`);
          await supabase
            .from('push_devices')
            .delete()
            .eq('id', device.id);
        } else {
          console.error(`[sendWebPush] Error sending push to device ID ${device.id}:`, err);
        }
        return { success: false, id: device.id, error: err.message };
      }
    });

    const results = await Promise.allSettled(sendPromises);
    const successCount = results.filter(
      (r) => r.status === 'fulfilled' && r.value.success
    ).length;

    console.log(`[sendWebPush] Finished broadcasting web push to ${successCount}/${devices.length} unique active devices.`);
    return { success: true, sentCount: successCount };
  } catch (error: any) {
    console.error('[sendWebPush] Failed sending web push notifications:', error);
    return { success: false, error: error.message || 'Internal server error' };
  }
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
 * Uses the Firebase Cloud Messaging Legacy HTTP API.
 * Requires FCM_SERVER_KEY in environment variables.
 */
export async function sendFCMPush(payload: {
  title: string;
  body: string;
  url?: string;
}) {
  const fcmServerKey = process.env.FCM_SERVER_KEY;

  if (!fcmServerKey) {
    console.warn('[sendFCMPush] FCM_SERVER_KEY not configured. Skipping FCM push.');
    return { success: false, error: 'FCM_SERVER_KEY not configured' };
  }

  try {
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch all profiles that have a registered FCM token
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

    const tokens = profiles
      .map((p) => p.fcm_token as string)
      .filter(Boolean);

    if (tokens.length === 0) {
      return { success: true, sentCount: 0 };
    }

    // Send to all registered tokens via FCM Legacy HTTP API
    const fcmPayload = {
      registration_ids: tokens,
      notification: {
        title: payload.title,
        body: payload.body,
        icon: '/icons/icon-192.png',
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
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
          channel_id: 'classapp_default',
        },
      },
    };

    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `key=${fcmServerKey}`,
      },
      body: JSON.stringify(fcmPayload),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('[sendFCMPush] FCM API error:', response.status, text);
      return { success: false, error: `FCM API error: ${response.status}` };
    }

    const result = await response.json();
    console.log(`[sendFCMPush] FCM broadcast complete. Success: ${result.success}, Failure: ${result.failure}`);

    // Clean up invalid/expired tokens
    if (result.results && Array.isArray(result.results)) {
      const invalidTokenIds: string[] = [];
      result.results.forEach((r: any, i: number) => {
        if (r.error === 'NotRegistered' || r.error === 'InvalidRegistration') {
          invalidTokenIds.push(profiles[i].id);
        }
      });

      if (invalidTokenIds.length > 0) {
        console.log(`[sendFCMPush] Clearing ${invalidTokenIds.length} invalid FCM tokens.`);
        await adminClient
          .from('profiles')
          .update({ fcm_token: null })
          .in('id', invalidTokenIds);
      }
    }

    return { success: true, sentCount: result.success };
  } catch (error: any) {
    console.error('[sendFCMPush] Failed sending FCM push:', error);
    return { success: false, error: error.message || 'Internal server error' };
  }
}



