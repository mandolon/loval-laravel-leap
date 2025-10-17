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
      const { data, error } = await supabase
        .from('project_members')
        .select('*, users(name, email, avatar_url)')
        .eq('project_id', projectId)
        .is('deleted_at', null);

      if (error) throw error;
      return data.map(transformDbToProjectMember);
    },
    enabled: !!projectId,
  });
};

export const useAssignProjectMember = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, userId, title }: { projectId: string; userId: string; title?: string }) => {
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
