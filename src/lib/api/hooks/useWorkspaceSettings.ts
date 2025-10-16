import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import type { WorkspaceSettings, UpdateWorkspaceSettingsInput } from '../types'

const workspaceSettingsKeys = {
  all: ['workspace-settings'] as const,
  detail: (workspaceId: string) => [...workspaceSettingsKeys.all, workspaceId] as const,
}

// Transform database row to WorkspaceSettings type
const transformDbToWorkspaceSettings = (data: any): WorkspaceSettings => ({
  id: data.id,
  workspaceId: data.workspace_id,
  defaultInvoiceTerms: data.default_invoice_terms,
  companyName: data.company_name,
  companyLogoUrl: data.company_logo_url,
  taxId: data.tax_id,
  metadata: data.metadata,
  createdAt: data.created_at,
  updatedAt: data.updated_at,
})

// Get workspace settings
export const useWorkspaceSettings = (workspaceId: string) => {
  return useQuery({
    queryKey: workspaceSettingsKeys.detail(workspaceId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workspace_settings')
        .select('*')
        .eq('workspace_id', workspaceId)
        .single()
      
      if (error) {
        // If no settings exist, create default ones
        if (error.code === 'PGRST116') {
          const { data: newSettings, error: createError } = await supabase
            .from('workspace_settings')
            .insert({
              workspace_id: workspaceId,
              default_invoice_terms: 30,
            })
            .select()
            .single()
          
          if (createError) throw createError
          return transformDbToWorkspaceSettings(newSettings)
        }
        throw error
      }
      
      return transformDbToWorkspaceSettings(data)
    },
    enabled: !!workspaceId,
  })
}

// Update workspace settings
export const useUpdateWorkspaceSettings = () => {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ 
      workspaceId, 
      input 
    }: { 
      workspaceId: string; 
      input: UpdateWorkspaceSettingsInput 
    }) => {
      const updateData: any = {}
      
      if (input.defaultInvoiceTerms !== undefined) updateData.default_invoice_terms = input.defaultInvoiceTerms
      if (input.companyName !== undefined) updateData.company_name = input.companyName
      if (input.companyLogoUrl !== undefined) updateData.company_logo_url = input.companyLogoUrl
      if (input.taxId !== undefined) updateData.tax_id = input.taxId
      if (input.metadata !== undefined) updateData.metadata = input.metadata as any
      
      const { data, error } = await supabase
        .from('workspace_settings')
        .update(updateData)
        .eq('workspace_id', workspaceId)
        .select()
        .single()
      
      if (error) throw error
      return transformDbToWorkspaceSettings(data)
    },
    onSuccess: (_, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: workspaceSettingsKeys.detail(workspaceId) })
      toast({
        title: 'Success',
        description: 'Workspace settings updated successfully',
      })
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to update workspace settings: ${error.message}`,
        variant: 'destructive',
      })
    },
  })
}

// Create workspace settings (usually called on workspace creation)
export const useCreateWorkspaceSettings = () => {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (workspaceId: string) => {
      const { data, error } = await supabase
        .from('workspace_settings')
        .insert({
          workspace_id: workspaceId,
          default_invoice_terms: 30,
        })
        .select()
        .single()
      
      if (error) throw error
      return transformDbToWorkspaceSettings(data)
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: workspaceSettingsKeys.detail(data.workspaceId) })
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to create workspace settings: ${error.message}`,
        variant: 'destructive',
      })
    },
  })
}
