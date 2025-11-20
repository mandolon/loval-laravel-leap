import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { handleApiError } from '../errors'

export interface TaskFile {
  id: string
  shortId: string
  projectId: string
  taskId: string
  filename: string
  storagePath: string
  mimetype: string | null
  filesize: number | null
  uploadedBy: string
  createdAt: string
}

// Query key factory
export const fileKeys = {
  all: ['files'] as const,
  task: (taskId: string) => [...fileKeys.all, 'task', taskId] as const,
}

// Transform database row to TaskFile type
const transformFile = (row: any): TaskFile => ({
  id: row.id,
  shortId: row.short_id,
  projectId: row.project_id,
  taskId: row.task_id,
  filename: row.filename,
  storagePath: row.storage_path,
  mimetype: row.mimetype,
  filesize: row.filesize,
  uploadedBy: row.uploaded_by,
  createdAt: row.created_at,
})

// Fetch files for a task
export const useTaskFiles = (taskId: string) => {
  return useQuery({
    queryKey: fileKeys.task(taskId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .eq('task_id', taskId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data.map(transformFile)
    },
    enabled: !!taskId,
  })
}

// Upload file mutation
export const useUploadTaskFile = () => {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ 
      file, 
      taskId, 
      projectId 
    }: { 
      file: File
      taskId: string
      projectId: string
    }) => {
      // Get current user
      const { data: userData } = await supabase.auth.getUser()
      const { data: userProfile } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', userData.user!.id)
        .single()

      if (!userProfile) throw new Error('User not found')

      // Create unique file path in Attachments folder
      const timestamp = Date.now()
      const storagePath = `${projectId}/Attachments/${timestamp}-${file.name}`

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('project-files')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) throw uploadError

      // Get Attachments folder ID for project
      const { data: attachmentsFolder } = await supabase
        .from('folders')
        .select('id')
        .eq('project_id', projectId)
        .eq('name', 'Attachments')
        .eq('is_system_folder', true)
        .is('deleted_at', null)
        .maybeSingle()

      if (!attachmentsFolder) {
        throw new Error('Attachments folder not found for this project')
      }

      // Create file record in database
      const { data: fileRecord, error: dbError } = await supabase
        .from('files')
        .insert({
          project_id: projectId,
          task_id: taskId,
          folder_id: attachmentsFolder.id,
          filename: file.name,
          storage_path: storagePath,
          mimetype: file.type,
          filesize: file.size,
          uploaded_by: userProfile.id,
        })
        .select()
        .single()

      if (dbError) throw dbError

      // Update task's attached_files array
      const { data: task } = await supabase
        .from('tasks')
        .select('attached_files')
        .eq('id', taskId)
        .single()

      const attachedFiles = task?.attached_files || []
      await supabase
        .from('tasks')
        .update({
          attached_files: [...attachedFiles, fileRecord.id],
        })
        .eq('id', taskId)

      return transformFile(fileRecord)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: fileKeys.task(variables.taskId) })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      
      toast({
        title: 'File uploaded',
        description: 'File has been attached to the task',
      })
    },
    onError: (error) => {
      toast({
        title: 'Upload failed',
        description: handleApiError(error),
        variant: 'destructive',
      })
    },
  })
}

// Delete file mutation
export const useDeleteTaskFile = () => {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ fileId, taskId }: { fileId: string; taskId: string }) => {
      // Get file info
      const { data: file } = await supabase
        .from('files')
        .select('storage_path, task_id')
        .eq('id', fileId)
        .single()

      if (!file) throw new Error('File not found')

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('project-files')
        .remove([file.storage_path])

      if (storageError) throw storageError

      // Soft delete in database
      const { data: userData } = await supabase.auth.getUser()
      
      // Get the user's profile ID from auth_id
      const { data: userProfile } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', userData.user!.id)
        .single()

      if (!userProfile) throw new Error('User not found')

      const { error: dbError } = await supabase
        .from('files')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: userProfile.id,
        })
        .eq('id', fileId)

      if (dbError) throw dbError

      // Update task's attached_files array
      const { data: task } = await supabase
        .from('tasks')
        .select('attached_files')
        .eq('id', taskId)
        .single()

      const attachedFiles = task?.attached_files || []
      await supabase
        .from('tasks')
        .update({
          attached_files: attachedFiles.filter(id => id !== fileId),
        })
        .eq('id', taskId)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: fileKeys.task(variables.taskId) })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      
      toast({
        title: 'File deleted',
        description: 'File has been removed',
      })
    },
    onError: (error) => {
      toast({
        title: 'Delete failed',
        description: handleApiError(error),
        variant: 'destructive',
      })
    },
  })
}

// Download file helper
export const downloadTaskFile = async (storagePath: string, filename: string) => {
  const { data, error } = await supabase.storage
    .from('project-files')
    .download(storagePath)

  if (error) throw error

  // Create download link
  const url = URL.createObjectURL(data)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
