import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

export interface Note {
  id: string
  shortId: string
  projectId: string
  title: string
  content: string
  createdBy: string
  createdAt: string
  updatedAt: string
  updatedBy?: string
  deletedAt?: string
  deletedBy?: string
}

const noteKeys = {
  all: ['notes'] as const,
  lists: () => [...noteKeys.all, 'list'] as const,
  list: (projectId: string) => [...noteKeys.lists(), projectId] as const,
  details: () => [...noteKeys.all, 'detail'] as const,
  detail: (id: string) => [...noteKeys.details(), id] as const,
}

const transformDbToNote = (data: any): Note => ({
  id: data.id,
  shortId: data.short_id,
  projectId: data.project_id,
  title: data.title,
  content: data.content,
  createdBy: data.created_by,
  createdAt: data.created_at,
  updatedAt: data.updated_at,
  updatedBy: data.updated_by,
  deletedAt: data.deleted_at,
  deletedBy: data.deleted_by,
})

// Get all notes for a project
export const useNotes = (projectId: string) => {
  return useQuery({
    queryKey: noteKeys.list(projectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data.map(transformDbToNote)
    },
    enabled: !!projectId,
  })
}

// Create note
export const useCreateNote = (projectId: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { title: string; content: string }) => {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('Not authenticated')

      const { data: userProfile } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', userData.user.id)
        .single()

      if (!userProfile) throw new Error('User profile not found')

      const { data, error } = await supabase
        .from('notes')
        .insert({
          project_id: projectId,
          title: input.title,
          content: input.content,
          created_by: userProfile.id,
        })
        .select()
        .single()

      if (error) throw error
      return transformDbToNote(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: noteKeys.list(projectId) })
    },
    onError: (error) => {
      console.error('Failed to create note:', error)
    },
  })
}

// Update note
export const useUpdateNote = (projectId: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, content, title }: { id: string; content?: string; title?: string }) => {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('Not authenticated')

      const { data: userProfile } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', userData.user.id)
        .single()

      if (!userProfile) throw new Error('User profile not found')

      const updateData: any = {
        updated_by: userProfile.id,
        updated_at: new Date().toISOString(),
      };
      if (content !== undefined) updateData.content = content;
      if (title !== undefined) updateData.title = title;

      const { data, error } = await supabase
        .from('notes')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return transformDbToNote(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: noteKeys.list(projectId) })
    },
    onError: (error) => {
      console.error('Failed to update note:', error)
    },
  })
}

// Delete note (soft delete)
export const useDeleteNote = (projectId: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('Not authenticated')

      const { data: userProfile } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', userData.user.id)
        .single()

      if (!userProfile) throw new Error('User profile not found')

      const { error } = await supabase
        .from('notes')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: userProfile.id,
        })
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: noteKeys.list(projectId) })
      toast.success('Note deleted')
    },
    onError: (error) => {
      console.error('Failed to delete note:', error)
      toast.error('Failed to delete note')
    },
  })
}
