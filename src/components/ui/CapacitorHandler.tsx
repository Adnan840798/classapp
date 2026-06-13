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

    if (isNative) {
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

      setupBackButton();
    }

    return () => {
      clearTimeout(timer);
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      }
      if (backButtonListener) {
        backButtonListener.remove().catch((err: any) => {
          console.error('Error removing back button listener', err);
        });
      }
    };
  }, []);

  // 1. Initial App loader overlay (feels like native splash screen loading)
  if (appLoading) {
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0b0f19]">
        <div className="relative flex flex-col items-center gap-4">
          {/* Logo / App Name Display */}
          <div className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-violet-400 via-indigo-400 to-blue-400 bg-clip-text text-transparent animate-pulse">
            ClassApp
          </div>
          <div className="text-xs tracking-widest uppercase text-slate-500 font-semibold">
            Connecting...
          </div>
          <Loader2 className="h-6 h-6 animate-spin text-indigo-400 mt-2" />
        </div>
      </div>
    );
  }

  // 2. Offline banner alert
  if (isOffline) {
    return (
      <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md transition-all duration-300">
        <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-[#131926]/90 p-6 text-center shadow-2xl relative overflow-hidden">
          {/* Glassmorphic border glow effect */}
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-red-500/0 via-red-500 to-red-500/0"></div>
          
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-950/40 border border-red-800/50 text-red-400 mb-4 animate-bounce">
            <WifiOff className="h-7 w-7" />
          </div>
          
          <h3 className="text-xl font-bold text-slate-100 mb-2">Connection Lost</h3>
          <p className="text-slate-400 text-sm leading-relaxed mb-6">
            It looks like you are currently offline. Please check your internet connection to continue using ClassApp.
          </p>
          
          <button
            onClick={() => window.location.reload()}
            className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white font-medium shadow-lg hover:shadow-indigo-500/20 active:scale-[0.98] transition-all"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return null;
}
