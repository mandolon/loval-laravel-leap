import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { useUser } from '@/contexts/UserContext'
import type { Link, CreateLinkInput, UpdateLinkInput } from '../types'

const linkKeys = {
  all: ['links'] as const,
  lists: () => [...linkKeys.all, 'list'] as const,
  list: (projectId: string) => [...linkKeys.lists(), projectId] as const,
  detail: (id: string) => [...linkKeys.all, 'detail', id] as const,
}

// Transform database row to Link type
const transformDbToLink = (data: any): Link => ({
  id: data.id,
  shortId: data.short_id,
  projectId: data.project_id,
  title: data.title,
  description: data.description,
  url: data.url,
  createdBy: data.created_by,
  createdAt: data.created_at,
  updatedAt: data.updated_at,
  deletedAt: data.deleted_at,
  deletedBy: data.deleted_by,
})

// Get all links for a project
export const useLinks = (projectId: string) => {
  return useQuery({
    queryKey: linkKeys.list(projectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('links')
        .select('*')
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return (data || []).map(transformDbToLink)
    },
    enabled: !!projectId,
  })
}

// Get single link
export const useLink = (id: string) => {
  return useQuery({
    queryKey: linkKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('links')
        .select('*')
        .eq('id', id)
        .is('deleted_at', null)
        .single()
      
      if (error) throw error
      return transformDbToLink(data)
    },
    enabled: !!id,
  })
}

// Create link
export const useCreateLink = () => {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { user } = useUser()
  
  return useMutation({
    mutationFn: async (input: CreateLinkInput) => {
      const { data, error } = await supabase
        .from('links')
        .insert({
          project_id: input.projectId,
          title: input.title,
          description: input.description,
          url: input.url,
          created_by: user?.id,
        })
        .select()
        .single()
      
      if (error) throw error
      return transformDbToLink(data)
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: linkKeys.list(data.projectId) })
      toast({
        title: 'Success',
        description: 'Link created successfully',
      })
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to create link: ${error.message}`,
        variant: 'destructive',
      })
    },
  })
}

// Update link
export const useUpdateLink = () => {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateLinkInput }) => {
      const { data, error } = await supabase
        .from('links')
        .update({
          title: input.title,
          description: input.description,
          url: input.url,
        })
        .eq('id', id)
        .select()
        .single()
      
      if (error) throw error
      return transformDbToLink(data)
    },
    onSuccess: (data, { id }) => {
      queryClient.invalidateQueries({ queryKey: linkKeys.list(data.projectId) })
      queryClient.invalidateQueries({ queryKey: linkKeys.detail(id) })
      toast({
        title: 'Success',
        description: 'Link updated successfully',
      })
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to update link: ${error.message}`,
        variant: 'destructive',
      })
    },
  })
}

// Delete link (soft delete)
export const useDeleteLink = () => {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { user } = useUser()
  
  return useMutation({
    mutationFn: async ({ id, projectId }: { id: string; projectId: string }) => {
      const { error } = await supabase
        .from('links')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: user?.id,
        })
        .eq('id', id)
      
      if (error) throw error
      return projectId
    },
    onSuccess: (projectId) => {
      queryClient.invalidateQueries({ queryKey: linkKeys.list(projectId) })
      toast({
        title: 'Success',
        description: 'Link deleted successfully',
      })
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to delete link: ${error.message}`,
        variant: 'destructive',
      })
    },
  })
}
