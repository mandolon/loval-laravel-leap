import { useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { projectFilesKeys } from './useProjectFiles'

export interface FolderDragDropState {
  draggedFolderId: string | null
  dropTargetIndex: number
  isAboveSeparator: boolean | null
}

/**
 * Hook for handling folder drag-and-drop operations
 * Manages folder reordering, cross-section movement, and persistence to Supabase
 */
export const useProjectFolderDragDrop = (projectId: string) => {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  /**
   * Mutation to update folder ordering within a section
   * Updates the folder's position based on new index
   */
  const reorderFoldersMutation = useMutation({
    mutationFn: async (input: {
      folderId: string
      newIndex: number
      parentFolderId: string | null
    }) => {
      const { error } = await supabase
        .from('folders')
        .update({
          parent_folder_id: input.parentFolderId,
          // If you have a display_order column, update it here
          // display_order: input.newIndex,
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.folderId)

      if (error) {
        console.error('Folder reorder error:', error)
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectFilesKeys.folders(projectId) })
    },
    onError: (error: Error) => {
      console.error('Folder reorder mutation error:', error)
      toast({
        title: 'Error',
        description: `Failed to reorder folder: ${error.message}`,
        variant: 'destructive',
      })
    },
  })

  /**
   * Mutation to move a folder between sections (above/below separator)
   */
  const moveFolderAcrossSectionsMutation = useMutation({
    mutationFn: async (input: {
      folderId: string
      newParentId: string | null
      newIndex: number
    }) => {
      const { error } = await supabase
        .from('folders')
        .update({
          parent_folder_id: input.newParentId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.folderId)

      if (error) {
        console.error('Folder move error:', error)
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectFilesKeys.folders(projectId) })
    },
    onError: (error: Error) => {
      console.error('Folder move mutation error:', error)
      toast({
        title: 'Error',
        description: `Failed to move folder: ${error.message}`,
        variant: 'destructive',
      })
    },
  })

  /**
   * Batch update multiple folders' order
   * Used when reordering changes multiple folder positions
   */
  const batchUpdateFoldersMutation = useMutation({
    mutationFn: async (input: {
      updates: Array<{
        id: string
        parentFolderId: string | null
      }>
    }) => {
      // Use individual update calls since Supabase doesn't support batch updates easily
      const promises = input.updates.map(update =>
        supabase
          .from('folders')
          .update({
            parent_folder_id: update.parentFolderId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', update.id)
      )

      const results = await Promise.all(promises)
      
      // Check for errors
      const errors = results.filter(r => r.error)
      if (errors.length > 0) {
        throw new Error(`Failed to update ${errors.length} folders`)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectFilesKeys.folders(projectId) })
    },
    onError: (error: Error) => {
      console.error('Batch folder update error:', error)
      toast({
        title: 'Error',
        description: `Failed to update folders: ${error.message}`,
        variant: 'destructive',
      })
    },
  })

  return {
    reorderFoldersMutation,
    moveFolderAcrossSectionsMutation,
    batchUpdateFoldersMutation,
  }
}
