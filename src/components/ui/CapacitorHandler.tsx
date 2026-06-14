'use client';

import { useEffect, useState } from 'react';
import { WifiOff, Loader2 } from 'lucide-react';

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
    }, 600);

    // 3. Connection Status Listener
    const handleOnline = () => setIsOffline(false);
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

    const setupPushNotifications = async () => {
      try {
        const { PushNotifications } = await import('@capacitor/push-notifications');
        const { saveFcmToken } = await import('@/lib/actions/push');

        await PushNotifications.removeAllListeners();

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

        await PushNotifications.addListener('pushNotificationReceived', async (notification) => {
          console.log('[CapacitorHandler] Push notification received in foreground:', notification);
          try {
            const { Toast } = await import('@capacitor/toast');
            await Toast.show({
              text: `📢 ${notification.title}\n${notification.body || ''}`,
              duration: 'long',
            });
          } catch (err) {
            console.error('Failed to show toast in foreground:', err);
          }
        });

        await PushNotifications.addListener('pushNotificationActionPerformed', async (action) => {
          console.log('[CapacitorHandler] Push notification action performed:', action);
          const data = action.notification.data;
          const url = data?.url;
          if (url) {
            console.log('[CapacitorHandler] Redirecting to URL from push notification:', url);
            window.location.href = url;
          }
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
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 60% 45% at 50% 50%, rgba(16,185,129,0.08) 0%, transparent 70%)' }} />
        <div className="relative flex flex-col items-center gap-5">
          {/* Logo icon */}
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-2xl" style={{ background: 'linear-gradient(135deg, #065f46 0%, #10b981 100%)', boxShadow: '0 0 40px rgba(16,185,129,0.35)' }}>
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Graduation cap top */}
              <polygon points="24,10 6,20 24,30 42,20" fill="white" fillOpacity="0.95" />
              {/* Cap body / cylinder */}
              <path d="M14 24.5V33C14 33 18 37 24 37C30 37 34 33 34 33V24.5L24 29.5L14 24.5Z" fill="white" fillOpacity="0.85" />
              {/* Tassel string */}
              <line x1="42" y1="20" x2="42" y2="28" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
              <circle cx="42" cy="30" r="2" fill="white" fillOpacity="0.9" />
            </svg>
          </div>
          {/* App Name */}
          <div className="text-3xl font-extrabold tracking-tight" style={{ background: 'linear-gradient(135deg, #34d399, #6ee7b7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            ClassApp
          </div>
          <div className="text-xs tracking-widest uppercase font-semibold" style={{ color: 'rgba(52,211,153,0.5)' }}>
            Loading...
          </div>
          <Loader2 className="h-5 w-5 animate-spin mt-1" style={{ color: '#10b981' }} />
        </div>

        {/* Bottom progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 overflow-hidden" style={{ background: 'rgba(16,185,129,0.1)' }}>
          <div
            className="h-full"
            style={{
              background: 'linear-gradient(90deg, transparent, #10b981, transparent)',
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
