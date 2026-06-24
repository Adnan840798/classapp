import React from 'react';

export function Footer() {
  return (
    <footer className="w-full border-t border-border bg-card dark:bg-background flex-shrink-0">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-center">
        <span className="text-[11px] font-medium tracking-wide text-muted-foreground">
          &copy; {new Date().getFullYear()} ClassApp. All rights reserved.
        </span>
      </div>
    </footer>
  );
}