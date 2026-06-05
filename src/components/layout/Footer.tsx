import React from 'react';

export function Footer() {
  return (
    <footer className="w-full border-t border-border/10 bg-[#060813]/40 backdrop-blur-sm px-4 lg:px-8 py-5 mt-auto flex-shrink-0">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500 text-[11px] font-semibold tracking-wide uppercase">
        <div className="flex items-center gap-2.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#6366f1] shadow-[0_0_8px_#6366f1]" />
          <span>ClassApp — Academic Platform</span>
        </div>
        <div className="flex items-center gap-6">
          <span>&copy; {new Date().getFullYear()} All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
}
