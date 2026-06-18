'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to your monitoring solution if needed
    console.error('[Dashboard Error]', error.message, error.digest);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-6 text-center animate-fade-in">
      {/* Icon */}
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0"
        style={{
          background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.2)',
          boxShadow: '0 0 30px rgba(239,68,68,0.08)',
        }}
      >
        <AlertTriangle className="w-8 h-8 text-red-400" />
      </div>

      {/* Message */}
      <div className="max-w-xs">
        <h2 className="text-base font-bold text-white mb-2">Something went wrong</h2>
        <p className="text-sm text-slate-400 leading-relaxed">
          A temporary server error occurred while loading this page. This is usually resolved by trying again.
        </p>
        {error.digest && (
          <p className="mt-2 text-[10px] font-mono text-slate-600 tracking-wider">
            ref: {error.digest}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <button
          onClick={reset}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all active:scale-95 cursor-pointer"
          style={{
            background: 'linear-gradient(135deg, hsl(160 84% 45%), hsl(170 80% 38%))',
            boxShadow: '0 4px 20px rgba(52,211,153,0.25)',
          }}
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
        <Link
          href="/student/timeline"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-300 hover:text-white transition-colors"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <Home className="w-4 h-4" />
          Go to Timeline
        </Link>
      </div>
    </div>
  );
}
