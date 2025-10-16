import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../client'
import type { CreateTaskInput, UpdateTaskInput } from '../types'
import type { ListQuery } from '../transport'
import { useToast } from '@/hooks/use-toast'
import { handleApiError } from '../errors'

// Query key factory for tasks
export const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  list: (projectId?: string, query?: ListQuery) => 
    [...taskKeys.lists(), projectId, query] as const,
  details: () => [...taskKeys.all, 'detail'] as const,
  detail: (id: string) => [...taskKeys.details(), id] as const,
}

// Fetch tasks list (optionally filtered by project)
export const useTasks = (projectId?: string, query?: ListQuery) => {
  return useQuery({
    queryKey: taskKeys.list(projectId, query),
    queryFn: () => Promise.resolve(api.tasks.list(projectId)),
  })
}

// Fetch single task
export const useTask = (id: string) => {
  return useQuery({
    queryKey: taskKeys.detail(id),
    queryFn: () => Promise.resolve(api.tasks.get(id)),
    enabled: !!id,
  })
}

// Create task mutation
export const useCreateTask = (projectId?: string) => {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (input: CreateTaskInput) => Promise.resolve(api.tasks.create(input)),
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
    mutationFn: ({ id, input }: { id: string; input: UpdateTaskInput }) =>
      Promise.resolve(api.tasks.update(id, input)),
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
    mutationFn: (id: string) => Promise.resolve(api.tasks.delete(id)),
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
