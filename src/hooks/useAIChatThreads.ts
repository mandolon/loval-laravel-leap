import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface ChatThread {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  workspace_id: string;
}

export function useAIChatThreads(workspaceId: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: threads = [], isLoading } = useQuery({
    queryKey: ["ai-chat-threads", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_chat_threads")
        .select("*")
        .eq("workspace_id", workspaceId)
        .is("deleted_at", null)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return data as ChatThread[];
    },
    enabled: !!workspaceId,
  });

  const createThread = useMutation({
    mutationFn: async (title: string = "New Chat") => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("ai_chat_threads")
        .insert({
          title,
          workspace_id: workspaceId,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-chat-threads", workspaceId] });
    },
    onError: (error) => {
      toast({
        title: "Error creating chat",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteThread = useMutation({
    mutationFn: async (threadId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("ai_chat_threads")
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: user.id,
        })
        .eq("id", threadId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-chat-threads", workspaceId] });
      toast({
        title: "Chat deleted",
        description: "The chat has been deleted successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error deleting chat",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    threads,
    isLoading,
    createThread,
    deleteThread,
  };
}
