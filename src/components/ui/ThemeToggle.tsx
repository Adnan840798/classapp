'use client';

import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();

  return (
    <button
      id="theme-toggle-btn"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className={cn(
        'flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 lg:w-9 lg:h-9 rounded-xl border border-border',
        'bg-background hover:bg-accent transition-all duration-200',
        'text-muted-foreground hover:text-foreground flex-shrink-0 cursor-pointer shadow-lg shadow-black/5 dark:shadow-black/20',
        className
      )}
      aria-label="Toggle dark/light mode"
      title="Toggle theme"
    >
      <Sun className="w-4 h-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute w-4 h-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </button>
  );
}
