import { UserManual } from '@/components/UserManual';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'User Manual — ClassApp',
  description: 'Learn how to use ClassApp as a student: timeline, deadlines, announcements, results, and more.',
};

export default function StudentManualPage() {
  return (
    <div className="py-2">
      <UserManual role="student" />
    </div>
  );
}
