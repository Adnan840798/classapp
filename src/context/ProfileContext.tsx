'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { Profile } from '@/types';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

interface ProfileContextValue {
  profile: Profile | null;
  setProfile: (profile: Profile) => void;
  isLoading: boolean;
}

const ProfileContext = createContext<ProfileContextValue>({
  profile: null,
  setProfile: () => {},
  isLoading: true,
});

interface ProfileProviderProps {
  children: ReactNode;
  initialProfile: Profile | null;
}

/**
 * ProfileProvider — wraps the dashboard layout.
 * Profile is loaded once server-side and passed as initialProfile.
 * Never fires an additional Supabase query.
 * Updates are applied locally via setProfile after profile edits.
 */
export function ProfileProvider({ children, initialProfile }: ProfileProviderProps) {
  const [profile, setProfileState] = useState<Profile | null>(initialProfile);
  const [isLoading] = useState(false);

  function setProfile(updated: Profile) {
    setProfileState(updated);
  }

  return (
    <ProfileContext.Provider value={{ profile, setProfile, isLoading }}>
      {children}
    </ProfileContext.Provider>
  );
}

/**
 * useProfile — reads profile from Context.
 * Zero database calls. Always use this hook instead of fetching the profile directly.
 */
export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
}
