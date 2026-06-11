'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Download,
  FileText,
  ZoomIn,
  ZoomOut,
  ExternalLink,
  File,
  ImageIcon,
  Loader2,
} from 'lucide-react';

interface AttachmentViewerProps {
  url: string;
  fileName?: string;
  /** The trigger element — rendered as-is, AttachmentViewer wraps it in a div with onClick */
  children: React.ReactNode;
}

type FileKind = 'image' | 'pdf' | 'video' | 'doc';

function detectKind(url: string): FileKind {
  try {
    const clean = url.split('?')[0].toLowerCase();
    const ext = clean.split('.').pop() ?? '';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'avif'].includes(ext)) return 'image';
    if (ext === 'pdf') return 'pdf';
    if (['mp4', 'webm', 'ogg', 'mov', 'mkv', 'avi'].includes(ext)) return 'video';
  } catch {}
  return 'doc';
}

export function AttachmentViewer({ url, fileName, children }: AttachmentViewerProps) {
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Portal needs client mount
  useEffect(() => { setMounted(true); }, []);

  // Keyboard: Escape to close
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

  const kind = detectKind(url);
  const name = fileName || url.split('/').pop() || 'Attachment';

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const modal = open && mounted && createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={name}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6"
      style={{ isolation: 'isolate' }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className="relative z-10 flex flex-col w-full max-w-4xl max-h-[92dvh] rounded-2xl overflow-hidden shadow-2xl"
        style={{
          background: 'linear-gradient(145deg, #16181D 0%, #0E0F11 100%)',
          border: '1px solid rgba(255,255,255,0.07)',
          boxShadow: '0 32px 64px rgba(0,0,0,0.7), 0 0 0 1px rgba(52,211,153,0.08)',
          animation: 'av-in 0.22s cubic-bezier(0.34,1.56,0.64,1) both',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div
          className="flex items-center justify-between gap-3 px-5 py-3.5 shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          {/* Left: type pill + name */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)' }}>
              {kind === 'image' && <ImageIcon className="w-4 h-4 text-emerald-400" />}
              {kind === 'pdf'   && <FileText  className="w-4 h-4 text-rose-400" />}
              {kind === 'video' && <File      className="w-4 h-4 text-purple-400" />}
              {kind === 'doc'   && <File      className="w-4 h-4 text-sky-400" />}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500 leading-none mb-0.5">
                {kind === 'image' ? 'Image' : kind === 'pdf' ? 'PDF Document' : kind === 'video' ? 'Video' : 'File Attachment'}
              </p>
              <h3 className="text-sm font-semibold text-slate-100 truncate">{name}</h3>
            </div>
          </div>

          {/* Right: controls */}
          <div className="flex items-center gap-1.5 shrink-0">
            {kind === 'image' && (
              <button
                onClick={() => setZoom(v => !v)}
                title={zoom ? 'Zoom out' : 'Zoom in'}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/8 transition-colors cursor-pointer"
              >
                {zoom ? <ZoomOut className="w-4 h-4" /> : <ZoomIn className="w-4 h-4" />}
              </button>
            )}
            <button
              onClick={handleDownload}
              title="Download"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-[#34D399] hover:text-[#0E0F11] bg-[#34D399]/10 hover:bg-[#34D399] border border-[#34D399]/20 hover:border-transparent transition-all duration-200 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Download
            </button>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              title="Open in new tab"
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/8 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            <div className="w-px h-5 bg-white/8 mx-1" />
            <button
              onClick={() => setOpen(false)}
              title="Close (Esc)"
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/8 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Content ── */}
        <div className="flex-1 overflow-auto flex items-center justify-center bg-[#0a0b0d] min-h-0">

          {/* IMAGE */}
          {kind === 'image' && (
            <div className="relative w-full h-full flex items-center justify-center p-4 overflow-auto">
              {!imgLoaded && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-slate-600 animate-spin" />
                </div>
              )}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
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

          {/* PDF */}
          {kind === 'pdf' && (
            <iframe
              src={`${url}#toolbar=1&view=FitH`}
              title={name}
              className="w-full bg-white"
              style={{ height: 'calc(92dvh - 64px)', border: 'none' }}
            />
          )}

          {/* VIDEO */}
          {kind === 'video' && (
            <div className="w-full flex items-center justify-center p-4">
              <video
                src={url}
                controls
                autoPlay
                className="w-full rounded-xl shadow-2xl"
                style={{ maxHeight: 'calc(92dvh - 100px)', background: '#000' }}
              />
            </div>
          )}

          {/* DOC / FALLBACK */}
          {kind === 'doc' && (
            <div className="flex flex-col items-center justify-center gap-6 p-10 text-center w-full max-w-sm mx-auto">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center"
                style={{ background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.2)' }}>
                <File className="w-10 h-10 text-sky-400" />
              </div>
              <div>
                <h4 className="text-slate-100 font-bold text-base">{name}</h4>
                <p className="text-slate-400 text-xs mt-2 leading-relaxed">
                  This file type cannot be previewed directly in the browser.
                  Download it or open it with Google Docs.
                </p>
              </div>
              <div className="flex flex-col gap-3 w-full">
                <button
                  onClick={handleDownload}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-extrabold text-[#0E0F11] bg-[#34D399] hover:bg-[#2ebd87] shadow-lg shadow-[#34D399]/20 transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  Download File
                </button>
                <a
                  href={`https://docs.google.com/viewer?embedded=true&url=${encodeURIComponent(url)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white transition-colors"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <ExternalLink className="w-4 h-4" />
                  Open in Google Docs Viewer
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Keyframe injection */}
      <style>{`
        @keyframes av-in {
          from { opacity: 0; transform: scale(0.94) translateY(10px); }
          to   { opacity: 1; transform: scale(1)    translateY(0); }
        }
      `}</style>
    </div>,
    document.body
  );

  return (
    <>
      <div
        onClick={() => { setOpen(true); setZoom(false); setImgLoaded(false); }}
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
