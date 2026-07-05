'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Trash2, X, Loader2, AlertTriangle } from 'lucide-react';

interface BulkDeleteBarProps {
  count: number;
  onCancel: () => void;
  onDelete: () => Promise<void>;
  label?: string;
}

export function BulkDeleteBar({ count, onCancel, onDelete, label = 'items' }: BulkDeleteBarProps) {
  const [isPending, setIsPending] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Close confirm if count drops to 0 externally
  useEffect(() => {
    if (count === 0) setShowConfirm(false);
  }, [count]);

  async function handleConfirmDelete() {
    if (isPending) return;
    setIsPending(true);
    try {
      await onDelete();
    } finally {
      setIsPending(false);
      setShowConfirm(false);
    }
  }

  if (!mounted || count === 0) return null;

  const singularLabel = label.replace(/s$/, '');
  const itemLabel = count === 1 ? `1 ${singularLabel}` : `${count} ${label}`;

  return createPortal(
    <>
      {/* ── Main Action Bar ───────────────────────── */}
      <div
        className="fixed left-1/2 -translate-x-1/2 z-[10000] animate-slide-up w-[calc(100%-1.5rem)] xs:w-[calc(100%-2rem)] max-w-[480px]"
        style={{ bottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <div
          className="bulk-delete-bar flex items-center justify-between gap-2 px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-2xl"
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
              {itemLabel}
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <button
              onClick={onCancel}
              disabled={isPending}
              className="flex items-center justify-center w-9 h-9 sm:w-auto sm:h-auto px-2.5 py-1.5 rounded-xl text-[10px] sm:text-xs font-bold text-slate-400 hover:text-white border border-white/[0.06] hover:bg-white/[0.06] transition-all cursor-pointer disabled:opacity-40"
            >
              <X className="w-3 h-3 sm:w-3.5 sm:h-3.5" /><span className="hidden xs:inline ml-1">Cancel</span>
            </button>
            <button
              onClick={() => setShowConfirm(true)}
              disabled={isPending}
              className="flex items-center justify-center w-9 h-9 sm:w-auto sm:h-auto sm:gap-1.5 px-3 py-1.5 rounded-xl text-[10px] sm:text-xs font-bold text-white transition-all cursor-pointer disabled:opacity-60 active:scale-[0.97]"
              style={{
                background: 'linear-gradient(135deg, #f43f5e, #e11d48)',
                boxShadow: '0 4px 12px rgba(244,63,94,0.25)',
                border: '1px solid rgba(244,63,94,0.15)',
              }}
            >
              <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" /><span className="hidden xs:inline ml-1">Delete</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Confirmation Modal ─────────────────────── */}
      {showConfirm && (
        <div
          className="fixed inset-0 z-[10001] flex items-end sm:items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowConfirm(false); }}
        >
          <div
            className="bulk-delete-confirm-modal w-full max-w-sm rounded-2xl p-5 animate-slide-up"
            style={{
              background: 'linear-gradient(135deg, rgba(18,18,22,0.98) 0%, rgba(26,28,36,0.98) 100%)',
              border: '1px solid rgba(244, 63, 94, 0.35)',
              boxShadow: '0 24px 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(244,63,94,0.08), 0 0 40px rgba(244,63,94,0.08)',
            }}
          >
            {/* Icon */}
            <div className="flex items-center justify-center mb-4">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, rgba(244,63,94,0.15), rgba(225,29,72,0.1))',
                  border: '1px solid rgba(244,63,94,0.3)',
                  boxShadow: '0 0 20px rgba(244,63,94,0.15)',
                }}
              >
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              </div>
            </div>

            {/* Title */}
            <h3 className="text-sm font-black text-white text-center mb-1.5">
              Delete {itemLabel}?
            </h3>
            <p className="text-xs text-slate-400 text-center leading-relaxed mb-5">
              This action is permanent and cannot be undone. {count === 1 ? 'This' : 'These'} {itemLabel}{' '}
              will be permanently removed.
            </p>

            {/* Buttons */}
            <div className="flex gap-2.5">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={isPending}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white border border-white/[0.08] hover:bg-white/[0.05] transition-all cursor-pointer disabled:opacity-40"
              >
                Keep
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isPending}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold text-white transition-all cursor-pointer disabled:opacity-60 active:scale-[0.98]"
                style={{
                  background: isPending ? 'rgba(244,63,94,0.4)' : 'linear-gradient(135deg, #f43f5e, #e11d48)',
                  boxShadow: '0 4px 16px rgba(244,63,94,0.3)',
                  border: '1px solid rgba(244,63,94,0.2)',
                }}
              >
                {isPending ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Deleting…</>
                ) : (
                  <><Trash2 className="w-3.5 h-3.5" /> Yes, Delete</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>,
    document.body
  );
}
