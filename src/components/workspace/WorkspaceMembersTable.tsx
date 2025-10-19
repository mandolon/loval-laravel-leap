import { UserAvatar } from '@/components/UserAvatar';
import { Checkbox } from '@/components/ui/checkbox';
import { useUsers } from '@/lib/api/hooks/useUsers';
import { useWorkspaceMembers, useAssignMember, useUnassignMember } from '@/lib/api/hooks/useWorkspaceMembers';
import { Loader2 } from 'lucide-react';

interface WorkspaceMembersTableProps {
  workspaceId: string;
}

export const WorkspaceMembersTable = ({ workspaceId }: WorkspaceMembersTableProps) => {
  const { data: allUsers, isLoading: usersLoading } = useUsers();
  const { data: members, isLoading: membersLoading } = useWorkspaceMembers(workspaceId);
  const assignMember = useAssignMember();
  const unassignMember = useUnassignMember();

  const handleToggleMember = async (userId: string, isCurrentlyMember: boolean) => {
    try {
      if (isCurrentlyMember) {
        const member = members?.find(m => m.userId === userId);
        if (member) {
          await unassignMember.mutateAsync({
            id: member.id,
            workspaceId,
          });
        }
      } else {
        // Check again to prevent duplicate assignments
        const stillNotMember = !members?.some(m => m.userId === userId && !m.deletedAt);
        if (stillNotMember) {
        await assignMember.mutateAsync({
          workspaceId,
          userId
        });
        }
      }
    } catch (error) {
      console.error('Error toggling workspace member:', error);
    }
  };

  if (usersLoading || membersLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const memberUserIds = new Set(members?.map(m => m.userId) || []);

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">Workspace Members</div>
      <div className="border rounded-lg">
        <div className="max-h-[400px] overflow-y-auto">
          {allUsers?.map((user) => {
            const isMember = memberUserIds.has(user.id);
            return (
              <div
                key={user.id}
                className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors border-b last:border-b-0"
              >
                <Checkbox
                  checked={isMember}
                  onCheckedChange={() => handleToggleMember(user.id, isMember)}
                  disabled={assignMember.isPending || unassignMember.isPending}
                />
                <UserAvatar
                  user={{ 
                    name: user.name, 
                    avatar_url: user.avatar_url 
                  }}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{user.name}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {user.email}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
