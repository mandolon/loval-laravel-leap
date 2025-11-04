import { getAvatarColor, getAvatarInitials } from '@/utils/avatarUtils';

interface TeamAvatarProps {
  user: {
    avatar_url?: string | null;
    avatarUrl?: string | null;
    name: string;
  };
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  xs: 'h-6 w-6 text-[9px]',
  sm: 'h-6 w-6 text-[10px]',
  md: 'h-8 w-8 text-xs',
  lg: 'h-10 w-10 text-sm',
};

export function TeamAvatar({ user, size = 'md', className = '' }: TeamAvatarProps) {
  const avatarColor = getAvatarColor(user);
  const initials = getAvatarInitials(user.name);

  return (
    <div
      className={`inline-flex items-center justify-center rounded-full text-white font-semibold flex-shrink-0 ${sizeClasses[size]} ${className}`}
      style={{ background: avatarColor }}
      title={user.name}
    >
      {initials}
    </div>
  );
}

