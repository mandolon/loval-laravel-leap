import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface RecentFile {
  id: string;
  filename: string;
  mimetype: string | null;
  filesize: number | null;
  storage_path: string;
  project_id: string;
  uploaded_by: string;
  created_at: string;
  updated_at: string | null;
  project?: {
    name: string;
    address: {
      streetNumber?: string;
      streetName?: string;
      city?: string;
      state?: string;
      zipCode?: string;
    };
  };
  folder?: {
    name: string;
  };
  uploader?: {
    name: string;
    email: string;
  };
}

// Query keys
export const recentFilesKeys = {
  all: ['recent-files'] as const,
  user: (userId: string, workspaceId: string) => [...recentFilesKeys.all, userId, workspaceId] as const,
};

// Fetch recent files opened/created by the user in a workspace
export function useUserRecentFiles(userId: string, workspaceId: string, limit: number = 10) {
  return useQuery({
    queryKey: [...recentFilesKeys.user(userId, workspaceId), limit],
    queryFn: async () => {
      // Validate inputs
      if (!userId || userId.trim() === '' || !workspaceId || workspaceId.trim() === '') {
        return [];
      }

      // First, get all project IDs in this workspace
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('id')
        .eq('workspace_id', workspaceId)
        .is('deleted_at', null);

      if (projectsError) throw projectsError;

      const projectIds = projects?.map(p => p.id) || [];

      if (projectIds.length === 0) {
        return [];
      }

      // Fetch files from these projects, ordered by updated_at or created_at
      const { data, error } = await supabase
        .from('files')
        .select(`
          id,
          filename,
          mimetype,
          filesize,
          storage_path,
          project_id,
          uploaded_by,
          created_at,
          updated_at,
          project:projects(name, address),
          folder:folders(name),
          uploader:users!files_uploaded_by_fkey(name, email)
        `)
        .in('project_id', projectIds)
        .eq('uploaded_by', userId)
        .is('deleted_at', null)
        .order('updated_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data || []) as RecentFile[];
    },
    enabled: !!userId && userId.trim() !== '' && !!workspaceId && workspaceId.trim() !== '',
    staleTime: 1000 * 60, // 1 minute
    gcTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
  });
}
