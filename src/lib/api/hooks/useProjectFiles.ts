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
            uploaded_by: user.id,
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
