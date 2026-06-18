import { redirect } from 'next/navigation';
import { getSupabaseServerClient, getAuthUser } from '@/lib/supabase/server';
import { ProfileForm } from './ProfileForm';

export const revalidate = 0; // force dynamic rendering

export default async function StudentProfilePage() {
  const { user } = await getAuthUser();
  if (!user) redirect('/login');
  const supabase = await getSupabaseServerClient();

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, profile_pic_url, university_id, phone, whatsapp, telegram_handle, batch, department, notif_enabled, password_reset_required, cr_last_read_at, fcm_token, created_at, updated_at')
    .eq('id', user.id)
    .single();

  if (error || !profile) {
    redirect('/login');
  }

  return (
    <div className="max-w-4xl mx-auto w-full flex flex-col gap-6 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">My Profile</h1>
        <p className="page-subtitle">Manage your personal details, contact links, and notification settings</p>
      </div>

      <ProfileForm profile={profile} />
    </div>
  );
}
