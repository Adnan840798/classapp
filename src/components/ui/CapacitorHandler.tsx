'use client';

import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

declare global {
  interface Window {
    Capacitor?: any;
  }
}

export default function CapacitorHandler() {
  const [isOffline, setIsOffline] = useState(false);
  const [appLoading, setAppLoading] = useState(true);

  useEffect(() => {
    // 1. Detect Capacitor and inject body class for CSS styling
    const isNative = typeof window !== 'undefined' && !!window.Capacitor;
    if (isNative) {
      document.body.classList.add('is-native');
    }

    // 2. Initial app load fade-out
    const timer = setTimeout(() => {
      setAppLoading(false);
    }, 200);

    // 3. Connection Status Listener
    const handleOnline = () => {
      setIsOffline(false);
      window.location.reload();
    };
    const handleOffline = () => setIsOffline(true);

    if (typeof window !== 'undefined') {
      setIsOffline(!navigator.onLine);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
    }

    // 4. Capacitor Hardware Back Button & Exit Confirmation Toast
    let backButtonListener: any = null;
    let authSubscription: any = null;

    const setupBackButton = async () => {
      try {
        const { App } = await import('@capacitor/app');
        const { Toast } = await import('@capacitor/toast');

        let lastBackPress = 0;

        backButtonListener = await App.addListener('backButton', async (data) => {
          const pathname = window.location.pathname;
          const isRootPath = ['/', '/login', '/student', '/cr', '/admin'].includes(pathname);

          if (isRootPath || !data.canGoBack) {
            const now = Date.now();
            if (now - lastBackPress < 2000) {
              await App.exitApp();
            } else {
              lastBackPress = now;
              await Toast.show({
                text: 'Press back again to exit',
                duration: 'short',
                position: 'bottom',
              });
            }
          } else {
            window.history.back();
          }
        });
      } catch (err) {
        console.error('Failed to setup native Capacitor back button listener', err);
      }
    };

    const navigateToUrl = (url: string | null | undefined) => {
      if (!url) return;
      
      let target = url;
      // If it contains a protocol/scheme (e.g., http://, https://, classapp://)
      if (url.includes('://')) {
        try {
          const parsed = new URL(url);
          if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
            target = parsed.pathname + parsed.search;
          } else {
            // Reconstruct path for custom schemes like classapp://student/announcements/123
            const path = parsed.pathname;
            const host = parsed.host;
            target = '/' + (host ? host + path : path.replace(/^\/+/, '')) + parsed.search;
          }
        } catch (err) {
          console.error('[CapacitorHandler] Failed to parse absolute notification URL:', err, url);
        }
      }

      // Safe check: prevent open redirects or protocol-relative paths
      target = target.replace(/^\/+/g, '/');
      if (
        !target.startsWith('/') ||
        target.startsWith('//') ||
        target.startsWith('/\\') ||
        target.includes('://') ||
        target.includes('\\\\') ||
        target.includes('//')
      ) {
        console.warn('[CapacitorHandler] Ignored unsafe or invalid redirect path:', target);
        return;
      }

      console.log('[CapacitorHandler] Navigating to normalized URL:', target);
      window.location.href = target;
    };

    const extractUrl = (data: any): string | null => {
      if (!data) return null;
      // Some Android versions wrap FCM data inside a nested object or stringify it
      if (data.url) return data.url;
      if (data.data?.url) return data.data.url;
      try {
        const parsed = typeof data === 'string' ? JSON.parse(data) : null;
        if (parsed?.url) return parsed.url;
      } catch (_) {}
      return null;
    };

    const setupPushNotifications = async () => {
      try {
        const { PushNotifications } = await import('@capacitor/push-notifications');
        const { App } = await import('@capacitor/app');
        const { saveFcmToken } = await import('@/lib/actions/push');

        await PushNotifications.removeAllListeners();

        // ── Path 1: Cold-start from lock screen ────────────────────────────────
        // When Android launches the app by tapping a notification from the lock
        // screen or notification shade, Capacitor exposes the deep-link URL via
        // App.getLaunchUrl(). We read it once on startup and navigate immediately.
        try {
          const launchUrl = await App.getLaunchUrl();
          if (launchUrl?.url) {
            console.log('[CapacitorHandler] Cold-start launch URL:', launchUrl.url);
            navigateToUrl(launchUrl.url);
          }
        } catch (err) {
          console.warn('[CapacitorHandler] getLaunchUrl unavailable:', err);
        }

        // ── Path 2: App in background / notification tray tap ─────────────────
        // Fired when the user taps a notification while the app is in the
        // background. Also covers taps from the notification shade/lock screen
        // when the app is NOT fully killed.
        await PushNotifications.addListener('pushNotificationActionPerformed', async (action) => {
          console.log('[CapacitorHandler] Push notification action performed:', action);
          const url = extractUrl(action.notification.data);
          if (url) {
            navigateToUrl(url);
          } else {
            console.warn('[CapacitorHandler] No URL found in notification action data:', action.notification.data);
          }
        });

        // ── Path 3: Foreground notification received ───────────────────────────
        // When a notification arrives while the app is open and in the foreground
        // (screen on, app visible), the OS does NOT show a system notification
        // banner — so we show a Capacitor Toast as a fallback.
        await PushNotifications.addListener('pushNotificationReceived', async (notification) => {
          console.log('[CapacitorHandler] Push notification received in foreground:', notification);
          try {
            // Dispatch custom window event to handle beautiful inside-app web notifications
            window.dispatchEvent(new CustomEvent('foreground-notification', { detail: notification }));
          } catch (err) {
            console.error('[CapacitorHandler] Failed to dispatch foreground notification:', err);
          }
        });

        await PushNotifications.addListener('registration', async (token) => {
          console.log('[CapacitorHandler] FCM token registered:', token.value);
          try {
            await saveFcmToken(token.value);
          } catch (err) {
            console.error('[CapacitorHandler] saveFcmToken error:', err);
          }
        });

        await PushNotifications.addListener('registrationError', (err) => {
          console.error('[CapacitorHandler] Push registration error:', err);
        });

        const permission = await PushNotifications.requestPermissions();
        if (permission.receive === 'granted') {
          await PushNotifications.register();
        }
      } catch (err) {
        console.error('[CapacitorHandler] Failed to initialize push notifications', err);
      }
    };

    // Watch auth state changes to trigger registration once authenticated
    const initPushAuthWatcher = async () => {
      try {
        const { getSupabaseBrowserClient } = await import('@/lib/supabase/client');
        const supabase = getSupabaseBrowserClient();

        // Check if session exists immediately
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setupPushNotifications();
        }

        // Listen to updates
        const { data } = supabase.auth.onAuthStateChange((event: any, session: any) => {
          if (session?.user) {
            setupPushNotifications();
          }
        });
        authSubscription = data.subscription;
      } catch (err) {
        console.error('[CapacitorHandler] Error in auth watcher registration:', err);
      }
    };

    // Polling mechanism to wait for window.Capacitor injection
    let checkAttempts = 0;
    const capacitorInterval = setInterval(() => {
      checkAttempts++;
      const hasCapacitor = typeof window !== 'undefined' && !!window.Capacitor;
      
      if (hasCapacitor) {
        clearInterval(capacitorInterval);
        document.body.classList.add('is-native');
        setupBackButton();
        initPushAuthWatcher();
        console.log('[CapacitorHandler] Capacitor bridge successfully detected.');
      } else if (checkAttempts >= 30) {
        clearInterval(capacitorInterval);
        console.log('[CapacitorHandler] Capacitor bridge detection timed out (not running inside APK WebView).');
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      clearInterval(capacitorInterval);
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      }
      if (backButtonListener) {
        backButtonListener.remove().catch((err: any) => {
          console.error('Error removing back button listener', err);
        });
      }
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
    };
  }, []);

  // 1. Initial App loader overlay (feels like native splash screen loading)
  if (appLoading) {
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#080e0f]">
        {/* Ambient glow */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 60% 45% at 50% 50%, rgba(52,211,153,0.08) 0%, transparent 70%)' }} />
        <div className="relative flex flex-col items-center gap-4">
          {/* App name - white and green shade */}
          <div className="text-4xl font-black tracking-tight text-white select-none">
            Class<span className="text-[#34D399] drop-shadow-[0_0_12px_rgba(52,211,153,0.35)]">App</span>
          </div>

          {/* Circular professional spinner */}
          <div className="relative w-8 h-8 mt-2">
            <div className="absolute inset-0 rounded-full border-[3px] border-emerald-500/10" />
            <div className="absolute inset-0 rounded-full border-[3px] border-[#34D399] border-t-transparent animate-spin" />
          </div>

          {/* Subtitle */}
          <div className="text-[10px] tracking-[0.25em] uppercase font-bold mt-1" style={{ color: 'rgba(52,211,153,0.5)' }}>
            Loading
          </div>
        </div>

        {/* Bottom progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 overflow-hidden" style={{ background: 'rgba(52,211,153,0.05)' }}>
          <div
            className="h-full"
            style={{
              background: 'linear-gradient(90deg, transparent, #34D399, transparent)',
              animation: 'slide-progress 1.5s ease-in-out infinite',
            }}
          />
        </div>
      </div>
    );
  }

  // 2. Offline banner alert
  if (isOffline) {
    return (
      <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4 backdrop-blur-md transition-all duration-300" style={{ background: 'rgba(8,14,15,0.92)' }}>
        <div className="w-full max-w-sm rounded-2xl border p-6 text-center shadow-2xl relative overflow-hidden" style={{ background: 'rgba(10,18,20,0.95)', borderColor: 'rgba(55,65,81,0.6)' }}>
          {/* Top accent line */}
          <div className="absolute top-0 left-0 w-full h-[2px]" style={{ background: 'linear-gradient(90deg, transparent 0%, #ef4444 50%, transparent 100%)' }} />
          
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full mb-4" style={{ background: 'rgba(127,29,29,0.3)', border: '1px solid rgba(185,28,28,0.4)', color: '#f87171', animation: 'bounce 1s infinite' }}>
            <WifiOff className="h-7 w-7" />
          </div>
          
          <h3 className="text-xl font-bold mb-2" style={{ color: '#f1f5f9' }}>No Internet Connection</h3>
          <p className="text-sm leading-relaxed mb-6" style={{ color: '#94a3b8' }}>
            You&apos;re currently offline. Check your Wi-Fi or mobile data connection and try again.
          </p>
          
          <button
            onClick={() => window.location.reload()}
            className="w-full py-3 px-4 rounded-xl text-sm font-bold transition-all duration-200 active:scale-[0.97]"
            style={{ background: 'linear-gradient(135deg, #065f46, #10b981)', color: 'white', boxShadow: '0 4px 20px rgba(16,185,129,0.25)' }}
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return null;
}
