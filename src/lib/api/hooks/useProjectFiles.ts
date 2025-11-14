import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

export interface Folder {
  id: string
  short_id: string
  project_id: string
  name: string
  parent_folder_id: string | null
  is_system_folder: boolean
  path: string | null
  created_at: string
  updated_at: string
}

export interface ProjectFile {
  id: string
  short_id: string
  project_id: string
  folder_id: string
  task_id: string | null
  parent_file_id: string | null
  filename: string
  version_number: number
  filesize: number | null
  mimetype: string | null
  storage_path: string
  download_count: number
  share_token: string | null
  is_shareable: boolean
  uploaded_by: string
  created_at: string
  updated_at: string
  deleted_at: string | null
  deleted_by: string | null
}

// Query keys
export const projectFilesKeys = {
  all: ['project-files'] as const,
  folders: (projectId: string) => [...projectFilesKeys.all, 'folders', projectId] as const,
  files: (projectId: string) => [...projectFilesKeys.all, 'files', projectId] as const,
}

// Fetch all folders for a project
export const useProjectFolders = (projectId: string) => {
  return useQuery({
    queryKey: projectFilesKeys.folders(projectId),
    enabled: !!projectId,
    queryFn: async (): Promise<Folder[]> => {
      const { data, error } = await supabase
        .from('folders')
        .select('*')
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('name', { ascending: true })

      if (error) throw error
      return data as Folder[]
    },
  })
}

// Fetch all files for a project
export const useProjectFiles = (projectId: string) => {
  return useQuery({
    queryKey: projectFilesKeys.files(projectId),
    enabled: !!projectId,
    queryFn: async (): Promise<ProjectFile[]> => {
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .eq('project_id', projectId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data
    },
  })
}

// Create a new folder
export const useCreateFolder = (projectId: string) => {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (input: { name: string; parent_folder_id: string | null }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('folders')
        .insert({
          project_id: projectId,
          name: input.name,
          parent_folder_id: input.parent_folder_id,
          is_system_folder: false,
          created_by: user.id,
        })
        .select()
        .single()

      if (error) {
        console.error('Create folder error:', error)
        throw error
      }
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectFilesKeys.folders(projectId) })
      toast({
        title: 'Success',
        description: 'Folder created successfully',
      })
    },
    onError: (error: Error) => {
      console.error('Create folder mutation error:', error)
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

// Upload files
export const useUploadProjectFiles = (projectId: string) => {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (input: { files: File[]; folder_id: string }) => {
      console.log('Upload mutation started:', { fileCount: input.files.length, folderId: input.folder_id })
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Get the public.users.id from auth.users.id
      const { data: publicUser, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', user.id)
        .single()

      if (userError || !publicUser) {
        throw new Error('User not found in public.users table')
      }

      const uploadedFiles: ProjectFile[] = []

      for (const file of input.files) {
        console.log('Uploading file:', file.name)
        // Upload to storage
        const storagePath = `${projectId}/${input.folder_id}/${file.name}`
        const { error: uploadError } = await supabase.storage
          .from('project-files')
          .upload(storagePath, file, {
            cacheControl: '3600',
            upsert: false,
          })

        if (uploadError) {
          console.error('Storage upload error:', uploadError)
          throw uploadError
        }
        console.log('File uploaded to storage:', storagePath)

        // Create file record
        const { data: fileRecord, error: dbError } = await supabase
          .from('files')
          .insert([{
            project_id: projectId,
            folder_id: input.folder_id,
            filename: file.name,
            storage_path: storagePath,
            filesize: file.size,
            mimetype: file.type,
            uploaded_by: publicUser.id,
            version_number: 1,
            download_count: 0,
            is_shareable: false,
          }])
          .select()
          .single()

        if (dbError) {
          console.error('Database insert error:', dbError)
          throw dbError
        }
        console.log('File record created:', fileRecord.id)
        uploadedFiles.push(fileRecord)
      }

      return uploadedFiles
    },
    onSuccess: () => {
      console.log('Upload successful, invalidating queries')
      queryClient.invalidateQueries({ queryKey: projectFilesKeys.files(projectId) })
      toast({
        title: 'Success',
        description: 'Files uploaded successfully',
      })
    },
    onError: (error: Error) => {
      console.error('Upload mutation error:', error)
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

// Delete a file (soft delete)
export const useDeleteProjectFile = (projectId: string) => {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (input: { fileId: string; projectId: string }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Get the users table ID from auth_id
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', user.id)
        .single()

      if (userError || !userData) {
        throw new Error('User not found in database')
      }

      const { error } = await supabase
        .from('files')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: userData.id,
        })
        .eq('id', input.fileId)

      if (error) {
        console.error('Delete file error:', error)
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectFilesKeys.files(projectId) })
      toast({
        title: 'Success',
        description: 'File moved to trash',
      })
    },
    onError: (error: Error) => {
      console.error('Delete file mutation error:', error)
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

// Delete a folder (soft delete)
export const useDeleteFolder = (projectId: string) => {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (input: { folderId: string; projectId: string }) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Get the users table ID from auth_id
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', user.id)
        .single()

      if (userError || !userData) {
        throw new Error('User not found in database')
      }

      const { error } = await supabase
        .from('folders')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: userData.id,
        })
        .eq('id', input.folderId)

      if (error) {
        console.error('Delete folder error:', error)
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectFilesKeys.folders(projectId) })
      toast({
        title: 'Success',
        description: 'Folder moved to trash',
      })
    },
    onError: (error: Error) => {
      console.error('Delete folder mutation error:', error)
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

// Get Attachments folder for project
export const useAttachmentsFolder = (projectId: string) => {
  return useQuery({
    queryKey: [...projectFilesKeys.folders(projectId), 'attachments'],
    enabled: !!projectId,
    queryFn: async (): Promise<string | null> => {
      const { data, error } = await supabase
        .from('folders')
        .select('id')
        .eq('project_id', projectId)
        .eq('name', 'Attachments')
        .eq('is_system_folder', true)
        .is('deleted_at', null)
        .maybeSingle()

      if (error) {
        console.error('Error fetching Attachments folder:', error)
        return null
      }
      
      return data?.id || null
    },
  })
}

// Get 3D Models folder for project
export const use3DModelsFolder = (projectId: string) => {
  return useQuery({
    queryKey: [...projectFilesKeys.folders(projectId), '3d-models'],
    enabled: !!projectId,
    queryFn: async (): Promise<string | null> => {
      const { data, error } = await supabase
        .from('folders')
        .select('id')
        .eq('project_id', projectId)
        .eq('name', '3D Models')
        .eq('is_system_folder', true)
        .is('deleted_at', null)
        .maybeSingle()

      if (error) {
        console.error('Error fetching 3D Models folder:', error)
        return null
      }
      
      return data?.id || null
    },
  })
}

// Upload files to Attachments folder (for chat)
export const useUploadChatFiles = (projectId: string) => {
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { data: attachmentsFolderId } = useAttachmentsFolder(projectId)

  return useMutation({
    mutationFn: async (files: File[]) => {
      if (!attachmentsFolderId) {
        throw new Error('Attachments folder not found')
      }
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Get the public.users.id from auth.users.id
      const { data: publicUser, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', user.id)
        .single()

      if (userError || !publicUser) {
        throw new Error('User not found in public.users table')
      }

      const uploadedFiles: ProjectFile[] = []

      for (const file of files) {
        const timestamp = Date.now()
        const storagePath = `${projectId}/Attachments/${timestamp}-${file.name}`
        
        const { error: uploadError } = await supabase.storage
          .from('project-files')
          .upload(storagePath, file, {
            cacheControl: '3600',
            upsert: false,
          })

        if (uploadError) {
          console.error('Storage upload error:', uploadError)
          throw uploadError
        }

        const { data: fileRecord, error: dbError } = await supabase
          .from('files')
          .insert({
            project_id: projectId,
            folder_id: attachmentsFolderId,
            filename: file.name,
            storage_path: storagePath,
            filesize: file.size,
            mimetype: file.type,
            uploaded_by: publicUser.id,
            version_number: 1,
            download_count: 0,
            is_shareable: false,
          })
          .select()
          .single()

        if (dbError) {
          console.error('Database insert error:', dbError)
          throw dbError
        }
        
        uploadedFiles.push(fileRecord)
      }

      return uploadedFiles
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectFilesKeys.files(projectId) })
      toast({
        title: 'Success',
        description: 'Files uploaded successfully',
      })
    },
    onError: (error: Error) => {
      console.error('Upload chat files error:', error)
      toast({
        title: 'Error uploading files',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

// Move a file to a different folder (for drag-and-drop)
export const useMoveProjectFile = (projectId: string) => {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (input: { fileId: string; newFolderId: string }) => {
      const { error } = await supabase
        .from('files')
        .update({
          folder_id: input.newFolderId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.fileId)

      if (error) {
        console.error('Move file error:', error)
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectFilesKeys.files(projectId) })
      toast({
        title: 'Success',
        description: 'File moved successfully',
      })
    },
    onError: (error: Error) => {
      console.error('Move file mutation error:', error)
      toast({
        title: 'Error',
        description: `Failed to move file: ${error.message}`,
        variant: 'destructive',
      })
    },
  })
}

// Rename a folder
export const useRenameFolder = (projectId: string) => {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (input: { folderId: string; newName: string }) => {
      const { error } = await supabase
        .from('folders')
        .update({
          name: input.newName,
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.folderId)

      if (error) {
        console.error('Rename folder error:', error)
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectFilesKeys.folders(projectId) })
      toast({
        title: 'Success',
        description: 'Folder renamed successfully',
      })
    },
    onError: (error: Error) => {
      console.error('Rename folder mutation error:', error)
      toast({
        title: 'Error',
        description: `Failed to rename folder: ${error.message}`,
        variant: 'destructive',
      })
    },
  })
}

// Rename a file
export const useRenameProjectFile = (projectId: string) => {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (input: { fileId: string; newName: string }) => {
      const { error } = await supabase
        .from('files')
        .update({
          filename: input.newName,
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.fileId)

      if (error) {
        console.error('Rename file error:', error)
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectFilesKeys.files(projectId) })
      toast({
        title: 'Success',
        description: 'File renamed successfully',
      })
    },
    onError: (error: Error) => {
      console.error('Rename file mutation error:', error)
      toast({
        title: 'Error',
        description: `Failed to rename file: ${error.message}`,
        variant: 'destructive',
      })
    },
  })
}

// Download file helper
export const downloadProjectFile = async (storagePath: string, filename: string) => {
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