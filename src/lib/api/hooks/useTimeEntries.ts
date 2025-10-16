import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import type { TimeEntry, CreateTimeEntryInput, UpdateTimeEntryInput } from '../types'

const timeEntryKeys = {
  all: ['time-entries'] as const,
  lists: () => [...timeEntryKeys.all, 'list'] as const,
  list: (filters: { projectId?: string; userId?: string }) => 
    [...timeEntryKeys.lists(), filters] as const,
  detail: (id: string) => [...timeEntryKeys.all, 'detail', id] as const,
  summary: (projectId?: string, userId?: string) => 
    [...timeEntryKeys.all, 'summary', { projectId, userId }] as const,
}

// Transform database row to TimeEntry type
const transformDbToTimeEntry = (data: any): TimeEntry => ({
  id: data.id,
  shortId: data.short_id,
  projectId: data.project_id,
  taskId: data.task_id,
  userId: data.user_id,
  durationHours: parseFloat(data.duration_hours),
  description: data.description,
  entryDate: data.entry_date,
  createdAt: data.created_at,
  updatedAt: data.updated_at,
  deletedAt: data.deleted_at,
})

// Get all time entries with optional filters
export const useTimeEntries = (projectId?: string, userId?: string) => {
  return useQuery({
    queryKey: timeEntryKeys.list({ projectId, userId }),
    queryFn: async () => {
      let query = supabase
        .from('time_entries')
        .select('*')
        .is('deleted_at', null)
        .order('entry_date', { ascending: false })
      
      if (projectId) {
        query = query.eq('project_id', projectId)
      }
      if (userId) {
        query = query.eq('user_id', userId)
      }
      
      const { data, error } = await query
      
      if (error) throw error
      return (data || []).map(transformDbToTimeEntry)
    },
  })
}

// Get single time entry
export const useTimeEntry = (id: string) => {
  return useQuery({
    queryKey: timeEntryKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('time_entries')
        .select('*')
        .eq('id', id)
        .is('deleted_at', null)
        .single()
      
      if (error) throw error
      return transformDbToTimeEntry(data)
    },
    enabled: !!id,
  })
}

// Get time summary (total hours)
export const useTimeEntrySummary = (projectId?: string, userId?: string) => {
  return useQuery({
    queryKey: timeEntryKeys.summary(projectId, userId),
    queryFn: async () => {
      let query = supabase
        .from('time_entries')
        .select('duration_hours')
        .is('deleted_at', null)
      
      if (projectId) {
        query = query.eq('project_id', projectId)
      }
      if (userId) {
        query = query.eq('user_id', userId)
      }
      
      const { data, error } = await query
      
      if (error) throw error
      
      const totalHours = (data || []).reduce(
        (sum, entry) => sum + (typeof entry.duration_hours === 'string' ? parseFloat(entry.duration_hours) : entry.duration_hours || 0),
        0
      )
      
      return { totalHours: Math.round(totalHours * 100) / 100 }
    },
  })
}

// Create time entry
export const useCreateTimeEntry = () => {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (input: CreateTimeEntryInput) => {
      const { data, error } = await supabase
        .from('time_entries')
        .insert([{
          project_id: input.projectId,
          task_id: input.taskId,
          user_id: input.userId,
          duration_hours: input.durationHours,
          description: input.description,
          entry_date: input.entryDate,
        }])
        .select()
        .single()
      
      if (error) throw error
      return transformDbToTimeEntry(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: timeEntryKeys.lists() })
      queryClient.invalidateQueries({ queryKey: timeEntryKeys.all })
      toast({
        title: 'Success',
        description: 'Time entry created successfully',
      })
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to create time entry: ${error.message}`,
        variant: 'destructive',
      })
    },
  })
}

// Update time entry
export const useUpdateTimeEntry = () => {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateTimeEntryInput }) => {
      const { data, error } = await supabase
        .from('time_entries')
        .update({
          duration_hours: input.durationHours,
          description: input.description,
          entry_date: input.entryDate,
          task_id: input.taskId,
        })
        .eq('id', id)
        .select()
        .single()
      
      if (error) throw error
      return transformDbToTimeEntry(data)
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: timeEntryKeys.lists() })
      queryClient.invalidateQueries({ queryKey: timeEntryKeys.detail(id) })
      queryClient.invalidateQueries({ queryKey: timeEntryKeys.all })
      toast({
        title: 'Success',
        description: 'Time entry updated successfully',
      })
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to update time entry: ${error.message}`,
        variant: 'destructive',
      })
    },
  })
}

// Delete time entry (soft delete)
export const useDeleteTimeEntry = () => {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('time_entries')
        .update({
          deleted_at: new Date().toISOString(),
        })
        .eq('id', id)
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: timeEntryKeys.lists() })
      queryClient.invalidateQueries({ queryKey: timeEntryKeys.all })
      toast({
        title: 'Success',
        description: 'Time entry deleted successfully',
      })
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to delete time entry: ${error.message}`,
        variant: 'destructive',
      })
    },
  })
}
