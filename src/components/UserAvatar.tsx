import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface UserAvatarUser {
  first_name?: string;
  last_name?: string;
  name?: string; // For backward compatibility
  initials: string;
  avatar?: string | null;
  role?: string;
}

interface UserAvatarProps {
  user: UserAvatarUser;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "h-6 w-6 text-xs",
  md: "h-8 w-8 text-sm",
  lg: "h-10 w-10 text-base",
};

export const UserAvatar = ({ user, size = "md" }: UserAvatarProps) => {
  const displayName = user.first_name && user.last_name 
    ? `${user.first_name} ${user.last_name}`
    : user.first_name || user.name || 'User';

  return (
    <Tooltip>
      <TooltipTrigger>
        <Avatar className={sizeClasses[size]}>
          <AvatarFallback 
            className="text-white"
            style={{ background: user.avatar || 'linear-gradient(135deg, hsl(280, 70%, 60%) 0%, hsl(320, 80%, 65%) 100%)' }}
          >
            {user.initials}
          </AvatarFallback>
        </Avatar>
      </TooltipTrigger>
      <TooltipContent>
        <p className="font-medium">{displayName}</p>
        {user.role && <p className="text-xs text-muted-foreground capitalize">{user.role}</p>}
      </TooltipContent>
    </Tooltip>
  );
};
