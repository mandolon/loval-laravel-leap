import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
}

export interface UserWithWorkspaces {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  isAdmin: boolean;
  title?: string;
  role: 'team' | 'consultant' | 'client' | null;
  workspaces: Array<{
    membershipId: string;
    workspaceId: string;
    workspaceName: string;
  }>;
}

export const useUsers = () => {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      // Step 1: Fetch all active users with their roles
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select(`
          id, 
          name, 
          email, 
          avatar_url, 
          is_admin, 
          title,
          user_roles(role)
        `)
        .is('deleted_at', null)
        .order('name');

      if (usersError) throw usersError;
      if (!users) return [];

      // Step 2: Fetch all workspace memberships for these users
      const userIds = users.map(u => u.id);
      
      let memberships: any[] = [];
      if (userIds.length > 0) {
        const { data: membershipsData, error: membershipsError } = await supabase
          .from('workspace_members')
          .select('id, user_id, workspace_id, workspaces(id, name)')
          .in('user_id', userIds)
          .is('deleted_at', null);

        // If membership query fails, log error but continue with empty memberships
        if (membershipsError) {
          console.error('Error fetching workspace memberships:', membershipsError);
        } else {
          memberships = membershipsData || [];
        }
      }

      // Step 3: Group memberships by user
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

      // Step 4: Combine user data with workspace assignments
      return users.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        avatar_url: user.avatar_url,
        isAdmin: user.is_admin,
        title: user.title,
        role: (user.user_roles as any)?.[0]?.role || null,
        workspaces: membershipsByUser.get(user.id) || [],
      })) as UserWithWorkspaces[];
    },
  });
};
