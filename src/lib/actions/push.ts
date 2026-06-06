'use server';

import { getSupabaseServerClient } from '@/lib/supabase/server';
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

    const supabase = await getSupabaseServerClient();
    
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
