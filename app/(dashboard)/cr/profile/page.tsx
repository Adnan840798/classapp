import { redirect } from 'next/navigation';
import { getSupabaseServerClient, getAuthUser } from '@/lib/supabase/server';
import { ProfileForm } from '../../student/profile/ProfileForm';

export const revalidate = 0; // force dynamic rendering

export default async function CRProfilePage() {
  const { user } = await getAuthUser();
  if (!user) redirect('/login');
  const supabase = await getSupabaseServerClient();

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, profile_pic_url, university_id, phone, whatsapp, telegram_handle, facebook_id, blood_group, address, batch, department, notif_enabled, notif_sound_on, password_reset_required, cr_last_read_at, fcm_token, created_at, updated_at')
    .eq('id', user.id)
    .single();

  if (error || !profile) {
    redirect('/login');
  }

  // Fetch all profiles if the user is CR or Admin
  let allProfiles: any[] = [];
  let semesterConfig = null;
  if (profile.role === 'cr' || profile.role === 'admin') {
    const [profilesRes, configRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, full_name, university_id, email, phone, role, password_reset_required')
        .order('university_id', { ascending: true }),
      supabase
        .from('semester_config')
        .select('id, total_weeks, start_date')
        .eq('id', 1)
        .maybeSingle()
    ]);
    allProfiles = profilesRes.data || [];
    semesterConfig = configRes.data;
  }

  return (
    <div className="max-w-4xl mx-auto w-full flex flex-col gap-6 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">My Profile</h1>
        <p className="page-subtitle">Manage your personal details, contact links, and notification settings</p>
      </div>

      <ProfileForm profile={profile} allProfiles={allProfiles} semesterConfig={semesterConfig ?? undefined} />
    </div>
  );
}
