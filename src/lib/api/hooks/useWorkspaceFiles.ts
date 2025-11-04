import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Query keys
const workspaceFilesKeys = {
  all: ['workspace-files'] as const,
  files: (workspaceId: string) => [...workspaceFilesKeys.all, workspaceId] as const,
  folders: (workspaceId: string) => [...workspaceFilesKeys.all, 'folders', workspaceId] as const,
};

export interface WorkspaceFile {
  id: string;
  workspace_id: string;
  folder_id?: string | null;
  filename: string;
  mimetype?: string;
  filesize?: number;
  storage_path: string;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceFolder {
  id: string;
  workspace_id: string;
  parent_folder_id?: string | null;
  name: string;
  path?: string;
  is_system_folder: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// Fetch workspace files
export function useWorkspaceFiles(workspaceId: string) {
  return useQuery({
    queryKey: workspaceFilesKeys.files(workspaceId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workspace_files')
        .select('*')
        .eq('workspace_id', workspaceId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as WorkspaceFile[];
    },
    enabled: !!workspaceId,
  });
}

// Fetch workspace folders
export function useWorkspaceFolders(workspaceId: string) {
  return useQuery({
    queryKey: workspaceFilesKeys.folders(workspaceId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workspace_folders')
        .select('*')
        .eq('workspace_id', workspaceId)
        .is('deleted_at', null)
        .order('name', { ascending: true });

      if (error) throw error;
      return data as WorkspaceFolder[];
    },
    enabled: !!workspaceId,
  });
}

// Upload workspace files
export function useUploadWorkspaceFiles(workspaceId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      files: File[];
      folderId?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const uploadedFiles: WorkspaceFile[] = [];

      for (const file of data.files) {
        const timestamp = Date.now();
        const folderPath = data.folderId ? `folder-${data.folderId}` : 'Attachments';
        const storagePath = `${workspaceId}/${folderPath}/${timestamp}-${file.name}`;
        
        console.log('Uploading workspace file to storage:', storagePath);
        const { error: uploadError } = await supabase.storage
          .from('workspace-files')
          .upload(storagePath, file);

        if (uploadError) {
          console.error('Storage upload error:', uploadError);
          throw uploadError;
        }

        console.log('Creating workspace file record for:', file.name);
        const { data: fileRecord, error: insertError } = await supabase
          .from('workspace_files')
          .insert([{
            workspace_id: workspaceId,
            folder_id: data.folderId,
            filename: file.name,
            mimetype: file.type,
            filesize: file.size,
            storage_path: storagePath,
            uploaded_by: user.id,
          }])
          .select()
          .single();

        if (insertError) {
          console.error('Database insert error:', insertError);
          throw insertError;
        }
        
        console.log('Workspace file record created:', fileRecord.id);
        uploadedFiles.push(fileRecord);
      }

      return uploadedFiles;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: workspaceFilesKeys.files(workspaceId) 
      });
      toast({
        title: "Files uploaded",
        description: "Your files have been uploaded successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error uploading files",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Delete workspace file (soft delete)
export function useDeleteWorkspaceFile(workspaceId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (fileId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('workspace_files')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: user.id,
        })
        .eq('id', fileId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: workspaceFilesKeys.files(workspaceId) 
      });
      toast({
        title: "File deleted",
        description: "The file has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting file",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
