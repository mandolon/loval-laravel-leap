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
  project_type: row.project_type,
  ai_identity: row.ai_identity,
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
  metadata: row.metadata || {},
  createdBy: row.created_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  updatedBy: row.updated_by,
  deletedAt: row.deleted_at,
  deletedBy: row.deleted_by,
});

// Fetch projects list for a workspace
export const useProjects = (workspaceId: string, userId?: string, isAdmin?: boolean, query?: ListQuery) => {
  return useQuery({
    queryKey: projectKeys.list(workspaceId, query),
    queryFn: async () => {
      let data;
      let error;

      // Admin users see ALL projects
      if (isAdmin) {
        const result = await supabase
          .from('projects')
          .select('*')
          .eq('workspace_id', workspaceId)
          .is('deleted_at', null)
          .order('created_at', { ascending: false });
        
        data = result.data;
        error = result.error;
      } else if (userId) {
        // Non-admin users see only projects they're members of
        const result = await supabase
          .from('project_members')
          .select(`
            project_id,
            projects!inner (*)
          `)
          .eq('user_id', userId)
          .eq('projects.workspace_id', workspaceId)
          .is('deleted_at', null)
          .is('projects.deleted_at', null);
        
        error = result.error;
        // Extract projects and sort by created_at in JavaScript
        data = result.data?.map((pm: any) => pm.projects)
          .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) || [];
      } else {
        // If no userId provided, show all projects (fallback to admin behavior)
        const result = await supabase
          .from('projects')
          .select('*')
          .eq('workspace_id', workspaceId)
          .is('deleted_at', null)
          .order('created_at', { ascending: false });
        
        data = result.data;
        error = result.error;
      }
      
      if (error) throw error;
      
      // For each project, count unread project chat messages
      const projectsWithChatCounts = await Promise.all(
        (data || []).map(async (project) => {
          const { count } = await supabase
            .from('project_chat_messages')
            .select('*', { count: 'exact', head: true })
            .eq('project_id', project.id)
            .is('deleted_at', null);
          
          return {
            ...transformProject(project),
            unreadChatCount: count || 0
          };
        })
      );
      
      return projectsWithChatCounts;
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

  // Helper function to generate short_id in format P-[a-z0-9]{4}
  const generateProjectShortId = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const randomPart = Array.from({ length: 4 }, () => 
      chars[Math.floor(Math.random() * chars.length)]
    ).join('');
    return `P-${randomPart}`;
  };

  return useMutation({
    mutationFn: async (input: CreateProjectInput) => {
      const { data: authUser } = await supabase.auth.getUser();
      if (!authUser.user) throw new Error('Not authenticated');
      
      // Get user profile ID from users table
      const { data: userProfile, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', authUser.user.id)
        .single();
      
      if (userError || !userProfile) {
        throw new Error('User profile not found');
      }

      // Ensure address is always an object (required by schema)
      const addressData = input.address || {
        streetNumber: '',
        streetName: '',
        city: '',
        state: '',
        zipCode: '',
      };

      // Retry logic for short_id collisions (unlikely but possible)
      let attempts = 0;
      const maxAttempts = 5;
      let lastError: any = null;

      while (attempts < maxAttempts) {
        // Generate short_id
        const shortId = generateProjectShortId();
        
        const { data, error } = await supabase
          .from('projects')
          .insert({
            short_id: shortId,
            workspace_id: workspaceId,
            name: input.name,
            description: input.description,
            status: input.status || 'pending',
            phase: input.phase || 'Pre-Design',
            address: addressData,
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
            created_by: userProfile.id,
          })
          .select()
          .single();
        
        if (!error) {
          return transformProject(data);
        }

        // If it's a unique constraint violation (short_id collision), retry
        // Otherwise, throw the error immediately
        if (error.code === '23505' && attempts < maxAttempts - 1) {
          attempts++;
          lastError = error;
          continue;
        }

        throw error;
      }

      throw lastError || new Error('Failed to create project after multiple attempts');
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
      console.log('🔵 [useUpdateProject] Mutation called:', { id, input });
      
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { data: userProfile } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', userData.user.id)
        .single();

      if (!userProfile) throw new Error('User profile not found');
      
      const updateData: any = { updated_by: userProfile.id };
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
      if (input.metadata !== undefined) updateData.metadata = input.metadata;
      
      console.log('🔵 [useUpdateProject] Update data prepared:', updateData);
      
      const { data, error } = await supabase
        .from('projects')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      console.log('🔵 [useUpdateProject] Supabase response:', { data, error });
      
      if (error) throw error;
      return transformProject(data);
    },
    onSuccess: (data, variables) => {
      console.log('✅ [useUpdateProject] Mutation successful:', { data, variables });
      queryClient.invalidateQueries({ queryKey: projectKeys.list(workspaceId) })
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(variables.id) })
      // Toast removed - silent updates for background operations
    },
    onError: (error) => {
      console.error('❌ [useUpdateProject] Mutation failed:', error);
      toast({
        title: 'Failed to update project',
        description: handleApiError(error),
        variant: 'destructive',
      })
    },
  })
}

// Delete project mutation (soft delete)
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
        title: 'Project moved to trash',
        description: 'You can restore it from the Trash page',
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

// Restore project mutation (undo soft delete)
export const useRestoreProject = (workspaceId: string) => {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('projects')
        .update({ 
          deleted_at: null,
          deleted_by: null 
        })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.list(workspaceId) })
      toast({
        title: 'Project restored',
        description: 'Project has been restored successfully',
      })
    },
    onError: (error) => {
      toast({
        title: 'Failed to restore project',
        description: handleApiError(error),
        variant: 'destructive',
      })
    },
  })
}

// Hard delete project mutation (permanent deletion)
export const useHardDeleteProject = (workspaceId: string) => {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (id: string) => {
      // 1. Get files associated with project
      const { data: files } = await supabase
        .from('files')
        .select('storage_path')
        .eq('project_id', id);
      
      // 2. Delete files from storage
      if (files && files.length > 0) {
        const filePaths = files.map(f => f.storage_path);
        await supabase.storage
          .from('task-files')
          .remove(filePaths);
      }
      
      // 3. Hard delete project (cascades via foreign keys)
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.list(workspaceId) })
      toast({
        title: 'Project permanently deleted',
        description: 'Project and all related data have been removed',
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
