import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { CalendarEvent, CreateCalendarEventInput, UpdateCalendarEventInput } from '../types';
import { useToast } from '@/hooks/use-toast';
import { handleApiError } from '../errors';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

// Query key factory for calendar events with workspace support
export const calendarEventKeys = {
  all: ['calendarEvents'] as const,
  lists: () => [...calendarEventKeys.all, 'list'] as const,
  workspace: (workspaceId: string) => [...calendarEventKeys.lists(), 'workspace', workspaceId] as const,
  details: () => [...calendarEventKeys.all, 'detail'] as const,
  detail: (id: string) => [...calendarEventKeys.details(), id] as const,
};

// Transform database row to CalendarEvent type
const transformCalendarEvent = (row: any): CalendarEvent => {
  return {
    id: row.id,
    shortId: row.short_id,
    title: row.title,
    description: row.description,
    eventType: row.event_type,
    createdByUserId: row.created_by_user_id,
    projectId: row.project_id,
    workspaceId: row.workspace_id,
    eventDate: row.event_date,
    eventTime: row.event_time,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
    deletedAt: row.deleted_at,
    deletedBy: row.deleted_by,
  };
};

// Fetch all calendar events for a workspace
export const useWorkspaceCalendarEvents = (workspaceId: string) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: calendarEventKeys.workspace(workspaceId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('workspace_id', workspaceId)
        .is('deleted_at', null)
        .order('event_date', { ascending: true });

      if (error) throw error;
      return data.map(transformCalendarEvent);
    },
    enabled: !!workspaceId,
  });

  // Set up realtime subscription for instant updates
  useEffect(() => {
    if (!workspaceId) return;

    const channel = supabase
      .channel(`calendar_events:workspace:${workspaceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'calendar_events',
          filter: `workspace_id=eq.${workspaceId}`,
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: calendarEventKeys.workspace(workspaceId) });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workspaceId, queryClient]);

  return query;
};

// Get a single calendar event by ID
export const useCalendarEvent = (id: string) => {
  return useQuery({
    queryKey: calendarEventKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('id', id)
        .is('deleted_at', null)
        .single();

      if (error) throw error;
      return transformCalendarEvent(data);
    },
    enabled: !!id,
  });
};

// Create a new calendar event
export const useCreateCalendarEvent = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: CreateCalendarEventInput) => {
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
        .from('calendar_events')
        .insert({
          title: input.title,
          description: input.description || null,
          event_type: input.eventType,
          project_id: input.projectId || null,
          workspace_id: input.workspaceId,
          event_date: input.eventDate,
          event_time: input.eventTime || null,
          created_by_user_id: userRecord.id,
        })
        .select()
        .single();

      if (error) throw error;
      return transformCalendarEvent(data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: calendarEventKeys.workspace(data.workspaceId) });
      toast({
        title: 'Event created',
        description: 'Your calendar event has been created successfully.',
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

// Update an existing calendar event
export const useUpdateCalendarEvent = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateCalendarEventInput }) => {
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
      if (data.description !== undefined) updateData.description = data.description;
      if (data.eventType !== undefined) updateData.event_type = data.eventType;
      if (data.projectId !== undefined) updateData.project_id = data.projectId;
      if (data.eventDate !== undefined) updateData.event_date = data.eventDate;
      if (data.eventTime !== undefined) updateData.event_time = data.eventTime;

      const { data: result, error } = await supabase
        .from('calendar_events')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return transformCalendarEvent(result);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: calendarEventKeys.workspace(data.workspaceId) });
      queryClient.invalidateQueries({ queryKey: calendarEventKeys.detail(data.id) });
      toast({
        title: 'Event updated',
        description: 'The calendar event has been updated successfully.',
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

// Delete a calendar event (hard delete - permanently removes from database)
export const useDeleteCalendarEvent = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      // First get the event to know the workspace ID for cache invalidation
      const { data: event, error: fetchError } = await supabase
        .from('calendar_events')
        .select('workspace_id')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // Hard delete the event from the database
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', id);

      if (error) throw error;

      return { id, workspaceId: event.workspace_id };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: calendarEventKeys.workspace(data.workspaceId) });
      toast({
        title: 'Event deleted',
        description: 'The calendar event has been permanently deleted.',
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
