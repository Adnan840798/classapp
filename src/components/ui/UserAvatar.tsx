'use client';

import { Profile } from '@/types';
import { getInitials } from '@/lib/utils/formatters';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface UserAvatarProps {
  profile: Pick<Profile, 'full_name' | 'profile_pic_url'>;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = {
  sm: { container: 'w-8 h-8', text: 'text-xs' },
  md: { container: 'w-10 h-10', text: 'text-sm' },
  lg: { container: 'w-16 h-16', text: 'text-xl' },
};

export function UserAvatar({ profile, size = 'md', className }: UserAvatarProps) {
  const { container, text } = sizeMap[size];

  if (profile.profile_pic_url) {
    return (
      <div
        className={cn(
          container,
          'relative rounded-full overflow-hidden flex-shrink-0 ring-2 ring-border',
          className
        )}
      >
        <Image
          src={profile.profile_pic_url}
          alt={profile.full_name}
          fill
          className="object-cover"
          sizes="64px"
        />
      </div>
    );
  }

  // Fallback: initials avatar with gradient
  const initials = getInitials(profile.full_name);

  return (
    <div
      className={cn(
        container,
        'rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0',
        text,
        className
      )}
      style={{
        background: '#4A5B66',
      }}
      aria-label={profile.full_name}
    >
      {initials}
    </div>
  );
}

/** Generates a consistent hue value from a name string */
function stringToHue(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}
