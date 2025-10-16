import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { CreateTaskInput, UpdateTaskInput, Task } from '../types'
import type { ListQuery } from '../transport'
import { useToast } from '@/hooks/use-toast'
import { handleApiError } from '../errors'
import { supabase } from '@/integrations/supabase/client'

// Query key factory for tasks
export const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  list: (projectId?: string, query?: ListQuery) => 
    [...taskKeys.lists(), projectId, query] as const,
  details: () => [...taskKeys.all, 'detail'] as const,
  detail: (id: string) => [...taskKeys.details(), id] as const,
}

// Transform database row to Task type
const transformTask = (row: any): Task => ({
  id: row.id,
  shortId: row.short_id,
  projectId: row.project_id,
  title: row.title,
  description: row.description,
  status: row.status,
  priority: row.priority,
  assignees: row.assignees || [],
  attachedFiles: row.attached_files || [],
  dueDate: row.due_date,
  estimatedTime: row.estimated_time,
  actualTime: row.actual_time,
  sortOrder: row.sort_order,
  createdBy: row.created_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  updatedBy: row.updated_by,
  deletedAt: row.deleted_at,
  deletedBy: row.deleted_by,
});

// Fetch tasks list (optionally filtered by project)
export const useTasks = (projectId?: string, query?: ListQuery) => {
  return useQuery({
    queryKey: taskKeys.list(projectId, query),
    queryFn: async () => {
      let queryBuilder = supabase
        .from('tasks')
        .select('*')
        .is('deleted_at', null)
        .order('sort_order', { ascending: true });
      
      if (projectId) {
        queryBuilder = queryBuilder.eq('project_id', projectId);
      }
      
      const { data, error } = await queryBuilder;
      
      if (error) throw error;
      return data.map(transformTask);
    },
  })
}

// Fetch single task
export const useTask = (id: string) => {
  return useQuery({
    queryKey: taskKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', id)
        .is('deleted_at', null)
        .single();
      
      if (error) throw error;
      return transformTask(data);
    },
    enabled: !!id,
  })
}

// Create task mutation
export const useCreateTask = (projectId?: string) => {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (input: CreateTaskInput) => {
      const { data: user } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          project_id: input.projectId,
          title: input.title,
          description: input.description,
          status: input.status || 'task_redline',
          priority: input.priority || 'medium',
          assignees: input.assignees || [],
          attached_files: input.attachedFiles || [],
          due_date: input.dueDate,
          estimated_time: input.estimatedTime,
          sort_order: input.sortOrder || 0,
          created_by: user.user?.id || '',
        })
        .select()
        .single();
      
      if (error) throw error;
      return transformTask(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.list(projectId) })
      toast({
        title: 'Task created',
        description: 'New task has been added',
      })
    },
    onError: (error) => {
      toast({
        title: 'Failed to create task',
        description: handleApiError(error),
        variant: 'destructive',
      })
    },
  })
}

// Update task mutation with optimistic updates
export const useUpdateTask = (projectId?: string) => {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateTaskInput }) => {
      const { data: user } = await supabase.auth.getUser();
      
      const updateData: any = {};
      if (input.title !== undefined) updateData.title = input.title;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.status !== undefined) updateData.status = input.status;
      if (input.priority !== undefined) updateData.priority = input.priority;
      if (input.assignees !== undefined) updateData.assignees = input.assignees;
      if (input.attachedFiles !== undefined) updateData.attached_files = input.attachedFiles;
      if (input.dueDate !== undefined) updateData.due_date = input.dueDate;
      if (input.estimatedTime !== undefined) updateData.estimated_time = input.estimatedTime;
      if (input.actualTime !== undefined) updateData.actual_time = input.actualTime;
      if (input.sortOrder !== undefined) updateData.sort_order = input.sortOrder;
      updateData.updated_by = user.user?.id;
      
      const { data, error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return transformTask(data);
    },
    // Optimistic update
    onMutate: async ({ id, input }) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.list(projectId) })
      
      const previousTasks = queryClient.getQueryData(taskKeys.list(projectId))
      
      queryClient.setQueryData(taskKeys.list(projectId), (old: any) => {
        if (!old) return old
        return old.map((task: any) => 
          task.id === id ? { ...task, ...input } : task
        )
      })

      return { previousTasks }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: taskKeys.list(projectId) })
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(variables.id) })
    },
    onError: (error, _, context: any) => {
      // Rollback on error
      if (context?.previousTasks) {
        queryClient.setQueryData(taskKeys.list(projectId), context.previousTasks)
      }
      toast({
        title: 'Failed to update task',
        description: handleApiError(error),
        variant: 'destructive',
      })
    },
  })
}

// Delete task mutation
export const useDeleteTask = (projectId?: string) => {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (id: string) => {
      const { data: user } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('tasks')
        .update({ 
          deleted_at: new Date().toISOString(),
          deleted_by: user.user?.id 
        })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: taskKeys.list(projectId) })
      toast({
        title: 'Task deleted',
        description: 'Task has been removed',
      })
    },
    onError: (error) => {
      toast({
        title: 'Failed to delete task',
        description: handleApiError(error),
        variant: 'destructive',
      })
    },
  })
}
