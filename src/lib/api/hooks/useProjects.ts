import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../client'
import type { CreateProjectInput, UpdateProjectInput } from '../types'
import type { ListQuery } from '../transport'
import { useToast } from '@/hooks/use-toast'
import { handleApiError } from '../errors'

// Query key factory for projects
export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  list: (workspaceId: string, query?: ListQuery) => 
    [...projectKeys.lists(), workspaceId, query] as const,
  details: () => [...projectKeys.all, 'detail'] as const,
  detail: (id: string) => [...projectKeys.details(), id] as const,
}

// Fetch projects list for a workspace
export const useProjects = (workspaceId: string, query?: ListQuery) => {
  return useQuery({
    queryKey: projectKeys.list(workspaceId, query),
    queryFn: () => Promise.resolve(api.projects.list(workspaceId)),
    enabled: !!workspaceId,
  })
}

// Fetch single project
export const useProject = (id: string) => {
  return useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: () => Promise.resolve(api.projects.get(id)),
    enabled: !!id,
  })
}

// Create project mutation
export const useCreateProject = (workspaceId: string) => {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (input: CreateProjectInput) => 
      Promise.resolve(api.projects.create({ ...input, workspaceId })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.list(workspaceId) })
      toast({
        title: 'Project created',
        description: 'New project has been added successfully',
      })
    },
    onError: (error) => {
      toast({
        title: 'Failed to create project',
        description: handleApiError(error),
        variant: 'destructive',
      })
    },
  })
}

// Update project mutation
export const useUpdateProject = (workspaceId: string) => {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateProjectInput }) =>
      Promise.resolve(api.projects.update(id, input)),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.list(workspaceId) })
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(variables.id) })
      toast({
        title: 'Project updated',
        description: 'Changes have been saved',
      })
    },
    onError: (error) => {
      toast({
        title: 'Failed to update project',
        description: handleApiError(error),
        variant: 'destructive',
      })
    },
  })
}

// Delete project mutation
export const useDeleteProject = (workspaceId: string) => {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (id: string) => Promise.resolve(api.projects.delete(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.list(workspaceId) })
      toast({
        title: 'Project deleted',
        description: 'Project has been removed',
      })
    },
    onError: (error) => {
      toast({
        title: 'Failed to delete project',
        description: handleApiError(error),
        variant: 'destructive',
      })
    },
  })
}
