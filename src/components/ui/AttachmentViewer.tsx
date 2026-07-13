'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';
import { resolveSupabaseUrlSync } from '@/lib/utils/resolveUrl';
import {
  X,
  Download,
  FileText,
  ZoomIn,
  ZoomOut,
  File,
  ImageIcon,
  Loader2,
  AlertCircle,
  Presentation,
} from 'lucide-react';

const PDFViewerInner = dynamic(
  () => import('./PDFViewerInner').then((mod) => mod.PDFViewerInner),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#0a0b0d] z-10">
        <Loader2 className="w-9 h-9 text-amber-400 animate-spin" />
        <p className="text-sm font-medium text-slate-400">Loading viewer...</p>
      </div>
    ),
  }
);

interface AttachmentViewerProps {
  url: string;
  fileName?: string;
  children: React.ReactNode;
}

type FileKind = 'image' | 'pdf' | 'video' | 'doc' | 'presentation';

function detectKind(url: string): FileKind {
  try {
    const clean = url.split('?')[0].toLowerCase();
    const ext = clean.split('.').pop() ?? '';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'avif'].includes(ext)) return 'image';
    if (ext === 'pdf') return 'pdf';
    if (['mp4', 'webm', 'ogg', 'mov', 'mkv', 'avi'].includes(ext)) return 'video';
    if (['pptx', 'ppt'].includes(ext)) return 'presentation';
  } catch {}
  return 'doc';
}

export function AttachmentViewer({ url, fileName, children }: AttachmentViewerProps) {
  const resolvedUrl = resolveSupabaseUrlSync(url) || url;
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [mounted, setMounted] = useState(false);

  // ── PDF: fetch from Supabase → blob URL → renders inline on every device ──
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(true); // true by default → no blank flash
  const [pdfError, setPdfError] = useState(false);

  // ── Video buffering loader ──
  const [videoLoading, setVideoLoading] = useState(true);

  const kind = detectKind(resolvedUrl);
  const name = fileName || resolvedUrl.split('/').pop()?.split('?')[0] || 'Attachment';

  // Portal mount
  useEffect(() => { setMounted(true); }, []);

  // Fetch PDF bytes from Supabase when viewer opens
  useEffect(() => {
    if (!open || kind !== 'pdf') return;

    let cancelled = false;
    setPdfLoading(true);
    setPdfError(false);
    setPdfBlobUrl(null);

    fetch(resolvedUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        if (cancelled) return;
        // Force correct MIME so browsers treat it as PDF
        const pdfBlob = blob.type === 'application/pdf'
          ? blob
          : new Blob([blob], { type: 'application/pdf' });
        setPdfBlobUrl(URL.createObjectURL(pdfBlob));
        // Keep loading true; will set false when PDFViewerInner parses successfully
      })
      .catch(() => {
        if (!cancelled) {
          setPdfError(true);
          setPdfLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [open, kind, resolvedUrl]);

  // Revoke blob URL on close to free memory
  useEffect(() => {
    if (!open && pdfBlobUrl) {
      const prev = pdfBlobUrl;
      setPdfBlobUrl(null);
      setTimeout(() => URL.revokeObjectURL(prev), 500);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard Escape
  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') setOpen(false);
  }, []);
  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKey);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [open, handleKey]);

  // Download handler
  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();

    // Capacitor native webview — force system browser to download directly using ?download parameter
    if (typeof window !== 'undefined' && (window as any).Capacitor) {
      const base = resolvedUrl.split('?')[0];
      const downloadUrl = `${base}?download=${encodeURIComponent(name)}`;
      window.open(downloadUrl, '_system');
      return;
    }

    // If the PDF blob is already in memory (viewer was open), use it — fastest & most reliable
    if (pdfBlobUrl) {
      const a = document.createElement('a');
      a.href = pdfBlobUrl;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }

    // For Supabase storage URLs: append ?download=<filename> so the server responds with
    // Content-Disposition: attachment, which forces Chrome/Android to download instead of
    // opening in a new tab. This works without CORS fetch and handles all file types.
    try {
      const base = resolvedUrl.split('?')[0];
      const downloadUrl = `${base}?download=${encodeURIComponent(name)}`;
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = name; // hint for same-origin (ignored for cross-origin but harmless)
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      // Last-resort: try opening in the same tab with ?download param (browser will download it)
      const base = resolvedUrl.split('?')[0];
      window.open(`${base}?download=${encodeURIComponent(name)}`, '_blank', 'noopener,noreferrer');
    }
  };

  const kindLabel = kind === 'image' ? 'Image' : kind === 'pdf' ? 'PDF Document' : kind === 'video' ? 'Video' : kind === 'presentation' ? 'PowerPoint' : 'File';

  const modal = open && mounted && createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={name}
      className="fixed inset-0 z-[9999] flex items-start sm:items-center justify-center p-2 sm:p-6"
      style={{ isolation: 'isolate' }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/85 backdrop-blur-md"
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className="relative z-10 flex flex-col w-full max-w-4xl h-[92dvh] rounded-2xl overflow-hidden shadow-2xl mt-[4dvh] sm:mt-0"
        style={{
          background: 'linear-gradient(145deg, #16181D 0%, #0E0F11 100%)',
          border: '1px solid rgba(255,255,255,0.07)',
          boxShadow: '0 32px 64px rgba(0,0,0,0.7), 0 0 0 1px rgba(245,158,11,0.08)',
          animation: 'av-in 0.22s cubic-bezier(0.34,1.56,0.64,1) both',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div
          className="flex items-center justify-between gap-2.5 px-4 py-3 shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          {/* Left: icon + name */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
              {kind === 'image' && <ImageIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />}
              {kind === 'pdf'   && <FileText  className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-400" />}
              {kind === 'video' && <File      className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-400" />}
              {kind === 'presentation' && <Presentation className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-400" />}
              {kind === 'doc'   && <File      className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-400" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="hidden sm:block text-[10px] font-bold uppercase tracking-widest text-slate-500 leading-none mb-0.5">
                {kindLabel}
              </p>
              <h3 className="text-xs sm:text-sm font-semibold text-slate-100 truncate pr-1" title={name}>{name}</h3>
            </div>
          </div>

          {/* Right: controls */}
          <div className="flex items-center gap-1.5 shrink-0">
            {kind === 'image' && (
              <button
                onClick={() => setZoom(v => !v)}
                title={zoom ? 'Zoom out' : 'Zoom in'}
                className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-300 bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
              >
                {zoom ? <ZoomOut className="w-4 h-4" /> : <ZoomIn className="w-4 h-4" />}
              </button>
            )}
            <button
              onClick={handleDownload}
              title="Download"
              className="flex items-center justify-center w-8 h-8 sm:w-auto sm:h-8 sm:px-3 rounded-lg text-xs font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 hover:bg-amber-400 hover:text-[#0E0F11] hover:border-transparent transition-all duration-200 cursor-pointer"
            >
              <Download className="w-4 h-4 flex-shrink-0" />
              <span className="hidden sm:inline ml-1.5">Download</span>
            </button>
            <button
              onClick={() => setOpen(false)}
              title="Close (Esc)"
              className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-300 bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Content ── */}
        <div className="flex-1 overflow-hidden bg-[#0a0b0d] min-h-0 flex flex-col">

          {/* IMAGE */}
          {kind === 'image' && (
            <div className={`relative w-full flex-1 flex p-4 overflow-auto ${zoom ? 'items-start justify-start' : 'items-center justify-center'}`}>
              {!imgLoaded && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-slate-600 animate-spin" />
                </div>
              )}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={resolvedUrl}
                alt={name}
                onLoad={() => setImgLoaded(true)}
                onClick={() => setZoom(v => !v)}
                className="rounded-lg shadow-2xl object-contain transition-all duration-300 select-none"
                style={{
                  maxWidth: zoom ? '200%' : '100%',
                  maxHeight: zoom ? 'none' : 'calc(92dvh - 80px)',
                  cursor: zoom ? 'zoom-out' : 'zoom-in',
                  opacity: imgLoaded ? 1 : 0,
                }}
              />
            </div>
          )}

          {/* PDF — fetched from Supabase as blob → same-origin blob URL → inline in all browsers */}
          {kind === 'pdf' && (
            <div className="relative flex flex-col w-full flex-1 min-h-0">

              {/* Loading */}
              {pdfLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#0a0b0d] z-10">
                  <Loader2 className="w-9 h-9 text-amber-400 animate-spin" />
                  <p className="text-sm font-medium text-slate-400">Loading PDF…</p>
                </div>
              )}

              {/* Error */}
              {pdfError && (
                <div className="flex flex-col items-center justify-center gap-5 flex-1 p-8 text-center">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                    style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)' }}>
                    <AlertCircle className="w-8 h-8 text-rose-400" />
                  </div>
                  <div>
                    <h4 className="text-slate-100 font-bold text-base mb-1">Failed to load PDF</h4>
                    <p className="text-slate-400 text-xs leading-relaxed max-w-xs">
                      The file could not be fetched. Use the Download button in the header, or open it directly.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleDownload}
                      className="inline-flex items-center gap-2 py-2.5 px-5 rounded-xl text-sm font-bold text-[#0E0F11] bg-amber-400 hover:bg-amber-300 transition-all active:scale-95 cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                    <button
                      onClick={() => {
                        if (typeof window !== 'undefined' && (window as any).Capacitor) {
                          window.open(resolvedUrl, '_system');
                        } else {
                          window.open(resolvedUrl, '_blank', 'noopener,noreferrer');
                        }
                      }}
                      className="inline-flex items-center gap-2 py-2.5 px-5 rounded-xl text-sm font-bold text-slate-300 hover:text-white transition-colors active:scale-95 cursor-pointer"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open
                    </button>
                  </div>
                </div>
              )}

              {/* Inline PDF viewer using same-origin blob URL */}
              {pdfBlobUrl && (
                <PDFViewerInner 
                  file={pdfBlobUrl} 
                  onLoadSuccess={() => setPdfLoading(false)}
                  onLoadError={() => {
                    setPdfError(true);
                    setPdfLoading(false);
                  }}
                />
              )}
            </div>
          )}

          {/* VIDEO — plays inline */}
          {kind === 'video' && (
            <div className="relative w-full flex-1 flex items-center justify-center p-2 sm:p-4">
              {/* Video buffering spinner */}
              {videoLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#0a0b0d] z-10 rounded-xl">
                  <Loader2 className="w-9 h-9 text-purple-400 animate-spin" />
                  <p className="text-sm font-medium text-slate-400">Loading video…</p>
                </div>
              )}
              <video
                src={resolvedUrl}
                controls
                autoPlay
                playsInline
                onLoadStart={() => setVideoLoading(true)}
                onCanPlay={() => setVideoLoading(false)}
                className="w-full max-h-full rounded-xl shadow-2xl"
                style={{ background: '#000', maxHeight: 'calc(92dvh - 56px)' }}
              />
            </div>
          )}

          {/* PRESENTATION (PPTX/PPT) — renders inline via Microsoft Office Viewer */}
          {kind === 'presentation' && (
            <div className="relative w-full flex-1 bg-[#0a0b0d]">
              <iframe
                src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(resolvedUrl)}`}
                className="w-full h-full border-0 absolute left-0 top-0 pptx-iframe"
                title="PowerPoint Web Viewer"
                allowFullScreen
              />
            </div>
          )}

          {/* DOC / OTHER — download only */}
          {kind === 'doc' && (
            <div className="flex-1 flex flex-col items-center justify-center gap-6 p-10 text-center w-full max-w-sm mx-auto">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.2)' }}>
                <File className="w-10 h-10 text-sky-400" />
              </div>
              <div>
                <h4 className="text-slate-100 font-bold text-base">{name}</h4>
                <p className="text-slate-400 text-xs mt-2 leading-relaxed">
                  This file type cannot be previewed in the browser. Download it to open it.
                </p>
              </div>
              <button
                onClick={handleDownload}
                className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-extrabold text-[#0E0F11] bg-amber-400 hover:bg-amber-300 shadow-lg shadow-amber-400/20 transition-all cursor-pointer active:scale-95"
              >
                <Download className="w-4 h-4" />
                Download File
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes av-in {
          from { opacity: 0; transform: scale(0.94) translateY(12px); }
          to   { opacity: 1; transform: scale(1)    translateY(0); }
        }
        @media (max-width: 767px) {
          .pptx-iframe {
            width: 200% !important;
            height: 200% !important;
            transform: scale(0.5) !important;
            transform-origin: 0 0 !important;
          }
        }
      `}</style>
    </div>,
    document.body
  );

  return (
    <>
      <div
        onClick={() => { setOpen(true); setZoom(false); setImgLoaded(false); setVideoLoading(true); setPdfLoading(true); setPdfBlobUrl(null); setPdfError(false); }}
        className="contents"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && setOpen(true)}
        aria-label={`View attachment: ${name}`}
      >
        {children}
      </div>
      {modal}
    </>
  );
}
