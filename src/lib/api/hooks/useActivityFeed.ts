import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ActivityLogItem {
  id: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  change_summary: string | null;
  user_id: string | null;
  workspace_id: string;
  project_id: string | null;
  created_at: string;
  user?: {
    name: string;
    email: string;
  };
  project?: {
    name: string;
  };
}

// Query keys
export const activityFeedKeys = {
  all: ['activity-feed'] as const,
  workspace: (workspaceId: string) => [...activityFeedKeys.all, workspaceId] as const,
};

// Fetch recent activity for a workspace
export function useWorkspaceActivityFeed(workspaceId: string, limit: number = 10) {
  return useQuery({
    queryKey: [...activityFeedKeys.workspace(workspaceId), limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_log')
        .select(`
          *,
          user:users!activity_log_user_id_fkey(name, email),
          project:projects(name)
        `)
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as ActivityLogItem[];
    },
    enabled: !!workspaceId,
  });
}
