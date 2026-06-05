'use client';

import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export default function SignOutButton() {
  async function handleSignOut() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    window.location.href = '/';
  }

  return (
    <button
      onClick={handleSignOut}
      className="btn-primary w-full mt-2"
    >
      Sign Out &amp; Register
    </button>
  );
}
