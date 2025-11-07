import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { UserWithWorkspaces } from './useUsers';

export const useDeletedUsers = () => {
  return useQuery({
    queryKey: ['deleted-users'],
    queryFn: async () => {
      // Fetch deleted users with their roles
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select(`
          id, 
          name, 
          email, 
          avatar_url, 
          is_admin, 
          title,
          deleted_at,
          deleted_by,
          user_roles(role)
        `)
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });

      if (usersError) throw usersError;
      if (!users) return [];

      // Fetch workspace memberships for deleted users
      const userIds = users.map(u => u.id);
      
      let memberships: any[] = [];
      if (userIds.length > 0) {
        const { data: membershipsData, error: membershipsError } = await supabase
          .from('workspace_members')
          .select('id, user_id, workspace_id, workspaces(id, name)')
          .in('user_id', userIds);

        if (membershipsError) {
          console.error('Error fetching workspace memberships:', membershipsError);
        } else {
          memberships = membershipsData || [];
        }
      }

      // Group memberships by user
      const membershipsByUser = new Map<string, Array<{
        membershipId: string;
        workspaceId: string;
        workspaceName: string;
      }>>();

      memberships.forEach((m: any) => {
        if (!membershipsByUser.has(m.user_id)) {
          membershipsByUser.set(m.user_id, []);
        }
        membershipsByUser.get(m.user_id)!.push({
          membershipId: m.id,
          workspaceId: m.workspace_id,
          workspaceName: m.workspaces?.name || 'Unknown',
        });
      });

      // Combine user data with workspace assignments
      return users.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        avatar_url: user.avatar_url,
        isAdmin: user.is_admin,
        title: user.title,
        role: (user.user_roles as any)?.role || null,
        deletedAt: user.deleted_at,
        deletedBy: user.deleted_by,
        workspaces: membershipsByUser.get(user.id) || [],
      })) as (UserWithWorkspaces & { deletedAt: string; deletedBy: string })[];
    },
  });
};
