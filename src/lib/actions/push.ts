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

/**
 * Runs a diagnostic test from the Vercel server, attempting to send a notification
 * and returning the exact results/errors to the client.
 */
export async function diagnosticSendPushAction() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    const keysStatus = {
      hasPublicKey: !!vapidPublicKey,
      hasPrivateKey: !!vapidPrivateKey,
      publicKeyLength: vapidPublicKey ? vapidPublicKey.length : 0,
      privateKeyLength: vapidPrivateKey ? vapidPrivateKey.length : 0,
      subject: vapidSubject,
      rawPublicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ? 'Present' : 'Missing',
      rawPrivateKey: process.env.VAPID_PRIVATE_KEY ? 'Present' : 'Missing'
    };

    if (!vapidPublicKey || !vapidPrivateKey) {
      return { success: false, error: 'VAPID keys are missing from server environment.', keys: keysStatus };
    }

    const { data: devices, error } = await supabase
      .from('push_devices')
      .select('id, endpoint, p256dh, auth');

    if (error) {
      return { success: false, error: 'Database fetch error: ' + error.message, keys: keysStatus };
    }

    const payload = JSON.stringify({
      title: '🚨 Vercel Server Test',
      body: 'This is a diagnostic push sent directly from the Vercel server!',
      url: '/student/announcements'
    });

    const results = [];
    for (const dev of devices) {
      try {
        const pushSubscription = {
          endpoint: dev.endpoint,
          keys: {
            p256dh: dev.p256dh,
            auth: dev.auth
          }
        };
        const res = await webpush.sendNotification(pushSubscription, payload);
        results.push({ id: dev.id, success: true, statusCode: res.statusCode });
      } catch (err: any) {
        results.push({
          id: dev.id,
          success: false,
          statusCode: err.statusCode,
          message: err.message,
          body: err.body
        });
      }
    }

    return { success: true, keys: keysStatus, subscriptionsCount: devices.length, results };
  } catch (err: any) {
    return { success: false, error: err.message || 'Unexpected server error', keys: null };
  }
}

