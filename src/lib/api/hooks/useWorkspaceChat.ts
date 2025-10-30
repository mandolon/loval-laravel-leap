import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

// Query keys
const workspaceChatKeys = {
  all: ['workspace-chat'] as const,
  messages: (workspaceId: string) => [...workspaceChatKeys.all, workspaceId] as const,
  message: (id: string) => [...workspaceChatKeys.all, 'message', id] as const,
};

// Extended message interface with user information
export interface WorkspaceChatMessageWithUser {
  id: string;
  workspace_id: string;
  user_id: string;
  content: string;
  reply_to_message_id?: string | null;
  referenced_files?: string[];
  referenced_tasks?: string[];
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  deleted_by?: string | null;
  user: {
    id: string;
    name: string;
    email?: string;
    avatar_url?: string | null;
  } | null;
  reply_to?: {
    id: string;
    content: string;
    user: {
      id: string;
      name: string;
    } | null;
  } | null;
}

// Transform database row to message with user info
function transformDbToMessage(row: any): WorkspaceChatMessageWithUser {
  return {
    id: row.id,
    workspace_id: row.workspace_id,
    user_id: row.user_id,
    content: row.content,
    reply_to_message_id: row.reply_to_message_id,
    referenced_files: row.referenced_files || [],
    referenced_tasks: row.referenced_tasks || [],
    created_at: row.created_at,
    updated_at: row.updated_at,
    deleted_at: row.deleted_at,
    deleted_by: row.deleted_by,
    user: row.users ? {
      id: row.users.id,
      name: row.users.name,
      email: row.users.email,
      avatar_url: row.users.avatar_url
    } : null,
    reply_to: row.reply_to_message ? {
      id: row.reply_to_message.id,
      content: row.reply_to_message.content,
      user: row.reply_to_message.users ? {
        id: row.reply_to_message.users.id,
        name: row.reply_to_message.users.name
      } : null
    } : null
  };
}

// Fetch workspace messages
export function useWorkspaceMessages(workspaceId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: workspaceChatKeys.messages(workspaceId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workspace_chat_messages')
        .select(`
          *,
          users!workspace_chat_messages_user_id_fkey (
            id,
            name,
            email,
            avatar_url
          ),
          reply_to_message:workspace_chat_messages!workspace_chat_messages_reply_to_message_id_fkey (
            id,
            content,
            users!workspace_chat_messages_user_id_fkey (
              id,
              name
            )
          )
        `)
        .eq('workspace_id', workspaceId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data || []).map(transformDbToMessage);
    },
    enabled: !!workspaceId,
  });

  // Set up realtime subscription
  useEffect(() => {
    if (!workspaceId) return;

    const channel = supabase
      .channel(`workspace-chat-${workspaceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workspace_chat_messages',
          filter: `workspace_id=eq.${workspaceId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: workspaceChatKeys.messages(workspaceId) });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workspaceId, queryClient]);

  return query;
}

// Create workspace message
export function useCreateWorkspaceMessage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      workspace_id: string;
      content: string;
      reply_to_message_id?: string;
      referenced_files?: string[];
      referenced_tasks?: string[];
    }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not authenticated");

      const { data: result, error } = await supabase
        .from('workspace_chat_messages')
        .insert([{
          workspace_id: data.workspace_id,
          user_id: user.user.id,
          content: data.content,
          reply_to_message_id: data.reply_to_message_id,
          referenced_files: data.referenced_files || [],
          referenced_tasks: data.referenced_tasks || [],
        }])
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: workspaceChatKeys.messages(variables.workspace_id) 
      });
      toast({
        title: "Message sent",
        description: "Your message has been sent successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error sending message",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Update workspace message
export function useUpdateWorkspaceMessage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      workspace_id: string;
      content: string;
    }) => {
      const { data: result, error } = await supabase
        .from('workspace_chat_messages')
        .update({ content: data.content, updated_at: new Date().toISOString() })
        .eq('id', data.id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: workspaceChatKeys.messages(variables.workspace_id) 
      });
      queryClient.invalidateQueries({ 
        queryKey: workspaceChatKeys.message(variables.id) 
      });
      toast({
        title: "Message updated",
        description: "Your message has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating message",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Delete workspace message (soft delete)
export function useDeleteWorkspaceMessage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: { id: string; workspace_id: string }) => {
      const { data: result, error } = await supabase
        .from('workspace_chat_messages')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .eq('id', data.id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: workspaceChatKeys.messages(variables.workspace_id) 
      });
      toast({
        title: "Message deleted",
        description: "Your message has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting message",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
