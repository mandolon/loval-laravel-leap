import { UserAvatar } from '@/components/UserAvatar';
import { Checkbox } from '@/components/ui/checkbox';
import { useWorkspaceMembers } from '@/lib/api/hooks/useWorkspaceMembers';
import { useProjectMembers, useAssignProjectMember, useUnassignProjectMember } from '@/lib/api/hooks/useProjectMembers';
import { Loader2 } from 'lucide-react';

interface ProjectMembersTableProps {
  projectId: string;
  workspaceId: string;
}

export const ProjectMembersTable = ({ projectId, workspaceId }: ProjectMembersTableProps) => {
  const { data: workspaceMembers, isLoading: workspaceMembersLoading } = useWorkspaceMembers(workspaceId);
  const { data: projectMembers, isLoading: projectMembersLoading } = useProjectMembers(projectId);
  const assignMember = useAssignProjectMember();
  const unassignMember = useUnassignProjectMember();

  const handleToggleMember = async (userId: string, isCurrentlyMember: boolean) => {
    if (isCurrentlyMember) {
      const member = projectMembers?.find(m => m.userId === userId);
      if (member) {
        await unassignMember.mutateAsync({
          id: member.id,
          projectId,
        });
      }
    } else {
      await assignMember.mutateAsync({
        projectId,
        userId,
      });
    }
  };

  if (workspaceMembersLoading || projectMembersLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const projectMemberUserIds = new Set(projectMembers?.map(m => m.userId) || []);

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">Project Team</div>
      <div className="border rounded-lg">
        <div className="max-h-[400px] overflow-y-auto">
          {workspaceMembers?.map((member) => {
            const isMember = projectMemberUserIds.has(member.userId);
            return (
              <div
                key={member.userId}
                className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors border-b last:border-b-0"
              >
                <Checkbox
                  checked={isMember}
                  onCheckedChange={() => handleToggleMember(member.userId, isMember)}
                  disabled={assignMember.isPending || unassignMember.isPending}
                />
                <UserAvatar
                  user={{ 
                    name: member.userName, 
                    avatar_url: member.userAvatarUrl 
                  }}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{member.userName}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {member.userEmail}
                  </div>
                </div>
              </div>
            );
          })}
          {!workspaceMembers?.length && (
            <div className="text-sm text-muted-foreground text-center py-8">
              No workspace members available
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
