'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Loader2, AlertCircle } from 'lucide-react';

// Configure the worker using official CDN to ensure it works across all build systems & viewports
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFViewerInnerProps {
  file: string;
  onLoadSuccess?: () => void;
  onLoadError?: () => void;
}

export function PDFViewerInner({ file, onLoadSuccess, onLoadError }: PDFViewerInnerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number>(0);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        // Subtract padding/scrollbar width to avoid horizontal overflow
        const w = Math.max(100, entry.contentRect.width - 24);
        setWidth(w);
      }
    });
    observer.observe(containerRef.current);
    
    // Initial measure
    setWidth(containerRef.current.clientWidth - 24);
    
    return () => observer.disconnect();
  }, []);

  function onDocumentLoadSuccess({ numPages: loadedPages }: { numPages: number }) {
    setNumPages(loadedPages);
    onLoadSuccess?.();
  }

  function onDocumentLoadError() {
    onLoadError?.();
  }

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full overflow-y-auto flex flex-col items-center p-3 sm:p-4 bg-[#0a0b0d]"
    >
      <Document
        file={file}
        onLoadSuccess={onDocumentLoadSuccess}
        onLoadError={onDocumentLoadError}
        loading={
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <Loader2 className="w-9 h-9 text-emerald-400 animate-spin" />
            <p className="text-sm font-medium text-slate-400">Loading pages...</p>
          </div>
        }
        error={
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-rose-400">
            <AlertCircle className="w-9 h-9" />
            <p className="text-sm font-medium">Failed to load PDF pages.</p>
          </div>
        }
      >
        {numPages && width > 0 && Array.from({ length: numPages }, (_, index) => (
          <div 
            key={index + 1} 
            className="mb-4 shadow-2xl bg-[#16181d] rounded-xl overflow-hidden border border-white/5 max-w-full"
            style={{
              boxShadow: '0 10px 30px -10px rgba(0,0,0,0.5)'
            }}
          >
            <Page
              pageNumber={index + 1}
              width={width}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              loading={
                <div 
                  className="flex items-center justify-center bg-[#111216]"
                  style={{ width, height: width * 1.414 }}
                >
                  <Loader2 className="w-6 h-6 text-slate-500 animate-spin" />
                </div>
              }
            />
          </div>
        ))}
      </Document>
    </div>
  );
}
