import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { ProfileForm } from '../../student/profile/ProfileForm';

export const revalidate = 0; // force dynamic rendering

export default async function CRProfilePage() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error || !profile) {
    redirect('/login');
  }

  // Fetch all profiles if the user is CR or Admin
  let allProfiles: any[] = [];
  if (profile.role === 'cr' || profile.role === 'admin') {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, university_id, email, phone, role, password_reset_required')
      .order('university_id', { ascending: true });
    allProfiles = data || [];
  }

  return (
    <div className="max-w-4xl mx-auto w-full flex flex-col gap-6 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">My Profile</h1>
        <p className="page-subtitle">Manage your personal details, contact links, and notification settings</p>
      </div>

      <ProfileForm profile={profile} allProfiles={allProfiles} />
    </div>
  );
}
