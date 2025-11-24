import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import type { Notification } from '../types'

const notificationKeys = {
  all: ['notifications'] as const,
  lists: () => [...notificationKeys.all, 'list'] as const,
  list: (userId: string) => [...notificationKeys.lists(), userId] as const,
  unreadCount: (userId: string) => [...notificationKeys.all, 'unread-count', userId] as const,
}

// Transform database row to Notification type
const transformDbToNotification = (data: any): Notification => ({
  id: data.id,
  shortId: data.short_id,
  userId: data.user_id,
  workspaceId: data.workspace_id,
  projectId: data.project_id,
  type: data.type,
  title: data.title,
  content: data.content,
  isRead: data.is_read,
  readAt: data.read_at,
  actionUrl: data.action_url,
  metadata: data.metadata,
  createdAt: data.created_at,
})

// Get all notifications for a user
export const useNotifications = (userId: string) => {
  const queryClient = useQueryClient()
  
  const query = useQuery({
    queryKey: notificationKeys.list(userId),
    queryFn: async () => {
      // First, process any pending task notifications older than 4 minutes
      try {
        await supabase.rpc('process_pending_task_notifications');
      } catch (err) {
        console.warn('Failed to process pending task notifications:', err);
        // Continue even if this fails - we'll still get existing notifications
      }

      // Then fetch all notifications
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return (data || []).map(transformDbToNotification)
    },
    enabled: !!userId,
  })

  // Setup real-time subscription
  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('Notification change:', payload)
          // Invalidate and refetch notifications when changes occur
          queryClient.invalidateQueries({ queryKey: notificationKeys.list(userId) })
          queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount(userId) })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, queryClient])

  return query
}

// Get unread count
export const useUnreadCount = (userId: string) => {
  return useQuery({
    queryKey: notificationKeys.unreadCount(userId),
    queryFn: async () => {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false)
      
      if (error) throw error
      return count || 0
    },
    enabled: !!userId,
    refetchInterval: 30000, // Refetch every 30 seconds
  })
}

// Mark notification as read
export const useMarkAsRead = () => {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, userId }: { id: string; userId: string }) => {
      const { error } = await supabase
        .from('notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('id', id)
      
      if (error) throw error
      return userId
    },
    onSuccess: (userId) => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.list(userId) })
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount(userId) })
    },
  })
}

// Mark all notifications as read
export const useMarkAllAsRead = () => {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('is_read', false)
      
      if (error) throw error
      return userId
    },
    onSuccess: (userId) => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.list(userId) })
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount(userId) })
      toast({
        title: 'Success',
        description: 'All notifications marked as read',
      })
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to mark notifications as read: ${error.message}`,
        variant: 'destructive',
      })
    },
  })
}

// Delete notification
export const useDeleteNotification = () => {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, userId }: { id: string; userId: string }) => {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      return userId
    },
    onSuccess: (userId) => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.list(userId) })
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount(userId) })
      toast({
        title: 'Success',
        description: 'Notification deleted successfully',
      })
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to delete notification: ${error.message}`,
        variant: 'destructive',
      })
    },
  })
}
