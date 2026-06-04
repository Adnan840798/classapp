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
      className="flex items-center justify-center p-2 rounded-lg text-red-500 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50 transition-colors"
      aria-label="Delete"
    >
      {isDeleting ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Trash2 className="w-4 h-4" />
      )}
    </button>
  );
}
