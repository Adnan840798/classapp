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
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[300] animate-slide-up"
      style={{ width: 'min(480px, calc(100vw - 2rem))' }}
    >
      <div
        className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl shadow-2xl"
        style={{
          background: 'linear-gradient(135deg, rgba(18,18,20,0.97) 0%, rgba(26,29,36,0.97) 100%)',
          border: '1px solid rgba(239,68,68,0.3)',
          backdropFilter: 'blur(16px)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(239,68,68,0.15)',
        }}
      >
        {/* Count badge */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <span
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white flex-shrink-0"
            style={{ background: 'rgba(239,68,68,0.25)', border: '1px solid rgba(239,68,68,0.4)' }}
          >
            {count}
          </span>
          <span className="text-xs font-semibold text-slate-300 whitespace-nowrap">
            {count === 1 ? `1 ${label.replace(/s$/, '')} selected` : `${count} ${label} selected`}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={onCancel}
            disabled={isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-400 hover:text-white border border-white/[0.08] hover:bg-white/[0.06] transition-all cursor-pointer disabled:opacity-40"
          >
            <X className="w-3.5 h-3.5" />
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold text-white transition-all cursor-pointer disabled:opacity-60 active:scale-[0.97]"
            style={{
              background: isPending
                ? 'rgba(239,68,68,0.4)'
                : 'linear-gradient(135deg, #ef4444, #dc2626)',
              boxShadow: '0 4px 16px rgba(239,68,68,0.3)',
            }}
          >
            {isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                Delete {count}
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
