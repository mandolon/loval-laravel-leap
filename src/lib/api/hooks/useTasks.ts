import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { CreateTaskInput, UpdateTaskInput, Task } from '../types'
import type { ListQuery } from '../transport'
import { useToast } from '@/hooks/use-toast'
import { handleApiError } from '../errors'
import { supabase } from '@/integrations/supabase/client'

// Query key factory for tasks with workspace support
export const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  list: (projectId?: string, query?: ListQuery) => 
    [...taskKeys.lists(), projectId, query] as const,
  workspace: (workspaceId: string) => [...taskKeys.lists(), 'workspace', workspaceId] as const,
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

// Fetch all tasks for a workspace (across all projects)
export const useWorkspaceTasks = (workspaceId: string) => {
  return useQuery({
    queryKey: taskKeys.workspace(workspaceId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          projects!inner(workspace_id)
        `)
        .eq('projects.workspace_id', workspaceId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data.map(transformTask);
    },
    enabled: !!workspaceId,
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
      const { data: userData } = await supabase.auth.getUser();
      
      const { data: userProfile } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', userData.user!.id)
        .single();
      
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
          created_by: userProfile!.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return transformTask(data);
    },
    onSuccess: async (task) => {
      // Get workspace_id and user for history logging
      const { data: project } = await supabase
        .from('projects')
        .select('workspace_id')
        .eq('id', task.projectId)
        .single();
      
      const { data: userData } = await supabase.auth.getUser();
      const { data: userProfile } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', userData.user!.id)
        .single();
      
      // Regenerate current state + append to history
      supabase.functions.invoke('sync-project-tasks', {
        body: { 
          projectId: task.projectId, 
          action: 'regenerate',
          userId: userProfile?.id 
        }
      }).catch(err => console.error('Failed to regenerate tasks:', err));
      
      supabase.functions.invoke('sync-project-tasks', {
        body: {
          projectId: task.projectId,
          action: 'log_change',
          task: task,
          actionType: 'CREATED',
          userId: userProfile?.id
        }
      }).catch(err => console.error('Failed to log task history:', err));
      
      // Invalidate both project and workspace queries
      queryClient.invalidateQueries({ queryKey: taskKeys.list(projectId) })
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() })
      if (project) {
        queryClient.invalidateQueries({ queryKey: taskKeys.workspace(project.workspace_id) })
      }
      
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
      const { data: userData } = await supabase.auth.getUser();
      const { data: userProfile } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', userData.user!.id)
        .single();
      
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
      if (userProfile?.id) updateData.updated_by = userProfile.id;
      
      const { data, error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return transformTask(data);
    },
    // Optimistic update - update all relevant query keys
    onMutate: async ({ id, input }) => {
      // Store previous values for all affected queries
      const previousQueries: Array<{ key: readonly unknown[], data: any }> = []
      
      // Update workspace queries immediately (most common case)
      const queryCache = queryClient.getQueryCache()
      const workspaceQueries = queryCache.findAll({ 
        queryKey: taskKeys.lists(),
        exact: false 
      })
      
      workspaceQueries.forEach((query) => {
        const queryKey = query.queryKey
        // Check if this is a workspace query
        if (queryKey.includes('workspace')) {
          const previousData = queryClient.getQueryData(queryKey)
          previousQueries.push({ key: queryKey, data: previousData })
          queryClient.setQueryData(queryKey, (old: any) => {
            if (!old) return old
            return old.map((task: any) => 
              task.id === id ? { ...task, ...input } : task
            )
          })
        }
      })
      
      // Update project-specific query if projectId is provided
      if (projectId) {
        const queryKey = taskKeys.list(projectId)
        const previousData = queryClient.getQueryData(queryKey)
        previousQueries.push({ key: queryKey, data: previousData })
        queryClient.setQueryData(queryKey, (old: any) => {
          if (!old) return old
          return old.map((task: any) => 
            task.id === id ? { ...task, ...input } : task
          )
        })
      }
      
      // Update detail query if it exists
      const detailQueryKey = taskKeys.detail(id)
      const previousDetailData = queryClient.getQueryData(detailQueryKey)
      previousQueries.push({ key: detailQueryKey, data: previousDetailData })
      queryClient.setQueryData(detailQueryKey, (old: any) => {
        if (!old) return old
        return { ...old, ...input }
      })
      
      // Cancel queries after updating to prevent race conditions (fire and forget)
      queryClient.cancelQueries({ queryKey: taskKeys.all }).catch(() => {})

      return { previousQueries }
    },
    onSuccess: async (task, variables) => {
      // Get workspace_id and user for history logging
      const { data: project } = await supabase
        .from('projects')
        .select('workspace_id')
        .eq('id', task.projectId)
        .single();
      
      const { data: userData } = await supabase.auth.getUser();
      const { data: userProfile } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', userData.user!.id)
        .single();
      
      // Detect changes for history
      const changes: any[] = [];
      const input = variables.input;
      if (input.status !== undefined) changes.push({ field: 'status', oldValue: 'previous', newValue: input.status });
      if (input.priority !== undefined) changes.push({ field: 'priority', oldValue: 'previous', newValue: input.priority });
      if (input.title !== undefined) changes.push({ field: 'title', oldValue: 'previous', newValue: input.title });
      
      // Regenerate current state + append to history
      supabase.functions.invoke('sync-project-tasks', {
        body: { 
          projectId: task.projectId, 
          action: 'regenerate',
          userId: userProfile?.id 
        }
      }).catch(err => console.error('Failed to regenerate tasks:', err));
      
      if (changes.length > 0) {
        const actionType = input.status === 'done_completed' ? 'COMPLETED' : 'UPDATED';
        supabase.functions.invoke('sync-project-tasks', {
          body: {
            projectId: task.projectId,
            action: 'log_change',
            task: task,
            actionType: actionType,
            userId: userProfile?.id,
            changes
          }
        }).catch(err => console.error('Failed to log task history:', err));
      }
      
      // Invalidate both project and workspace queries
      queryClient.invalidateQueries({ queryKey: taskKeys.list(projectId) })
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() })
      queryClient.invalidateQueries({ queryKey: taskKeys.detail(variables.id) })
      if (project) {
        queryClient.invalidateQueries({ queryKey: taskKeys.workspace(project.workspace_id) })
      }
    },
    onError: (error, _, context: any) => {
      // Rollback all queries on error
      if (context?.previousQueries) {
        context.previousQueries.forEach(({ key, data }: { key: readonly unknown[], data: any }) => {
          if (data !== undefined) {
            queryClient.setQueryData(key, data)
          }
        })
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
    onSuccess: async (_, taskId) => {
      // Get task's project to find workspace_id
      const { data: task } = await supabase
        .from('tasks')
        .select('*, project_id')
        .eq('id', taskId)
        .single();
      
      if (task) {
        const { data: project } = await supabase
          .from('projects')
          .select('workspace_id')
          .eq('id', task.project_id)
          .single();
        
        const { data: userData } = await supabase.auth.getUser();
        const { data: userProfile } = await supabase
          .from('users')
          .select('id')
          .eq('auth_id', userData.user!.id)
          .single();
        
        // Regenerate current state + append to history
        supabase.functions.invoke('sync-project-tasks', {
          body: { 
            projectId: task.project_id, 
            action: 'regenerate',
            userId: userProfile?.id 
          }
        }).catch(err => console.error('Failed to regenerate tasks:', err));
        
        supabase.functions.invoke('sync-project-tasks', {
          body: {
            projectId: task.project_id,
            action: 'log_change',
            task: task,
            actionType: 'DELETED',
            userId: userProfile?.id
          }
        }).catch(err => console.error('Failed to log task history:', err));
        
        // Invalidate both project and workspace queries
        queryClient.invalidateQueries({ queryKey: taskKeys.list(projectId) })
        queryClient.invalidateQueries({ queryKey: taskKeys.lists() })
        if (project) {
          queryClient.invalidateQueries({ queryKey: taskKeys.workspace(project.workspace_id) })
        }
      }
      
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
