import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ProjectMember {
  id: string;
  userId: string;
  projectId: string;
  title?: string;
  userName: string;
  userEmail: string;
  userAvatarUrl: string | null;
  user?: {
    id: string;
    name: string;
    email: string;
    avatar_url: string | null;
    shortId: string;
    createdAt: string;
    updatedAt: string;
  };
}

const transformDbToProjectMember = (row: any): ProjectMember => ({
  id: row.id,
  userId: row.user_id,
  projectId: row.project_id,
  title: row.title,
  userName: row.users?.name || '',
  userEmail: row.users?.email || '',
  userAvatarUrl: row.users?.avatar_url || null,
});

export const useProjectMembers = (projectId: string) => {
  return useQuery({
    queryKey: ['project-members', projectId],
    queryFn: async () => {
      // First get project members
      const { data: members, error: membersError } = await supabase
        .from('project_members')
        .select('*')
        .eq('project_id', projectId)
        .is('deleted_at', null);

      if (membersError) throw membersError;
      if (!members || members.length === 0) return [];

      // Get all user IDs
      const userIds = members.map(m => m.user_id);

      // Fetch user details
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, name, email, avatar_url, short_id, created_at, updated_at')
        .in('id', userIds);

      if (usersError) throw usersError;

      // Create a map of user data
      const userMap = new Map(users?.map(u => [u.id, u]) || []);

      // Combine the data
      return members.map(member => {
        const user = userMap.get(member.user_id);
        return {
          id: member.id,
          userId: member.user_id,
          projectId: member.project_id,
          title: member.title,
          userName: user?.name || 'Unknown User',
          userEmail: user?.email || '',
          userAvatarUrl: user?.avatar_url || null,
          user: user ? {
            id: user.id,
            name: user.name,
            email: user.email,
            avatar_url: user.avatar_url,
            shortId: user.short_id,
            createdAt: user.created_at,
            updatedAt: user.updated_at,
          } : undefined,
        };
      });
    },
    enabled: !!projectId,
  });
};

export const useAssignProjectMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, userId, title }: { projectId: string; userId: string; title?: string }) => {
      // First check if there's an existing soft-deleted record
      const { data: existing, error: checkError } = await supabase
        .from('project_members')
        .select('*')
        .eq('project_id', projectId)
        .eq('user_id', userId)
        .maybeSingle();
      
      if (checkError) throw checkError;

      // If there's a soft-deleted record, restore it
      if (existing?.deleted_at) {
        const { data, error } = await supabase
          .from('project_members')
          .update({
            deleted_at: null,
            deleted_by: null,
            title,
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      }

      // Otherwise, insert a new record
      const { data, error } = await supabase
        .from('project_members')
        .insert({
          project_id: projectId,
          user_id: userId,
          title,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project-members', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Member assigned to project');
    },
    onError: (error) => {
      toast.error('Failed to assign member');
      console.error('Error assigning member:', error);
    },
  });
};

export const useUnassignProjectMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      const { error } = await supabase
        .from('project_members')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['project-members', variables.projectId] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Member removed from project');
    },
    onError: (error) => {
      toast.error('Failed to remove member');
      console.error('Error removing member:', error);
    },
  });
};
