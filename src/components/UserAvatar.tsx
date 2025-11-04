import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getAvatarColor, getAvatarInitials } from "@/utils/avatarUtils";

interface UserAvatarUser {
  first_name?: string;
  last_name?: string;
  name?: string;
  initials?: string;
  avatar?: string | null;
  avatar_url?: string | null;
  avatarUrl?: string | null;
  role?: string;
}

interface UserAvatarProps {
  user: UserAvatarUser;
  size?: "xs" | "sm" | "md" | "lg";
}

const sizeClasses = {
  xs: "h-6 w-6 text-[9px]",
  sm: "h-6 w-6 text-xs",
  md: "h-8 w-8 text-sm",
  lg: "h-10 w-10 text-base",
};

export const UserAvatar = ({ user, size = "md" }: UserAvatarProps) => {
  // Handle both new (first_name/last_name) and old (name) format
  const fullName = user.first_name 
    ? `${user.first_name}${user.last_name ? ' ' + user.last_name : ''}` 
    : user.name || 'User';
  
  // Use avatar utilities for consistent behavior
  const avatarColor = getAvatarColor(user);
  const initials = user.initials || getAvatarInitials(fullName);
  
  return (
    <Tooltip>
      <TooltipTrigger>
        <Avatar className={sizeClasses[size]}>
          <AvatarFallback 
            className="text-white"
            style={{ background: avatarColor }}
          >
            {initials}
          </AvatarFallback>
        </Avatar>
      </TooltipTrigger>
      <TooltipContent>
        <p className="font-medium">{fullName}</p>
        {user.role && <p className="text-xs text-muted-foreground capitalize">{user.role}</p>}
      </TooltipContent>
    </Tooltip>
  );
};
