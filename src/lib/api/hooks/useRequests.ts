import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Request, CreateRequestInput, UpdateRequestInput } from '../types';
import { useToast } from '@/hooks/use-toast';
import { handleApiError } from '../errors';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

// Query key factory for requests with workspace support
export const requestKeys = {
  all: ['requests'] as const,
  lists: () => [...requestKeys.all, 'list'] as const,
  workspace: (workspaceId: string) => [...requestKeys.lists(), 'workspace', workspaceId] as const,
  details: () => [...requestKeys.all, 'detail'] as const,
  detail: (id: string) => [...requestKeys.details(), id] as const,
};

// Transform database row to Request type
const transformRequest = (row: any): Request => {
  return {
    id: row.id,
    shortId: row.short_id,
    title: row.title,
    body: row.body,
    createdByUserId: row.created_by_user_id,
    assignedToUserId: row.assigned_to_user_id,
    projectId: row.project_id,
    workspaceId: row.workspace_id,
    status: row.status,
    respondBy: row.respond_by,
    isUnread: row.is_unread ?? false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
    deletedAt: row.deleted_at,
    deletedBy: row.deleted_by,
  };
};

// Fetch all requests for a workspace
export const useWorkspaceRequests = (workspaceId: string) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: requestKeys.workspace(workspaceId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('requests')
        .select('*')
        .eq('workspace_id', workspaceId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data.map(transformRequest);
    },
    enabled: !!workspaceId,
  });

  // Set up realtime subscription for instant updates
  useEffect(() => {
    if (!workspaceId) return;

    const channel = supabase
      .channel(`requests:workspace:${workspaceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'requests',
          filter: `workspace_id=eq.${workspaceId}`,
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: requestKeys.workspace(workspaceId) });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workspaceId, queryClient]);

  return query;
};

// Get a single request by ID
export const useRequest = (id: string) => {
  return useQuery({
    queryKey: requestKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('requests')
        .select('*')
        .eq('id', id)
        .is('deleted_at', null)
        .single();

      if (error) throw error;
      return transformRequest(data);
    },
    enabled: !!id,
  });
};

// Create a new request
export const useCreateRequest = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: CreateRequestInput) => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw new Error('Not authenticated');

      // Get the user's internal ID from their auth ID
      const { data: userRecord, error: userRecordError } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', userData.user.id)
        .single();

      if (userRecordError || !userRecord) throw new Error('User not found');

      const { data, error } = await supabase
        .from('requests')
        .insert({
          title: input.title,
          body: input.body,
          assigned_to_user_id: input.assignedToUserId,
          project_id: input.projectId || null,
          workspace_id: input.workspaceId,
          respond_by: input.respondBy || null,
          created_by_user_id: userRecord.id,
          is_unread: true,
          status: 'open',
        })
        .select()
        .single();

      if (error) throw error;
      return transformRequest(data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: requestKeys.workspace(data.workspaceId) });
      toast({
        title: 'Request sent',
        description: 'Your request has been sent successfully.',
      });
    },
    onError: (error) => {
      const errorMessage = handleApiError(error);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    },
  });
};

// Update an existing request
export const useUpdateRequest = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateRequestInput }) => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw new Error('Not authenticated');

      // Get the user's internal ID from their auth ID
      const { data: userRecord, error: userRecordError } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', userData.user.id)
        .single();

      if (userRecordError || !userRecord) throw new Error('User not found');

      const updateData: any = {
        updated_by: userRecord.id,
      };

      if (data.title !== undefined) updateData.title = data.title;
      if (data.body !== undefined) updateData.body = data.body;
      if (data.assignedToUserId !== undefined) updateData.assigned_to_user_id = data.assignedToUserId;
      if (data.projectId !== undefined) updateData.project_id = data.projectId;
      if (data.respondBy !== undefined) updateData.respond_by = data.respondBy;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.isUnread !== undefined) updateData.is_unread = data.isUnread;

      const { data: result, error } = await supabase
        .from('requests')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return transformRequest(result);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: requestKeys.workspace(data.workspaceId) });
      queryClient.invalidateQueries({ queryKey: requestKeys.detail(data.id) });
      toast({
        title: 'Request updated',
        description: 'The request has been updated successfully.',
      });
    },
    onError: (error) => {
      const errorMessage = handleApiError(error);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    },
  });
};

// Delete a request (hard delete - permanently removes from database)
export const useDeleteRequest = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      // First get the request to know the workspace ID for cache invalidation
      const { data: request, error: fetchError } = await supabase
        .from('requests')
        .select('workspace_id')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // Hard delete the request from the database
      const { error } = await supabase
        .from('requests')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      return { id, workspaceId: request.workspace_id };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: requestKeys.workspace(data.workspaceId) });
      toast({
        title: 'Request deleted',
        description: 'The request has been permanently deleted.',
      });
    },
    onError: (error) => {
      const errorMessage = handleApiError(error);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    },
  });
};
