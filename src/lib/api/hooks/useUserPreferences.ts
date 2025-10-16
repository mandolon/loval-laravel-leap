import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import type { UserPreferences, UpdateUserPreferencesInput } from '../types'

const userPreferencesKeys = {
  all: ['user-preferences'] as const,
  detail: (userId: string) => [...userPreferencesKeys.all, userId] as const,
}

// Transform database row to UserPreferences type
const transformDbToUserPreferences = (data: any): UserPreferences => ({
  id: data.id,
  userId: data.user_id,
  theme: data.theme as 'light' | 'dark' | 'system',
  notificationsEnabled: data.notifications_enabled,
  emailDigest: data.email_digest,
  sidebarCollapsed: data.sidebar_collapsed,
  metadata: data.metadata,
  createdAt: data.created_at,
  updatedAt: data.updated_at,
})

// Get user preferences
export const useUserPreferences = (userId: string) => {
  return useQuery({
    queryKey: userPreferencesKeys.detail(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .single()
      
      if (error) {
        // If no preferences exist, create default ones
        if (error.code === 'PGRST116') {
          const { data: newPrefs, error: createError } = await supabase
            .from('user_preferences')
            .insert({
              user_id: userId,
              theme: 'light',
              notifications_enabled: true,
              email_digest: false,
              sidebar_collapsed: false,
            })
            .select()
            .single()
          
          if (createError) throw createError
          return transformDbToUserPreferences(newPrefs)
        }
        throw error
      }
      
      return transformDbToUserPreferences(data)
    },
    enabled: !!userId,
  })
}

// Update user preferences
export const useUpdateUserPreferences = () => {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ userId, input }: { userId: string; input: UpdateUserPreferencesInput }) => {
      const updateData: any = {}
      
      if (input.theme !== undefined) updateData.theme = input.theme
      if (input.notificationsEnabled !== undefined) updateData.notifications_enabled = input.notificationsEnabled
      if (input.emailDigest !== undefined) updateData.email_digest = input.emailDigest
      if (input.sidebarCollapsed !== undefined) updateData.sidebar_collapsed = input.sidebarCollapsed
      if (input.metadata !== undefined) updateData.metadata = input.metadata as any
      
      const { data, error } = await supabase
        .from('user_preferences')
        .update(updateData)
        .eq('user_id', userId)
        .select()
        .single()
      
      if (error) throw error
      return transformDbToUserPreferences(data)
    },
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: userPreferencesKeys.detail(userId) })
      toast({
        title: 'Success',
        description: 'Preferences updated successfully',
      })
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to update preferences: ${error.message}`,
        variant: 'destructive',
      })
    },
  })
}

// Create user preferences (usually called on signup)
export const useCreateUserPreferences = () => {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase
        .from('user_preferences')
        .insert({
          user_id: userId,
          theme: 'light',
          notifications_enabled: true,
          email_digest: false,
          sidebar_collapsed: false,
        })
        .select()
        .single()
      
      if (error) throw error
      return transformDbToUserPreferences(data)
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: userPreferencesKeys.detail(data.userId) })
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to create preferences: ${error.message}`,
        variant: 'destructive',
      })
    },
  })
}
