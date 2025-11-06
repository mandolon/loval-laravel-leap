import { Plus, MessageSquare, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useRoleAwareNavigation } from "@/hooks/useRoleAwareNavigation";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEffect } from "react";

interface AIChatThreadsListProps {
  workspaceId: string;
}

export function AIChatThreadsList({ workspaceId }: AIChatThreadsListProps) {
  const navigate = useNavigate();
  const { navigateToWorkspace } = useRoleAwareNavigation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: threads = [] } = useQuery({
    queryKey: ["ai-chat-threads", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_chat_threads")
        .select("*")
        .eq("workspace_id", workspaceId)
        .is("deleted_at", null)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!workspaceId,
  });

  // Realtime subscription for AI chat threads
  useEffect(() => {
    if (!workspaceId) return;

    const channel = supabase
      .channel('ai-threads-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ai_chat_threads',
          filter: `workspace_id=eq.${workspaceId}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["ai-chat-threads", workspaceId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workspaceId, queryClient]);

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

  return (
    <div className="p-3">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Chats
        </span>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-5 w-5"
          onClick={() => navigateToWorkspace("/ai")}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
      
      <ScrollArea className="max-h-[300px]">
        <div className="space-y-1">
          {threads.length === 0 ? (
            <div className="text-xs text-muted-foreground py-2">
              No chats yet
            </div>
          ) : (
            threads.map((thread) => (
              <div
                key={thread.id}
                className="group flex items-center gap-2 px-2 py-1.5 rounded text-xs text-muted-foreground hover:bg-accent/30 transition-colors"
              >
                <button
                  onClick={() => navigateToWorkspace(`/ai?thread=${thread.id}`)}
                  className="flex-1 text-left truncate flex items-center gap-2"
                >
                  <MessageSquare className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{thread.title}</span>
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 opacity-0 group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteThread.mutate(thread.id);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
