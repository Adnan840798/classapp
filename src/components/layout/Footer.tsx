import React from 'react';

export function Footer() {
  return (
    <footer className="w-full border-t flex-shrink-0" style={{ background: '#121214', borderColor: '#1e2128' }}>
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-center">
        <span className="text-[11px] font-medium tracking-wide" style={{ color: '#374151' }}>
          &copy; {new Date().getFullYear()} ClassApp. All rights reserved.
        </span>
      </div>
    </footer>
  );
}