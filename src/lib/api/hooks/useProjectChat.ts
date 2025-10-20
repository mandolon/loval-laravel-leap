import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { useUser } from '@/contexts/UserContext'
import { useEffect } from 'react'
import type { ProjectChatMessage, CreateMessageInput, UpdateMessageInput } from '../types'

const messageKeys = {
  all: ['project-chat'] as const,
  lists: () => [...messageKeys.all, 'list'] as const,
  list: (projectId: string) => [...messageKeys.lists(), projectId] as const,
  detail: (id: string) => [...messageKeys.all, 'detail', id] as const,
}

// Extended message type with user data for UI
export interface ProjectChatMessageWithUser extends ProjectChatMessage {
  user?: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
}

// Transform database row to message with user data
const transformDbToMessage = (data: any): ProjectChatMessageWithUser => ({
  id: data.id,
  shortId: data.short_id,
  projectId: data.project_id,
  userId: data.user_id,
  content: data.content,
  referencedFiles: data.referenced_files || [],
  referencedTasks: data.referenced_tasks || [],
  replyToMessageId: data.reply_to_message_id,
  createdAt: data.created_at,
  updatedAt: data.updated_at,
  deletedAt: data.deleted_at,
  deletedBy: data.deleted_by,
  user: data.users ? {
    id: data.users.id,
    name: data.users.name,
    avatarUrl: data.users.avatar_url,
  } : undefined,
})

// Get all messages for a project with real-time updates
export const useProjectMessages = (projectId: string) => {
  const queryClient = useQueryClient()
  
  const query = useQuery({
    queryKey: messageKeys.list(projectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('project_chat_messages')
        .select('*, users!project_chat_messages_user_id_fkey(id, name, avatar_url)')
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true })
      
      if (error) throw error
      return (data || []).map(transformDbToMessage)
    },
    enabled: !!projectId,
  })
  
  // Set up real-time subscription
  useEffect(() => {
    if (!projectId) return
    
    const channel = supabase
      .channel('project-chat')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'project_chat_messages',
        filter: `project_id=eq.${projectId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: messageKeys.list(projectId) })
      })
      .subscribe()
    
    return () => {
      supabase.removeChannel(channel)
    }
  }, [projectId, queryClient])
  
  return query
}

// Create message
export const useCreateMessage = () => {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { user } = useUser()
  
  return useMutation({
    mutationFn: async (input: CreateMessageInput) => {
      const { data, error } = await supabase
        .from('project_chat_messages')
        .insert({
          project_id: input.projectId,
          user_id: user?.id,
          content: input.content,
          referenced_files: input.referencedFiles || [],
          referenced_tasks: input.referencedTasks || [],
          reply_to_message_id: input.replyToMessageId,
        })
        .select()
        .single()
      
      if (error) throw error
      return transformDbToMessage(data)
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: messageKeys.list(data.projectId) })
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to send message: ${error.message}`,
        variant: 'destructive',
      })
    },
  })
}

// Update message
export const useUpdateMessage = () => {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateMessageInput }) => {
      const { data, error } = await supabase
        .from('project_chat_messages')
        .update({
          content: input.content,
        })
        .eq('id', id)
        .select()
        .single()
      
      if (error) throw error
      return transformDbToMessage(data)
    },
    onSuccess: (data, { id }) => {
      queryClient.invalidateQueries({ queryKey: messageKeys.list(data.projectId) })
      queryClient.invalidateQueries({ queryKey: messageKeys.detail(id) })
      toast({
        title: 'Success',
        description: 'Message updated successfully',
      })
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to update message: ${error.message}`,
        variant: 'destructive',
      })
    },
  })
}

// Delete message (soft delete)
export const useDeleteMessage = () => {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { user } = useUser()
  
  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      const { error } = await supabase
        .from('project_chat_messages')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: user?.id,
        })
        .eq('id', id)
      
      if (error) throw error
      return projectId
    },
    onSuccess: (projectId) => {
      queryClient.invalidateQueries({ queryKey: messageKeys.list(projectId) })
      toast({
        title: 'Success',
        description: 'Message deleted successfully',
      })
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to delete message: ${error.message}`,
        variant: 'destructive',
      })
    },
  })
}
