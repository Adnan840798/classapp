'use client';

import { useEffect, useState } from 'react';
import { useProfile } from '@/context/ProfileContext';
import { isPushSupported, registerPushSubscription, unregisterPushSubscription } from '@/lib/webPush';

export function usePushEnrollment() {
  const { profile } = useProfile();
  const [isSupported, setIsSupported] = useState(false);
  const [permissionState, setPermissionState] = useState<NotificationPermission>('default');
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [enrollError, setEnrollError] = useState<string | null>(null);

  // Initialize and check compatibility
  useEffect(() => {
    const supported = isPushSupported();
    setIsSupported(supported);
    if (supported) {
      setPermissionState(Notification.permission);
    }
  }, []);

  // Auto-enroll if user is logged in, push is supported
  useEffect(() => {
    if (!profile?.id || !isSupported) return;

    async function checkAndAutoEnroll() {
      try {
        const permission = Notification.permission;
        if (permission === 'default') {
          console.log('[usePushEnrollment] Notification permission is default; auto-enrolling...');
          await enroll();
        } else if (permission === 'granted') {
          // Check if there is an active push subscription in the browser
          const registration = await navigator.serviceWorker.getRegistration();
          if (registration) {
            const subscription = await registration.pushManager.getSubscription();
            if (!subscription) {
              console.log('[usePushEnrollment] Permission is granted but no push subscription found; enrolling silently...');
              await enroll();
            }
          } else {
            console.log('[usePushEnrollment] No service worker registration found; enrolling...');
            await enroll();
          }
        }
      } catch (err) {
        console.error('[usePushEnrollment] Error during auto-enrollment check:', err);
      }
    }

    checkAndAutoEnroll();
  }, [profile?.id, isSupported]);

  /**
   * Triggers the notification permission prompt and registers subscription
   */
  async function enroll(): Promise<boolean> {
    if (!isSupported) {
      setEnrollError('Push notifications are not supported in this browser.');
      return false;
    }

    setIsEnrolling(true);
    setEnrollError(null);

    try {
      const result = await registerPushSubscription();
      setPermissionState(Notification.permission);
      if (!result.success) {
        setEnrollError(result.error || 'Failed to subscribe to notifications.');
        return false;
      }
      return true;
    } catch (err: any) {
      setEnrollError(err.message || 'An unexpected error occurred during subscription.');
      return false;
    } finally {
      setIsEnrolling(false);
    }
  }

  /**
   * Disables push notifications and removes subscription from DB
   */
  async function disenrolled(): Promise<boolean> {
    if (!isSupported) return false;

    setIsEnrolling(true);
    setEnrollError(null);

    try {
      const result = await unregisterPushSubscription();
      setPermissionState(Notification.permission);
      if (!result.success) {
        setEnrollError(result.error || 'Failed to unsubscribe.');
        return false;
      }
      return true;
    } catch (err: any) {
      setEnrollError(err.message || 'An unexpected error occurred during unsubscription.');
      return false;
    } finally {
      setIsEnrolling(false);
    }
  }

  return {
    isSupported,
    permissionState,
    isEnrolling,
    enrollError,
    enroll,
    disenrolled
  };
}
