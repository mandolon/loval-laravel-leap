import { useInfiniteQuery } from "@tanstack/react-query";
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
    name: string | null;
    email: string | null;
  } | null;
  project?: {
    name: string | null;
  } | null;
}

// Query keys
export const activityFeedKeys = {
  all: ['activity-feed'] as const,
  workspace: (workspaceId: string, days: number) => [...activityFeedKeys.all, workspaceId, days] as const,
};

const PAGE_SIZE = 20;

// Fetch recent activity for a workspace (last N days) with infinite scroll
export function useWorkspaceActivityFeed(workspaceId: string, days: number = 14) {
  return useInfiniteQuery({
    queryKey: activityFeedKeys.workspace(workspaceId, days),
    queryFn: async ({ pageParam = 0 }) => {
      // Validate workspace ID
      if (!workspaceId || workspaceId.trim() === '') {
        return { data: [], hasMore: false };
      }

      // Calculate date threshold (14 days ago)
      const dateThreshold = new Date();
      dateThreshold.setDate(dateThreshold.getDate() - days);
      const dateThresholdISO = dateThreshold.toISOString();

      const from = pageParam * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error, count } = await supabase
        .from('activity_log')
        .select(`
          *,
          user:users!activity_log_user_id_fkey(name, email),
          project:projects(name)
        `, { count: 'exact' })
        .eq('workspace_id', workspaceId)
        .gte('created_at', dateThresholdISO)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      const activities = (data || []) as ActivityLogItem[];
      const hasMore = count ? (from + PAGE_SIZE) < count : false;

      return { data: activities, hasMore };
    },
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.hasMore ? allPages.length : undefined;
    },
    enabled: !!workspaceId && workspaceId.trim() !== '',
    staleTime: 1000 * 60, // 1 minute
    gcTime: 1000 * 60 * 5, // 5 minutes (formerly cacheTime)
    retry: 2,
  });
}
