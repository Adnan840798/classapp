'use client';

import { useRef, useState } from 'react';
import { Paperclip, X, FileText, Image, AlertTriangle, Upload } from 'lucide-react';

interface FileUploadProps {
  /** The name attribute for the hidden file input — used by FormData */
  name: string;
  /** MIME types / extensions to accept. Defaults to images + PDF. */
  accept?: string;
  /** Label shown above the upload zone */
  label?: string;
  /** Whether the input should be disabled (e.g. form is submitting) */
  disabled?: boolean;
  /** Max file size in bytes. Defaults to 5 MB. */
  maxBytes?: number;
}

const DEFAULT_MAX = 5 * 1024 * 1024; // 5 MB

export function FileUpload({
  name,
  accept = 'image/*,application/pdf',
  label = 'Attachment (Image or PDF)',
  disabled = false,
  maxBytes = DEFAULT_MAX,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [sizeError, setSizeError] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);

  const maxMB = (maxBytes / ((1024 * 1024))).toFixed(0);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    setSizeError(null);

    if (!selected) {
      setFile(null);
      return;
    }

    if (selected.size > maxBytes) {
      setSizeError(`File is too large. Maximum allowed size is ${maxMB} MB.`);
      // Clear the input so FormData won't pick it up
      if (inputRef.current) inputRef.current.value = '';
      setFile(null);
      return;
    }

    setFile(selected);
  }

  function handleRemove() {
    setFile(null);
    setSizeError(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  const isImage = file?.type.startsWith('image/') ?? false;

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label className="text-sm font-semibold text-foreground/90 tracking-wide">{label}</label>
      )}

      {/* Size error banner */}
      {sizeError && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-3 py-2.5 rounded-xl flex items-center gap-2 text-xs animate-fade-in">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {sizeError}
        </div>
      )}

      {/* ── Preview state (file selected) ── */}
      {file && (
        <div className="flex items-center gap-3.5 border border-primary/20 rounded-2xl px-4 py-3 bg-primary/5 shadow-[0_2px_12px_rgba(16,185,129,0.04)] animate-fade-in">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
            {isImage ? (
              <Image className="w-5 h-5" />
            ) : (
              <FileText className="w-5 h-5" />
            )}
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-sm font-semibold text-foreground truncate">
              {file.name}
            </span>
            <span className="text-xs text-muted-foreground">
              {(file.size / 1024).toFixed(0)} KB
            </span>
          </div>
          <button
            type="button"
            onClick={handleRemove}
            disabled={disabled}
            className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 font-semibold bg-red-500/5 hover:bg-red-500/10 px-3 py-2 rounded-xl transition-all disabled:opacity-50 flex-shrink-0 cursor-pointer"
            aria-label="Remove file"
          >
            <X className="w-3.5 h-3.5" />
            Remove
          </button>
        </div>
      )}

      {/* ── Upload zone ── */}
      <div className={`relative border border-dashed rounded-2xl p-8 flex flex-col items-center justify-center gap-3 transition-all duration-300 cursor-pointer group
        ${isDragActive
          ? 'border-primary bg-primary/10 shadow-[0_0_20px_rgba(16,185,129,0.12)] scale-[0.99]'
          : 'border-border/60 bg-muted/5 hover:border-primary/50 hover:bg-primary/5 hover:shadow-[0_0_15px_rgba(16,185,129,0.04)]'
        } ${file ? 'hidden' : ''}`}
      >
        <input
          ref={inputRef}
          type="file"
          name={name}
          accept={accept}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
          onChange={handleChange}
          disabled={disabled}
          onDragEnter={() => setIsDragActive(true)}
          onDragLeave={() => setIsDragActive(false)}
          onDrop={() => setIsDragActive(false)}
        />
        
        {/* Animated Icon Wrapper */}
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 pointer-events-none
          ${isDragActive
            ? 'bg-primary text-primary-foreground scale-110 rotate-6 shadow-lg shadow-primary/20'
            : 'bg-primary/10 text-primary group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground group-hover:shadow-[0_4px_12px_rgba(16,185,129,0.25)]'
          }`}
        >
          <Upload className="w-5 h-5 transition-transform duration-300" />
        </div>

        {/* Clean, Non-dull Typography */}
        <div className="flex flex-col items-center gap-1 text-center select-none pointer-events-none">
          <p className="text-sm font-semibold text-foreground">
            Drag & drop file here or <span className="text-primary group-hover:underline">browse</span>
          </p>
          <p className="text-xs text-muted-foreground">
            Supports image or PDF up to <span className="font-medium text-foreground/80">{maxMB} MB</span>
          </p>
        </div>
      </div>
    </div>
  );
}

