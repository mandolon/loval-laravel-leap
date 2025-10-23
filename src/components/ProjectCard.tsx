import { useState } from "react";
import { MoreVertical, MessageSquare } from "lucide-react";
import { UserAvatar } from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import type { Project } from "@/lib/api/types";
import { useProjectMembers } from "@/lib/api/hooks/useProjectMembers";
import { cn } from "@/lib/utils";

interface ProjectCardProps {
  project: Project;
  onClick: () => void;
  onDelete?: (id: string) => void;
  onHardDelete?: (id: string) => void;
}

export const ProjectCard = ({ 
  project, 
  onClick, 
  onDelete, 
  onHardDelete 
}: ProjectCardProps) => {
  const [hardDeleteDialogOpen, setHardDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  
  // Fetch project members with user data
  const { data: projectMembers = [] } = useProjectMembers(project.id);
  
  // Format address for main heading
  const formatAddress = () => {
    const addr = project.address;
    if (!addr.streetNumber && !addr.streetName) {
      return project.name; // Fallback to project name if no address
    }
    return `${addr.streetNumber || ''} ${addr.streetName || ''}`.trim();
  };

  // Format client name
  const clientName = project.primaryClient.firstName && project.primaryClient.lastName
    ? `${project.primaryClient.firstName} ${project.primaryClient.lastName}`
    : project.primaryClient.email || 'No client';

  // Get unread message count (default to 0 if not available)
  const messageCount = project.unreadChatCount || 0;

  return (
    <>
      <div
        className={cn(
          "relative flex flex-col rounded-2xl transition-colors hover:border-primary",
          "h-44 p-5 pr-10",
          "overflow-hidden select-none bg-background text-foreground border border-border",
          "cursor-pointer group"
        )}
        onClick={onClick}
        role="button"
        aria-label={`Open project ${formatAddress()}`}
      >
        {/* Top-right corner: Three-dot menu + Chat notification */}
        <div className="absolute right-3 top-4 flex items-center gap-2">
          {/* Message notification badge - only show if there are messages */}
          {messageCount > 0 && (
            <div className="inline-flex items-center gap-1.5 rounded-full font-medium px-2.5 py-1 text-xs bg-muted text-muted-foreground ring ring-border">
              <MessageSquare className="h-4 w-4" />
              <span>{messageCount}</span>
            </div>
          )}
          
          {/* Three-dot menu */}
          {(onDelete || onHardDelete) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-8 w-8 rounded-full",
                    "hover:bg-accent hover:text-accent-foreground",
                    "opacity-0 group-hover:opacity-100 transition-opacity",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  )}
                  aria-label="Open menu"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover z-50">
              {onDelete && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(project.id);
                  }}
                >
                  Move to Trash
                </DropdownMenuItem>
              )}
              {onHardDelete && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    setHardDeleteDialogOpen(true);
                  }}
                  className="text-destructive"
                >
                  Delete Permanently
                </DropdownMenuItem>
              )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Header: Address (main) + Client (secondary) */}
        <div className="space-y-0.5">
          <h3 className="text-lg/6 font-medium tracking-[-0.01em] truncate">
            {formatAddress()}
          </h3>
          <p className="text-sm/6 text-muted-foreground truncate">
            {clientName}
          </p>
        </div>

        {/* Footer: Avatars */}
        <div className="mt-auto pt-5">
          {/* Team member avatars */}
          <div className="flex -space-x-2">
            {projectMembers.slice(0, 4).map((member) => (
              <div key={member.id} className="relative">
                <UserAvatar
                  user={{
                    name: member.user?.name || member.userName,
                    first_name: member.user?.name?.split(' ')[0],
                    last_name: member.user?.name?.split(' ').slice(1).join(' '),
                    avatar_url: member.user?.avatar_url || member.userAvatarUrl,
                    role: member.title
                  }}
                  size="sm"
                />
              </div>
            ))}
            {projectMembers.length > 4 && (
              <div className="ml-2 inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[10px] bg-muted text-muted-foreground ring ring-border">
                +{projectMembers.length - 4}
              </div>
            )}
            {projectMembers.length === 0 && (
              <span className="text-xs text-muted-foreground">No team members</span>
            )}
          </div>
        </div>
      </div>

      {/* Hard Delete Confirmation Dialog */}
      <AlertDialog open={hardDeleteDialogOpen} onOpenChange={setHardDeleteDialogOpen}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently Delete Project?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <div className="text-destructive font-medium">
                ⚠️ This will permanently delete:
              </div>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Project: "{project.name}"</li>
                <li>{project.totalTasks} tasks</li>
                <li>All files (including from storage)</li>
                <li>All notes and invoices</li>
              </ul>
              <p className="text-sm font-medium">
                This action cannot be undone. Use "Move to Trash" for recoverable deletion.
              </p>
              <div className="space-y-2">
                <Label htmlFor="project-delete-confirm">
                  Type the project name to confirm:
                </Label>
                <Input
                  id="project-delete-confirm"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder={project.name}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={(e) => {
                e.stopPropagation();
                setDeleteConfirmText("");
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteConfirmText !== project.name}
              onClick={(e) => {
                e.stopPropagation();
                onHardDelete?.(project.id);
                setHardDeleteDialogOpen(false);
                setDeleteConfirmText("");
              }}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete Forever
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
