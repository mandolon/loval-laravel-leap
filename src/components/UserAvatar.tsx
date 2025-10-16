import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { User } from "@/lib/api/types";

interface UserAvatarProps {
  user: User;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "h-6 w-6 text-xs",
  md: "h-8 w-8 text-sm",
  lg: "h-10 w-10 text-base",
};

export const UserAvatar = ({ user, size = "md" }: UserAvatarProps) => {
  return (
    <Tooltip>
      <TooltipTrigger>
        <Avatar className={sizeClasses[size]}>
          {user.avatar && <AvatarImage src={user.avatar} alt={user.name} />}
          <AvatarFallback className="bg-primary text-primary-foreground">
            {user.initials}
          </AvatarFallback>
        </Avatar>
      </TooltipTrigger>
      <TooltipContent>
        <p className="font-medium">{user.name}</p>
        <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
      </TooltipContent>
    </Tooltip>
  );
};
