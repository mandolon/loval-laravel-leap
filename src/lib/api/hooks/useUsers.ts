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
  lastActiveAt?: string | null;
  lastSignInAt?: string | null;
  isOnline: boolean;
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
      // Step 1: Call RPC to get users with auth data (last_sign_in_at, last_active_at)
      const { data: usersWithAuth, error: usersError } = await supabase
        .rpc('get_users_with_auth_data');

      if (usersError) throw usersError;
      if (!usersWithAuth) return [];

      // Calculate online status (active within last 10 minutes)
      const now = new Date();
      const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);

      // Step 2: Fetch user roles for all users
      const userIds = usersWithAuth.map((u: any) => u.id);
      const { data: userRoles } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', userIds);

      const rolesByUserId = new Map(
        (userRoles || []).map((r: any) => [r.user_id, r.role])
      );

      // Step 3: Fetch all workspace memberships for these users
      let memberships: any[] = [];
      if (userIds.length > 0) {
        const { data: membershipsData, error: membershipsError } = await supabase
          .from('workspace_members')
          .select('id, user_id, workspace_id, workspaces(id, name)')
          .in('user_id', userIds)
          .is('deleted_at', null);

        if (membershipsError) {
          console.error('Error fetching workspace memberships:', membershipsError);
        } else {
          memberships = membershipsData || [];
        }
      }

      // Step 4: Group memberships by user
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

      // Step 5: Combine all data with online status
      return usersWithAuth.map((user: any) => {
        const lastActiveAt = user.last_active_at ? new Date(user.last_active_at) : null;
        const isOnline = lastActiveAt ? lastActiveAt >= tenMinutesAgo : false;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          avatar_url: user.avatar_url,
          isAdmin: user.is_admin,
          title: user.title,
          role: rolesByUserId.get(user.id) || null,
          lastActiveAt: user.last_active_at,
          lastSignInAt: user.last_sign_in_at,
          isOnline,
          workspaces: membershipsByUser.get(user.id) || [],
        };
      }) as UserWithWorkspaces[];
    },
  });
};
