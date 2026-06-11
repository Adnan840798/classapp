'use client';

import { useState } from 'react';
import { Trash2, Loader2 } from 'lucide-react';

interface DeleteButtonProps {
  id: string;
  onDelete: (id: string) => Promise<{ error?: string; success?: boolean }>;
  confirmMessage?: string;
}

export function DeleteButton({ id, onDelete, confirmMessage = 'Are you sure you want to delete this?' }: DeleteButtonProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleClick() {
    if (!window.confirm(confirmMessage)) return;

    setIsDeleting(true);
    try {
      const res = await onDelete(id);
      if (res && res.error) {
        alert(res.error);
      }
    } catch (err) {
      console.error(err);
      alert('An unexpected error occurred.');
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={isDeleting}
      className="flex items-center justify-center p-2.5 rounded-lg text-red-400 border border-red-500/20 bg-red-500/5 hover:bg-red-500/15 disabled:opacity-50 transition-all cursor-pointer"
      aria-label="Delete"
    >
      {isDeleting ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <Trash2 className="w-3.5 h-3.5" />
      )}
    </button>
  );
}
