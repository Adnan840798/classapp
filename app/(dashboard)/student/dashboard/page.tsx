import { redirect } from 'next/navigation';

export default function StudentDashboardRedirect() {
  redirect('/student/timeline');
}
