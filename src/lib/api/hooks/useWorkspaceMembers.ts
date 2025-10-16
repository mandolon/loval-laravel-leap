import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import type { WorkspaceMember } from '../types'

const workspaceMemberKeys = {
  all: ['workspace-members'] as const,
  lists: () => [...workspaceMemberKeys.all, 'list'] as const,
  list: (workspaceId: string) => [...workspaceMemberKeys.lists(), workspaceId] as const,
}

// Transform database row to WorkspaceMember type
const transformDbToWorkspaceMember = (data: any): WorkspaceMember => ({
  id: data.id,
  shortId: data.short_id,
  workspaceId: data.workspace_id,
  userId: data.user_id,
  role: data.role as 'admin' | 'team' | 'consultant' | 'client',
  createdAt: data.created_at,
  deletedAt: data.deleted_at,
  deletedBy: data.deleted_by,
})

// Get all workspace members
export const useWorkspaceMembers = (workspaceId: string) => {
  return useQuery({
    queryKey: workspaceMemberKeys.list(workspaceId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workspace_members')
        .select('*')
        .eq('workspace_id', workspaceId)
        .is('deleted_at', null)
      
      if (error) throw error
      return (data || []).map(transformDbToWorkspaceMember)
    },
    enabled: !!workspaceId,
  })
}

// Assign member to workspace
export const useAssignMember = () => {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ 
      workspaceId, 
      userId, 
      role 
    }: { 
      workspaceId: string;
      userId: string;
      role: 'admin' | 'team' | 'consultant' | 'client';
    }) => {
      const { data, error } = await supabase
        .from('workspace_members')
        .insert({
          workspace_id: workspaceId,
          user_id: userId,
          role,
        })
        .select()
        .single()
      
      if (error) throw error
      return transformDbToWorkspaceMember(data)
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: workspaceMemberKeys.list(data.workspaceId) })
      toast({
        title: 'Success',
        description: 'Member assigned to workspace successfully',
      })
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to assign member: ${error.message}`,
        variant: 'destructive',
      })
    },
  })
}

// Unassign member from workspace (soft delete)
export const useUnassignMember = () => {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, workspaceId }: { id: string; workspaceId: string }) => {
      const { error } = await supabase
        .from('workspace_members')
        .update({
          deleted_at: new Date().toISOString(),
        })
        .eq('id', id)
      
      if (error) throw error
      return workspaceId
    },
    onSuccess: (workspaceId) => {
      queryClient.invalidateQueries({ queryKey: workspaceMemberKeys.list(workspaceId) })
      toast({
        title: 'Success',
        description: 'Member unassigned from workspace successfully',
      })
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to unassign member: ${error.message}`,
        variant: 'destructive',
      })
    },
  })
}

// Update member role
export const useUpdateMemberRole = () => {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ 
      id, 
      workspaceId, 
      role 
    }: { 
      id: string; 
      workspaceId: string;
      role: 'admin' | 'team' | 'consultant' | 'client';
    }) => {
      const { data, error } = await supabase
        .from('workspace_members')
        .update({ role })
        .eq('id', id)
        .select()
        .single()
      
      if (error) throw error
      return transformDbToWorkspaceMember(data)
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: workspaceMemberKeys.list(data.workspaceId) })
      toast({
        title: 'Success',
        description: 'Member role updated successfully',
      })
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to update member role: ${error.message}`,
        variant: 'destructive',
      })
    },
  })
}
