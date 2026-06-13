import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from 'next-themes';
import CapacitorHandler from '@/components/ui/CapacitorHandler';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'ClassApp — Academic Management Platform',
  description:
    'ClassApp is a role-based academic management platform for university classes. Manage announcements, deadlines, exam results, and more.',
  keywords: ['classapp', 'academic', 'university', 'management', 'student'],
  authors: [{ name: 'ClassApp' }],
  openGraph: {
    title: 'ClassApp',
    description: 'Academic Management Platform for University Classes',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/icons/icon-192.png" />
        <meta name="theme-color" content="#1a1f2e" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        {/* Load Capacitor Android/iOS bridge script when running inside the native APK WebView */}
        <script src="/capacitor.js" defer />
      </head>
      <body className={inter.variable}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange={false}
        >
          <CapacitorHandler />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
