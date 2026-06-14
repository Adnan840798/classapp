'use client';

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
  // Web push is disabled for Chrome/website in favor of native FCM notifications
  return false;
}

/**
 * Requests notification permissions and registers the push subscription.
 * Saves the subscription to the database.
 */
export async function registerPushSubscription(): Promise<{ success: boolean; error?: string }> {
  return { success: false, error: 'Web push is disabled in favor of native FCM push notifications.' };
}

/**
 * Unsubscribes from browser push notifications and deletes the subscription from the DB
 */
export async function unregisterPushSubscription(): Promise<{ success: boolean; error?: string }> {
  return { success: true };
}

