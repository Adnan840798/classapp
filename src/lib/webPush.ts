import { saveSubscriptionAction, deleteSubscriptionAction, getVapidPublicKey } from '@/lib/actions/push';

/**
 * Converts a base64 VAPID public key to a Uint8Array required by pushManager.subscribe
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Helper to check if Service Workers and Push API are supported in the browser
 */
export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  );
}

/**
 * Requests notification permissions and registers the push subscription.
 * Saves the subscription to the database.
 */
export async function registerPushSubscription(): Promise<{ success: boolean; error?: string }> {
  try {
    if (!isPushSupported()) {
      return { success: false, error: 'Push notifications are not supported in this browser.' };
    }

    // Register service worker sw.js from public folder
    const registration = await navigator.serviceWorker.register('/sw.js');
    console.log('[Push Client] Service Worker registered:', registration);

    // Check notification permission state
    const permission = Notification.permission;
    if (permission === 'denied') {
      return { success: false, error: 'Notification permission is denied. Please enable it in your browser settings.' };
    }

    if (permission !== 'granted') {
      const requestedPermission = await Notification.requestPermission();
      if (requestedPermission !== 'granted') {
        return { success: false, error: 'Notification permission was not granted.' };
      }
    }

    const publicVapidKey = await getVapidPublicKey();
    if (!publicVapidKey) {
      console.error('[Push Client] VAPID public key is missing from server environment.');
      return { success: false, error: 'VAPID public key not configured on server.' };
    }

    // Subscribe client-side to push service (APNs, FCM, etc. handled by browser engine)
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicVapidKey) as any
    });

    // Serialize subscription to fetch keys
    const rawSubscription = JSON.parse(JSON.stringify(subscription));
    if (!rawSubscription.keys?.p256dh || !rawSubscription.keys?.auth) {
      return { success: false, error: 'Could not extract push encryption keys from browser.' };
    }

    // Call Next.js Server Action to upsert subscription in Supabase DB
    const result = await saveSubscriptionAction({
      endpoint: subscription.endpoint,
      keys: {
        p256dh: rawSubscription.keys.p256dh,
        auth: rawSubscription.keys.auth
      }
    });

    if (!result.success) {
      return { success: false, error: result.error };
    }

    console.log('[Push Client] Web push subscription registered and saved to database.');
    return { success: true };
  } catch (err: any) {
    console.error('[Push Client] Error enrolling for push notifications:', err);
    return { success: false, error: err.message || 'An error occurred during push registration.' };
  }
}

/**
 * Unsubscribes from browser push notifications and deletes the subscription from the DB
 */
export async function unregisterPushSubscription(): Promise<{ success: boolean; error?: string }> {
  try {
    if (!isPushSupported()) {
      return { success: false, error: 'Push not supported.' };
    }

    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      return { success: true }; // No active registration
    }

    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      return { success: true }; // Already unsubscribed from push service
    }

    const endpoint = subscription.endpoint;

    // Unsubscribe from push service client-side
    await subscription.unsubscribe();

    // Call Next.js Server Action to delete from database
    const result = await deleteSubscriptionAction(endpoint);
    if (!result.success) {
      return { success: false, error: result.error };
    }

    console.log('[Push Client] Web push subscription unsubscribed.');
    return { success: true };
  } catch (err: any) {
    console.error('[Push Client] Error during push unsubscription:', err);
    return { success: false, error: err.message || 'An error occurred during push unsubscription.' };
  }
}
