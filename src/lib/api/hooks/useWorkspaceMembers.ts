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
  createdAt: data.created_at,
  deletedAt: data.deleted_at,
  deletedBy: data.deleted_by,
  userName: data.users?.name || '',
  userEmail: data.users?.email || '',
  userAvatarUrl: data.users?.avatar_url || null,
})

// Get all workspace members
export const useWorkspaceMembers = (workspaceId: string) => {
  return useQuery({
    queryKey: workspaceMemberKeys.list(workspaceId),
    queryFn: async () => {
      // First get workspace members
      const { data: members, error: membersError } = await supabase
        .from('workspace_members')
        .select('*')
        .eq('workspace_id', workspaceId)
        .is('deleted_at', null)
      
      if (membersError) throw membersError
      if (!members || members.length === 0) return []

      // Get all user IDs
      const userIds = members.map(m => m.user_id)

      // Fetch user details
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, name, email, avatar_url')
        .in('id', userIds)

      if (usersError) throw usersError

      // Create a map of user data
      const userMap = new Map(users?.map(u => [u.id, u]) || [])

      // Combine the data
      return members.map(member => {
        const user = userMap.get(member.user_id)
        return {
          id: member.id,
          shortId: member.short_id,
          workspaceId: member.workspace_id,
          userId: member.user_id,
          createdAt: member.created_at,
          deletedAt: member.deleted_at,
          deletedBy: member.deleted_by,
          userName: user?.name || 'Unknown User',
          userEmail: user?.email || '',
          userAvatarUrl: user?.avatar_url || null,
        }
      })
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
      userId
    }: { 
      workspaceId: string;
      userId: string;
    }) => {
      // First check if there's an existing soft-deleted record
      const { data: existing, error: checkError } = await supabase
        .from('workspace_members')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId)
        .maybeSingle()
      
      if (checkError) throw checkError

      // If there's a soft-deleted record, restore it
      if (existing?.deleted_at) {
        const { data, error } = await supabase
          .from('workspace_members')
          .update({
            deleted_at: null,
            deleted_by: null
          })
          .eq('id', existing.id)
          .select()
          .single()
        
        if (error) throw error
        
        // Fetch user data separately
        const { data: userData } = await supabase
          .from('users')
          .select('name, email, avatar_url')
          .eq('id', userId)
          .single()
        
        return {
          ...data,
          userName: userData?.name || 'Unknown User',
          userEmail: userData?.email || '',
          userAvatarUrl: userData?.avatar_url || null,
        }
      }

      // Otherwise, insert a new record
      const { data, error } = await supabase
        .from('workspace_members')
        .insert({
          workspace_id: workspaceId,
          user_id: userId
        })
        .select()
        .single()
      
      if (error) throw error
      
      // Fetch user data separately
      const { data: userData } = await supabase
        .from('users')
        .select('name, email, avatar_url')
        .eq('id', userId)
        .single()
      
      return {
        id: data.id,
        shortId: data.short_id,
        workspaceId: data.workspace_id,
        userId: data.user_id,
        createdAt: data.created_at,
        deletedAt: data.deleted_at,
        deletedBy: data.deleted_by,
        userName: userData?.name || 'Unknown User',
        userEmail: userData?.email || '',
        userAvatarUrl: userData?.avatar_url || null,
      }
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

