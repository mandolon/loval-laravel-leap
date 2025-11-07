import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { useToast } from "@/hooks/use-toast";

export interface Workspace {
  id: string;
  short_id: string;
  name: string;
  description: string | null;
  icon: string | null;
  created_at: string;
  updated_at: string;
}

export function useWorkspaces() {
  const { user } = useUser();
  const { toast } = useToast();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadWorkspaces();
    }
  }, [user?.id]);

  const loadWorkspaces = async () => {
    if (!user?.id) return;

    try {
      // Fetch only workspaces where user is a member
      const { data, error } = await supabase
        .from("workspace_members")
        .select("workspace_id, workspaces!workspace_members_workspace_id_fkey(*)")
        .eq("user_id", user.id)
        .is("deleted_at", null);

      if (error) throw error;

      // Extract workspaces from the join and sort by created_at
      const userWorkspaces = (data || [])
        .map((item: any) => item.workspaces)
        .filter(Boolean)
        .sort((a: any, b: any) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

      setWorkspaces(userWorkspaces);
      
      // Set current workspace if not set
      const stored = localStorage.getItem("current_workspace_id");
      
      if (stored && userWorkspaces.some((w: any) => w.id === stored)) {
        setCurrentWorkspaceId(stored);
      } else if (userWorkspaces.length > 0) {
        setCurrentWorkspaceId(userWorkspaces[0].id);
        localStorage.setItem("current_workspace_id", userWorkspaces[0].id);
      }
    } catch (error) {
      console.error("Error loading workspaces:", error);
      toast({
        title: "Error",
        description: "Failed to load workspaces",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createWorkspace = async (input: { name: string; description?: string; icon?: string }) => {
    if (!user?.id) return null;

    try {
      const { data: workspace, error: workspaceError } = await supabase
        .from("workspaces")
        .insert({
          name: input.name,
          description: input.description || null,
          icon: input.icon || "🏢",
        })
        .select()
        .single();

      if (workspaceError) throw workspaceError;

      const { error: memberError } = await supabase
        .from("workspace_members")
        .insert({
          workspace_id: workspace.id,
          user_id: user.id,
          role: "team",
        });

      if (memberError) throw memberError;

      await loadWorkspaces();
      setCurrentWorkspaceId(workspace.id);
      localStorage.setItem("current_workspace_id", workspace.id);

      return workspace;
    } catch (error: any) {
      console.error("Error creating workspace:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create workspace",
        variant: "destructive",
      });
      return null;
    }
  };

  const switchWorkspace = (workspaceId: string) => {
    setCurrentWorkspaceId(workspaceId);
    localStorage.setItem("current_workspace_id", workspaceId);
  };

  const currentWorkspace = workspaces.find(w => w.id === currentWorkspaceId);

  return {
    workspaces,
    currentWorkspace,
    currentWorkspaceId,
    loading,
    createWorkspace,
    switchWorkspace,
    refetch: loadWorkspaces,
  };
}
