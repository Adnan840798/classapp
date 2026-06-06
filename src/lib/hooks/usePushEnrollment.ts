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

  // Auto-enroll if user is logged in, push is supported, and permission is still in 'default' state
  useEffect(() => {
    if (!profile?.id || !isSupported) return;

    if (Notification.permission === 'default') {
      console.log('[usePushEnrollment] Notification permission is default; auto-enrolling...');
      enroll();
    }
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
