'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, X, Loader2 } from 'lucide-react';

interface BulkDeleteBarProps {
  count: number;
  onCancel: () => void;
  onDelete: () => Promise<void>;
  label?: string;
}

export function BulkDeleteBar({ count, onCancel, onDelete, label = 'items' }: BulkDeleteBarProps) {
  const [isPending, setIsPending] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  async function handleDelete() {
    if (isPending) return;
    setIsPending(true);
    try {
      await onDelete();
    } finally {
      setIsPending(false);
    }
  }

  if (!mounted || count === 0) return null;

  return createPortal(
    <div
      className="fixed left-1/2 -translate-x-1/2 z-[10000] animate-slide-up w-[calc(100%-1.5rem)] xs:w-[calc(100%-2rem)] max-w-[480px]"
      style={{ bottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}
    >
      <div
        className="flex items-center justify-between gap-2 px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-2xl"
        style={{
          background: 'linear-gradient(135deg, rgba(20,20,25,0.96) 0%, rgba(28,30,38,0.96) 100%)',
          border: '1px solid rgba(244, 63, 94, 0.3)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.7), 0 0 0 1px rgba(244, 63, 94, 0.1)',
        }}
      >
        {/* Count badge */}
        <div className="flex items-center gap-2 flex-shrink-0 min-w-0">
          <span
            className="w-6.5 h-6.5 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-black text-white flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, rgba(244, 63, 94, 0.25) 0%, rgba(225, 29, 72, 0.25) 100%)',
              border: '1px solid rgba(244, 63, 94, 0.4)',
              boxShadow: '0 0 8px rgba(244, 63, 94, 0.15)'
            }}
          >
            {count}
          </span>
          <span className="text-[11px] sm:text-xs font-bold text-slate-300 truncate max-w-[85px] xs:max-w-none">
            {count === 1 ? `1 ${label.replace(/s$/, '')}` : `${count} ${label}`}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          <button
            onClick={onCancel}
            disabled={isPending}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] sm:text-xs font-bold text-slate-400 hover:text-white border border-white/[0.06] hover:bg-white/[0.06] transition-all cursor-pointer disabled:opacity-40"
          >
            <X className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span className="hidden xs:inline">Cancel</span>
          </button>
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-[10px] sm:text-xs font-bold text-white transition-all cursor-pointer disabled:opacity-60 active:scale-[0.97]"
            style={{
              background: isPending
                ? 'rgba(244,63,94,0.4)'
                : 'linear-gradient(135deg, #f43f5e, #e11d48)',
              boxShadow: '0 4px 12px rgba(244,63,94,0.25)',
              border: '1px solid rgba(244,63,94,0.15)',
            }}
          >
            {isPending ? (
              <>
                <Loader2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 animate-spin" />
                <span className="hidden xs:inline">Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span>Delete<span className="hidden xs:inline"> {count}</span></span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
