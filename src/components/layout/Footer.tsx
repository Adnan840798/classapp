import React from 'react';

export function Footer() {
  return (
    <footer className="w-full border-t border-white/5 bg-[#060813]/40 backdrop-blur-sm px-4 py-5 mt-auto flex-shrink-0">
      <div className="max-w-6xl mx-auto flex items-center justify-center">
        <span className="text-slate-500/70 text-[11px] font-medium tracking-wide">
          &copy; {new Date().getFullYear()} ClassApp. All rights reserved.
        </span>
      </div>
    </footer>
  );
}