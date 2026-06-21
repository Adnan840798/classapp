'use client';

import { useState, useTransition } from 'react';
import { CalendarDays, Upload, X, Trash2, Download, AlertCircle, RefreshCw } from 'lucide-react';
import { FileUpload } from '@/components/ui/FileUpload';
import { uploadRoutine, deleteRoutine } from '@/lib/actions/routine';
import { useRouter } from 'next/navigation';
import { resolveSupabaseUrlSync } from '@/lib/utils/resolveUrl';

interface RoutineButtonProps {
  initialImageUrl: string | null;
  isCR: boolean;
}

export function RoutineButton({ initialImageUrl, isCR }: RoutineButtonProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(initialImageUrl);
  const resolvedImageUrl = resolveSupabaseUrlSync(imageUrl);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // Handle uploading a new routine image
  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const routineFile = formData.get('routine') as File | null;
    if (!routineFile || routineFile.size === 0) {
      setError('Please select an image file first.');
      return;
    }

    startTransition(async () => {
      const res = await uploadRoutine(formData);
      if (res?.error) {
        setError(res.error);
      } else {
        // Fetch the freshly stored URL from the server
        const freshRes = await fetch('/api/routine-url').then(r => r.json()).catch(() => null);
        const freshUrl = freshRes?.image_url ?? null;
        setImageUrl(freshUrl);
        setIsUploadOpen(false);
        setIsModalOpen(true); // Show the routine immediately
        router.refresh();    // Sync server components in the background
      }
    });
  }

  // Handle deleting the routine
  function handleDelete() {
    if (!confirm('Are you sure you want to delete the class routine?')) return;
    setError(null);

    startTransition(async () => {
      const res = await deleteRoutine();
      if (res?.error) {
        setError(res.error);
      } else {
        setImageUrl(null);
        setIsModalOpen(false);
        router.refresh();
      }
    });
  }

  // Handle download of the routine image
  async function handleDownload() {
    if (!resolvedImageUrl) return;

    // Check if running inside Capacitor native webview container
    if (typeof window !== 'undefined' && (window as any).Capacitor) {
      window.open(resolvedImageUrl, '_system');
      return;
    }

    try {
      const response = await fetch(resolvedImageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `class_routine_${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      // Fallback open in new tab
      window.open(resolvedImageUrl, '_blank');
    }
  }

  // Render buttons based on state
  if (!resolvedImageUrl) {
    if (isCR) {
      return (
        <>
          <button
            onClick={() => {
              setError(null);
              setIsUploadOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 border border-[#23262D] text-slate-300 hover:text-white bg-[#1A1D24] hover:bg-[#23262D] font-semibold rounded-xl transition-all cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            Add Routine
          </button>

          {/* Upload Routine Modal */}
          {isUploadOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              {/* Backdrop */}
              <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={() => !isPending && setIsUploadOpen(false)}
              />
              
              {/* Modal Content */}
              <div className="relative bg-background border border-border w-full max-w-md rounded-2xl shadow-2xl p-6 overflow-hidden z-10 scale-in-animation">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-foreground">Upload Class Routine</h3>
                  <button
                    onClick={() => setIsUploadOpen(false)}
                    disabled={isPending}
                    className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleUpload} className="space-y-4">
                  {error && (
                    <div className="flex items-center gap-2 p-3 text-sm rounded-lg bg-destructive/10 border border-destructive/20 text-destructive">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <FileUpload
                    name="routine"
                    accept="image/jpeg,image/png,image/webp"
                    label="Class Routine Image"
                    disabled={isPending}
                  />

                  <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border">
                    <button
                      type="button"
                      onClick={() => setIsUploadOpen(false)}
                      disabled={isPending}
                      className="px-4 py-2 rounded-xl text-sm font-semibold hover:bg-accent border border-border transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isPending}
                      className="flex items-center gap-2 px-5 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold rounded-xl shadow-lg transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isPending ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        'Upload'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      );
    } else {
      return (
        <button
          disabled
          className="flex items-center gap-2 px-4 py-2 border border-[#23262D] text-slate-500 bg-[#121214] font-semibold rounded-xl cursor-not-allowed opacity-60"
        >
          <CalendarDays className="w-4 h-4" />
          Routine Unavailable
        </button>
      );
    }
  }

  return (
    <>
      <button
        onClick={() => {
          setError(null);
          setIsModalOpen(true);
        }}
        className="group flex items-center gap-2.5 pl-2 pr-4 py-1.5 border border-brand-cyan/30 hover:border-brand-cyan/50 bg-brand-cyan/10 hover:bg-brand-cyan/20 rounded-xl transition-all cursor-pointer select-none active:scale-98"
      >
        <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-brand-cyan/20 bg-[#121214] flex-shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={resolvedImageUrl || undefined}
            alt="Routine preview"
            className="w-full h-full object-cover opacity-85 group-hover:opacity-100 group-hover:scale-105 transition-all duration-200"
          />
        </div>
        <span className="text-brand-cyan group-hover:text-white font-semibold text-sm transition-colors">
          Class Routine
        </span>
      </button>

      {/* View Routine Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity"
            onClick={() => !isPending && setIsModalOpen(false)}
          />

          {/* Modal Content */}
          <div className="relative bg-background border border-border w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[85vh] scale-in-animation">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-accent/10">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-bold text-foreground">Class Routine</h3>
              </div>
              <div className="flex items-center gap-2">
                {isCR && (
                  <button
                    onClick={handleDelete}
                    disabled={isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-destructive/10 hover:bg-destructive/20 border border-destructive/20 text-destructive rounded-lg text-sm font-semibold transition-colors cursor-pointer disabled:opacity-50"
                    title="Delete routine"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                )}
                <button
                  onClick={handleDownload}
                  className="p-2 rounded-lg hover:bg-accent text-foreground transition-colors cursor-pointer"
                  title="Download Image"
                >
                  <Download className="w-5 h-5" />
                </button>
                <div className="w-[1px] h-6 bg-border mx-1" />
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 rounded-lg hover:bg-accent text-muted-foreground transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-auto p-6 bg-accent/5 flex items-center justify-center min-h-[300px]">
              {resolvedImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={resolvedImageUrl}
                  alt="Class Routine"
                  className="max-w-full max-h-[60vh] object-contain rounded-lg border border-border/40 shadow-md"
                />
              ) : (
                <p className="text-sm text-muted-foreground">Routine image loading error.</p>
              )}
            </div>

            {/* Error display */}
            {error && (
              <div className="px-6 py-3 bg-destructive/10 border-t border-destructive/20 text-destructive text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
