import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const chatReadReceiptKeys = {
  all: ["chat-read-receipts"] as const,
  workspace: (workspaceId: string, userId: string) =>
    [...chatReadReceiptKeys.all, "workspace", workspaceId, userId] as const,
  project: (projectId: string, userId: string) =>
    [...chatReadReceiptKeys.all, "project", projectId, userId] as const,
  allProjects: (userId: string) =>
    [...chatReadReceiptKeys.all, "all-projects", userId] as const,
};

// Get unread count for workspace chat
export const useWorkspaceChatUnreadCount = (workspaceId: string, userId: string) => {
  return useQuery({
    queryKey: chatReadReceiptKeys.workspace(workspaceId, userId),
    queryFn: async () => {
      if (!workspaceId || !userId) return 0;

      // Get last read message
      const { data: receipt } = await supabase
        .from("chat_read_receipts")
        .select("last_read_message_id, last_read_at")
        .eq("user_id", userId)
        .eq("workspace_id", workspaceId)
        .eq("message_type", "workspace")
        .maybeSingle();

      // Count messages after last read
      let query = supabase
        .from("workspace_chat_messages")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .neq("user_id", userId); // Don't count own messages

      if (receipt?.last_read_at) {
        query = query.gt("created_at", receipt.last_read_at);
      }

      const { count } = await query;
      return count || 0;
    },
    enabled: !!workspaceId && !!userId,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
};

// Get unread count for project chat
export const useProjectChatUnreadCount = (projectId: string, userId: string) => {
  return useQuery({
    queryKey: chatReadReceiptKeys.project(projectId, userId),
    queryFn: async () => {
      if (!projectId || !userId) return 0;

      // Get last read message
      const { data: receipt } = await supabase
        .from("chat_read_receipts")
        .select("last_read_message_id, last_read_at")
        .eq("user_id", userId)
        .eq("project_id", projectId)
        .eq("message_type", "project")
        .maybeSingle();

      // Count messages after last read
      let query = supabase
        .from("project_chat_messages")
        .select("id", { count: "exact", head: true })
        .eq("project_id", projectId)
        .neq("user_id", userId); // Don't count own messages

      if (receipt?.last_read_at) {
        query = query.gt("created_at", receipt.last_read_at);
      }

      const { count } = await query;
      return count || 0;
    },
    enabled: !!projectId && !!userId,
    refetchInterval: 30000,
  });
};

// Get unread counts for all projects the user is a member of
export const useAllProjectChatUnreadCounts = (userId: string, projectIds: string[]) => {
  return useQuery({
    queryKey: [...chatReadReceiptKeys.allProjects(userId), projectIds],
    queryFn: async () => {
      if (!userId || projectIds.length === 0) return {};

      const counts: Record<string, number> = {};

      // Get all read receipts for user's projects
      const { data: receipts } = await supabase
        .from("chat_read_receipts")
        .select("project_id, last_read_at")
        .eq("user_id", userId)
        .eq("message_type", "project")
        .in("project_id", projectIds);

      const receiptMap = new Map(
        receipts?.map((r) => [r.project_id, r.last_read_at]) || []
      );

      // Get unread counts for each project
      for (const projectId of projectIds) {
        const lastReadAt = receiptMap.get(projectId);

        let query = supabase
          .from("project_chat_messages")
          .select("id", { count: "exact", head: true })
          .eq("project_id", projectId)
          .neq("user_id", userId);

        if (lastReadAt) {
          query = query.gt("created_at", lastReadAt);
        }

        const { count } = await query;
        counts[projectId] = count || 0;
      }

      return counts;
    },
    enabled: !!userId && projectIds.length > 0,
    refetchInterval: 30000,
  });
};

// Mark workspace chat as read
export const useMarkWorkspaceChatAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      workspaceId,
      userId,
      lastMessageId,
    }: {
      workspaceId: string;
      userId: string;
      lastMessageId: string;
    }) => {
      // First try to get existing record
      const { data: existing } = await supabase
        .from("chat_read_receipts")
        .select("id")
        .eq("user_id", userId)
        .eq("workspace_id", workspaceId)
        .eq("message_type", "workspace")
        .maybeSingle();

      if (existing) {
        // Update existing record
        const { error } = await supabase
          .from("chat_read_receipts")
          .update({
            last_read_message_id: lastMessageId,
            last_read_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        // Insert new record
        const { error } = await supabase
          .from("chat_read_receipts")
          .insert({
            user_id: userId,
            workspace_id: workspaceId,
            message_type: "workspace",
            last_read_message_id: lastMessageId,
            last_read_at: new Date().toISOString(),
          });
        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: chatReadReceiptKeys.workspace(variables.workspaceId, variables.userId),
      });
      queryClient.invalidateQueries({
        queryKey: chatReadReceiptKeys.allProjects(variables.userId),
      });
    },
    onError: () => {
      toast.error("Failed to mark messages as read");
    },
  });
};

// Mark project chat as read
export const useMarkProjectChatAsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      userId,
      lastMessageId,
    }: {
      projectId: string;
      userId: string;
      lastMessageId: string;
    }) => {
      // First try to get existing record
      const { data: existing } = await supabase
        .from("chat_read_receipts")
        .select("id")
        .eq("user_id", userId)
        .eq("project_id", projectId)
        .eq("message_type", "project")
        .maybeSingle();

      if (existing) {
        // Update existing record
        const { error } = await supabase
          .from("chat_read_receipts")
          .update({
            last_read_message_id: lastMessageId,
            last_read_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        // Insert new record
        const { error } = await supabase
          .from("chat_read_receipts")
          .insert({
            user_id: userId,
            project_id: projectId,
            message_type: "project",
            last_read_message_id: lastMessageId,
            last_read_at: new Date().toISOString(),
          });
        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: chatReadReceiptKeys.project(variables.projectId, variables.userId),
      });
      queryClient.invalidateQueries({
        queryKey: chatReadReceiptKeys.allProjects(variables.userId),
      });
    },
    onError: () => {
      toast.error("Failed to mark messages as read");
    },
  });
};

// Get unread message IDs for visual highlighting
export const useUnreadMessageIds = (
  messages: Array<{ id: string; created_at: string; user_id: string }>,
  lastReadAt: string | null,
  currentUserId: string
) => {
  if (!lastReadAt || messages.length === 0) return [];

  return messages
    .filter(
      (msg) =>
        new Date(msg.created_at) > new Date(lastReadAt) &&
        msg.user_id !== currentUserId
    )
    .map((msg) => msg.id);
};

// Get last read timestamp for workspace chat
export const useWorkspaceLastReadAt = (workspaceId: string, userId: string) => {
  return useQuery({
    queryKey: [...chatReadReceiptKeys.workspace(workspaceId, userId), "last-read"],
    queryFn: async () => {
      if (!workspaceId || !userId) return null;

      const { data } = await supabase
        .from("chat_read_receipts")
        .select("last_read_at")
        .eq("user_id", userId)
        .eq("workspace_id", workspaceId)
        .eq("message_type", "workspace")
        .maybeSingle();

      return data?.last_read_at || null;
    },
    enabled: !!workspaceId && !!userId,
  });
};

// Get last read timestamp for project chat
export const useProjectLastReadAt = (projectId: string, userId: string) => {
  return useQuery({
    queryKey: [...chatReadReceiptKeys.project(projectId, userId), "last-read"],
    queryFn: async () => {
      if (!projectId || !userId) return null;

      const { data } = await supabase
        .from("chat_read_receipts")
        .select("last_read_at")
        .eq("user_id", userId)
        .eq("project_id", projectId)
        .eq("message_type", "project")
        .maybeSingle();

      return data?.last_read_at || null;
    },
    enabled: !!projectId && !!userId,
  });
};
