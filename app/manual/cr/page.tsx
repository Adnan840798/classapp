import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { UserManual } from '@/components/UserManual';

export const metadata = {
  title: 'CR Guide — ClassApp',
  description: 'A complete guide to ClassApp features for Class Representatives.',
};

export default function CRManualPage() {
  return (
    <div className="min-h-screen bg-background text-foreground px-4 sm:px-6 lg:px-14 py-10 max-w-5xl mx-auto">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors mb-8"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Home
      </Link>
      <UserManual role="cr" />
    </div>
  );
}
