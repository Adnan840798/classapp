'use client';

import { useRef, useState } from 'react';
import { Paperclip, X, FileText, Image, AlertTriangle } from 'lucide-react';

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
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-semibold text-foreground">{label}</label>
      )}

      {/* Size error banner */}
      {sizeError && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-3 py-2 rounded-lg flex items-center gap-2 text-xs">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {sizeError}
        </div>
      )}

      {/* ── Preview state (file selected) ── */}
      {file && (
        <div className="flex items-center gap-3 border border-border rounded-lg px-4 py-3 bg-accent/20">
          {isImage ? (
            <Image className="w-5 h-5 text-primary flex-shrink-0" />
          ) : (
            <FileText className="w-5 h-5 text-primary flex-shrink-0" />
          )}
          <span className="text-sm font-semibold text-primary truncate flex-1 min-w-0">
            {file.name}
          </span>
          <span className="text-xs text-muted-foreground flex-shrink-0">
            {(file.size / 1024).toFixed(0)} KB
          </span>
          <button
            type="button"
            onClick={handleRemove}
            disabled={disabled}
            className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 font-semibold transition-colors disabled:opacity-50 flex-shrink-0"
            aria-label="Remove file"
          >
            <X className="w-4 h-4" />
            Remove
          </button>
        </div>
      )}

      {/* ── Upload zone (no file selected — hidden when file selected but kept in DOM) ── */}
      <div className={`relative border border-dashed border-border rounded-lg p-6 flex flex-col items-center justify-center gap-2 hover:bg-accent/30 transition-colors cursor-pointer ${file ? 'hidden' : ''}`}>
        <input
          ref={inputRef}
          type="file"
          name={name}
          accept={accept}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          onChange={handleChange}
          disabled={disabled}
        />
        <Paperclip className="w-8 h-8 text-muted-foreground opacity-50" />
        <p className="text-xs text-muted-foreground text-center">
          Drag and drop or click to upload{' '}
          <span className="font-semibold">(max {maxMB} MB)</span>
        </p>
      </div>
    </div>
  );
}
