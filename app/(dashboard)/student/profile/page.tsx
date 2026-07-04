'use client';

/**
 * StudentProfilePage — reads profile from ProfileContext (preloaded by DashboardLayout).
 *
 * BEFORE: Server Component that did a fresh SELECT on profiles table every visit.
 * AFTER: Client Component that reads the already-in-memory profile from context.
 *
 * Zero DB calls on navigation. ProfileContext is seeded once by DashboardLayout
 * server-side and persists across all /student/* and /cr/* navigations.
 * After a profile edit, ProfileForm calls setProfile() to update context locally.
 */

import { useProfile } from '@/context/ProfileContext';
import { ProfileForm } from './ProfileForm';

function ProfileSkeleton() {
  return (
    <div className="max-w-4xl mx-auto w-full flex flex-col gap-6 animate-fade-in">
      <div className="page-header">
        <div className="shimmer h-8 w-48 rounded-lg mb-2" />
        <div className="shimmer h-4 w-72 rounded-md" />
      </div>
      <div className="flex flex-col gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="shimmer h-14 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export default function StudentProfilePage() {
  const { profile, isLoading } = useProfile();

  if (isLoading || !profile) {
    return <ProfileSkeleton />;
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
