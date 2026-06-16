import { UserManual } from '@/components/UserManual';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'CR Manual — ClassApp',
  description: 'Everything a Class Representative needs to know to manage their class on ClassApp.',
};

export default function CRManualPage() {
  return (
    <div className="py-2">
      <UserManual role="cr" />
    </div>
  );
}
