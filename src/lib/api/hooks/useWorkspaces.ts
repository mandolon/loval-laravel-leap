import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../client'
import type { CreateWorkspaceInput, UpdateWorkspaceInput } from '../types'
import { useToast } from '@/hooks/use-toast'
import { handleApiError } from '../errors'
import { supabase } from '@/integrations/supabase/client'

// Query key factory for workspaces
export const workspaceKeys = {
  all: ['workspaces'] as const,
  lists: () => [...workspaceKeys.all, 'list'] as const,
  list: () => [...workspaceKeys.lists()] as const,
  details: () => [...workspaceKeys.all, 'detail'] as const,
  detail: (id: string) => [...workspaceKeys.details(), id] as const,
  current: () => [...workspaceKeys.all, 'current'] as const,
}

// Fetch workspaces list
export const useWorkspaces = () => {
  return useQuery({
    queryKey: workspaceKeys.list(),
    queryFn: () => Promise.resolve(api.workspaces.list()),
  })
}

// Fetch single workspace
export const useWorkspace = (id: string) => {
  return useQuery({
    queryKey: workspaceKeys.detail(id),
    queryFn: () => Promise.resolve(api.workspaces.get(id)),
    enabled: !!id,
  })
}

// Get current workspace ID
export const useCurrentWorkspaceId = () => {
  return useQuery({
    queryKey: workspaceKeys.current(),
    queryFn: () => Promise.resolve(api.workspaces.getCurrentWorkspaceId()),
  })
}

// Create workspace mutation
export const useCreateWorkspace = () => {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (input: CreateWorkspaceInput) => Promise.resolve(api.workspaces.create(input)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.list() })
      toast({
        title: 'Workspace created',
        description: 'New workspace has been added',
      })
    },
    onError: (error) => {
      toast({
        title: 'Failed to create workspace',
        description: handleApiError(error),
        variant: 'destructive',
      })
    },
  })
}

// Update workspace mutation
export const useUpdateWorkspace = () => {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateWorkspaceInput }) =>
      Promise.resolve(api.workspaces.update(id, input)),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.list() })
      queryClient.invalidateQueries({ queryKey: workspaceKeys.detail(variables.id) })
      toast({
        title: 'Workspace updated',
        description: 'Changes have been saved',
      })
    },
    onError: (error) => {
      toast({
        title: 'Failed to update workspace',
        description: handleApiError(error),
        variant: 'destructive',
      })
    },
  })
}

// Delete workspace mutation
export const useDeleteWorkspace = () => {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: (id: string) => Promise.resolve(api.workspaces.delete(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.list() })
      toast({
        title: 'Workspace deleted',
        description: 'Workspace has been removed',
      })
    },
    onError: (error) => {
      toast({
        title: 'Failed to delete workspace',
        description: handleApiError(error),
        variant: 'destructive',
      })
    },
  })
}

// Set current workspace
export const useSetCurrentWorkspace = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => {
      api.workspaces.setCurrentWorkspaceId(id)
      return Promise.resolve()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.current() })
    },
  })
}

// Fetch all workspaces (for admin assignment UI)
export const useAllWorkspaces = () => {
  return useQuery({
    queryKey: ['workspaces', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workspaces')
        .select('id, name')
        .order('name');

      if (error) throw error;
      return data;
    },
  });
};
