import { redirect } from 'next/navigation';

export default function CRDashboardRedirect() {
  redirect('/cr/timeline');
}
