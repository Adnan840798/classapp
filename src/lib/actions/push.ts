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

    const { data, error } = await supabase
      .from('web_push_subscriptions')
      .upsert({
        user_id: user.id,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      }, { onConflict: 'endpoint' })
      .select()
      .single();

    if (error) {
      console.error('[saveSubscriptionAction] DB Error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error: any) {
    console.error('[saveSubscriptionAction] Error:', error);
    return { success: false, error: error.message || 'Internal server error' };
  }
}

/**
 * Deletes a push subscription for the logged in user
 */
export async function deleteSubscriptionAction(endpoint: string) {
  try {
    const supabase = await getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { error } = await supabase
      .from('web_push_subscriptions')
      .delete()
      .match({ user_id: user.id, endpoint });

    if (error) {
      console.error('[deleteSubscriptionAction] DB Error:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('[deleteSubscriptionAction] Error:', error);
    return { success: false, error: error.message || 'Internal server error' };
  }
}

/**
 * Sends a push notification to all registered subscriptions
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

    // Use the Supabase Service Role client to bypass RLS policies and retrieve subscriptions for all users
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // Fetch all active subscriptions
    const { data: subscriptions, error } = await supabase
      .from('web_push_subscriptions')
      .select('id, endpoint, p256dh, auth');

    if (error) {
      console.error('[sendWebPush] Error fetching subscriptions:', error);
      return { success: false, error: error.message };
    }

    if (!subscriptions || subscriptions.length === 0) {
      return { success: true, sentCount: 0 };
    }

    const payloadString = JSON.stringify(payload);

    // Send to all subscriptions in parallel, clean up expired ones
    const sendPromises = subscriptions.map(async (sub) => {
      try {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        };

        await webpush.sendNotification(pushSubscription, payloadString);
        return { success: true, id: sub.id };
      } catch (err: any) {
        // Delete subscription from DB if push service reports expired or gone (410, 404)
        if (err.statusCode === 410 || err.statusCode === 404) {
          console.log(`[sendWebPush] Subscription expired (status: ${err.statusCode}), deleting subscription id: ${sub.id}`);
          await supabase
            .from('web_push_subscriptions')
            .delete()
            .eq('id', sub.id);
        } else {
          console.error(`[sendWebPush] Error sending push to subscriber ID ${sub.id}:`, err);
        }
        return { success: false, id: sub.id, error: err.message };
      }
    });

    const results = await Promise.allSettled(sendPromises);
    const successCount = results.filter(
      (r) => r.status === 'fulfilled' && r.value.success
    ).length;

    console.log(`[sendWebPush] Finished broadcasting web push to ${successCount}/${subscriptions.length} active devices.`);
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
    // Use the Supabase Service Role client to bypass RLS policies and retrieve subscriptions for all users
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

    const { data: subscriptions, error } = await supabase
      .from('web_push_subscriptions')
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
    for (const sub of subscriptions) {
      try {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        };
        const res = await webpush.sendNotification(pushSubscription, payload);
        results.push({ id: sub.id, success: true, statusCode: res.statusCode });
      } catch (err: any) {
        results.push({
          id: sub.id,
          success: false,
          statusCode: err.statusCode,
          message: err.message,
          body: err.body
        });
      }
    }

    return { success: true, keys: keysStatus, subscriptionsCount: subscriptions.length, results };
  } catch (err: any) {
    return { success: false, error: err.message || 'Unexpected server error', keys: null };
  }
}
