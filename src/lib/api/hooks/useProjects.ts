import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { CreateProjectInput, UpdateProjectInput, Project } from '../types'
import type { ListQuery } from '../transport'
import { useToast } from '@/hooks/use-toast'
import { handleApiError } from '../errors'
import { supabase } from '@/integrations/supabase/client'

// Query key factory for projects
export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  list: (workspaceId: string, query?: ListQuery) => 
    [...projectKeys.lists(), workspaceId, query] as const,
  details: () => [...projectKeys.all, 'detail'] as const,
  detail: (id: string) => [...projectKeys.details(), id] as const,
}

// Transform database row to Project type
const transformProject = (row: any): Project => ({
  id: row.id,
  shortId: row.short_id,
  workspaceId: row.workspace_id,
  name: row.name,
  description: row.description,
  status: row.status,
  phase: row.phase,
  address: row.address || {},
  primaryClient: {
    firstName: row.primary_client_first_name,
    lastName: row.primary_client_last_name,
    email: row.primary_client_email,
    phone: row.primary_client_phone,
    address: row.primary_client_address,
  },
  secondaryClient: row.secondary_client_first_name ? {
    firstName: row.secondary_client_first_name,
    lastName: row.secondary_client_last_name,
    email: row.secondary_client_email,
    phone: row.secondary_client_phone,
    address: row.secondary_client_address,
  } : undefined,
  assessorParcelInfo: row.assessor_parcel_info || {},
  estimatedAmount: row.estimated_amount,
  dueDate: row.due_date,
  progress: row.progress,
  totalTasks: row.total_tasks,
  completedTasks: row.completed_tasks,
  teamMemberCount: row.team_member_count,
  createdBy: row.created_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  updatedBy: row.updated_by,
  deletedAt: row.deleted_at,
  deletedBy: row.deleted_by,
});

// Fetch projects list for a workspace
export const useProjects = (workspaceId: string, query?: ListQuery) => {
  return useQuery({
    queryKey: projectKeys.list(workspaceId, query),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('workspace_id', workspaceId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data.map(transformProject);
    },
    enabled: !!workspaceId,
  })
}

// Fetch single project
export const useProject = (id: string) => {
  return useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .is('deleted_at', null)
        .single();
      
      if (error) throw error;
      return transformProject(data);
    },
    enabled: !!id,
  })
}

// Create project mutation
export const useCreateProject = (workspaceId: string) => {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (input: CreateProjectInput) => {
      const { data: user } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('projects')
        .insert({
          workspace_id: workspaceId,
          name: input.name,
          description: input.description,
          status: input.status || 'pending',
          phase: input.phase || 'Pre-Design',
          address: input.address,
          primary_client_first_name: input.primaryClient.firstName,
          primary_client_last_name: input.primaryClient.lastName,
          primary_client_email: input.primaryClient.email,
          primary_client_phone: input.primaryClient.phone,
          secondary_client_first_name: input.secondaryClient?.firstName,
          secondary_client_last_name: input.secondaryClient?.lastName,
          secondary_client_email: input.secondaryClient?.email,
          secondary_client_phone: input.secondaryClient?.phone,
          estimated_amount: input.estimatedAmount,
          due_date: input.dueDate,
          created_by: user.user?.id || '',
        })
        .select()
        .single();
      
      if (error) throw error;
      return transformProject(data);
    },
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
    mutationFn: async ({ id, input }: { id: string; input: UpdateProjectInput }) => {
      const { data: user } = await supabase.auth.getUser();
      
      const updateData: any = { updated_by: user.user?.id };
      if (input.name !== undefined) updateData.name = input.name;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.status !== undefined) updateData.status = input.status;
      if (input.phase !== undefined) updateData.phase = input.phase;
      if (input.address !== undefined) updateData.address = input.address;
      if (input.assessorParcelInfo !== undefined) updateData.assessor_parcel_info = input.assessorParcelInfo;
      if (input.primaryClient) {
        if (input.primaryClient.firstName !== undefined) updateData.primary_client_first_name = input.primaryClient.firstName;
        if (input.primaryClient.lastName !== undefined) updateData.primary_client_last_name = input.primaryClient.lastName;
        if (input.primaryClient.email !== undefined) updateData.primary_client_email = input.primaryClient.email;
        if (input.primaryClient.phone !== undefined) updateData.primary_client_phone = input.primaryClient.phone;
      }
      if (input.secondaryClient) {
        if (input.secondaryClient.firstName !== undefined) updateData.secondary_client_first_name = input.secondaryClient.firstName;
        if (input.secondaryClient.lastName !== undefined) updateData.secondary_client_last_name = input.secondaryClient.lastName;
        if (input.secondaryClient.email !== undefined) updateData.secondary_client_email = input.secondaryClient.email;
        if (input.secondaryClient.phone !== undefined) updateData.secondary_client_phone = input.secondaryClient.phone;
      }
      if (input.estimatedAmount !== undefined) updateData.estimated_amount = input.estimatedAmount;
      if (input.dueDate !== undefined) updateData.due_date = input.dueDate;
      if (input.progress !== undefined) updateData.progress = input.progress;
      
      const { data, error } = await supabase
        .from('projects')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return transformProject(data);
    },
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
    mutationFn: async (id: string) => {
      const { data: user } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('projects')
        .update({ 
          deleted_at: new Date().toISOString(),
          deleted_by: user.user?.id 
        })
        .eq('id', id);
      
      if (error) throw error;
    },
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
