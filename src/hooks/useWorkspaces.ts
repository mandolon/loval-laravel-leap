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
      // First get workspace IDs for this user
      const { data: members, error: memberError } = await supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", user.id)
        .is("deleted_at", null);

      if (memberError) throw memberError;

      if (!members || members.length === 0) {
        setWorkspaces([]);
        setLoading(false);
        return;
      }

      const workspaceIds = members.map(m => m.workspace_id);

      // Then get workspace details
      const { data, error } = await supabase
        .from("workspaces")
        .select("*")
        .in("id", workspaceIds);

      if (error) throw error;

      setWorkspaces(data || []);
      
      // Set current workspace if not set
      const stored = localStorage.getItem("current_workspace_id");
      if (stored && data?.some(w => w.id === stored)) {
        setCurrentWorkspaceId(stored);
      } else if (data && data.length > 0) {
        setCurrentWorkspaceId(data[0].id);
        localStorage.setItem("current_workspace_id", data[0].id);
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
    if (!user?.id) {
      console.error('❌ No user.id available');
      return null;
    }

    console.log('🔵 Starting workspace creation:', {
      userId: user.id,
      userAuthId: user.auth_id,
      userIsAdmin: user.is_admin,
      workspaceName: input.name
    });

    try {
      // Create workspace
      const { data: workspace, error: workspaceError } = await supabase
        .from("workspaces")
        .insert({
          name: input.name,
          description: input.description || null,
          icon: input.icon || "🏢",
        })
        .select()
        .single();

      if (workspaceError) {
        console.error('❌ Workspace creation failed:', workspaceError);
        throw workspaceError;
      }

      console.log('✅ Workspace created:', workspace);

      // Add user as workspace member
      console.log('🔵 Adding workspace member:', {
        workspace_id: workspace.id,
        user_id: user.id,
        role: 'team'
      });

      const { data: member, error: memberError } = await supabase
        .from("workspace_members")
        .insert({
          workspace_id: workspace.id,
          user_id: user.id,
          role: "team",
        })
        .select()
        .single();

      if (memberError) {
        console.error('❌ Member creation failed:', {
          message: memberError.message,
          details: memberError.details,
          hint: memberError.hint,
          code: memberError.code,
          fullError: memberError
        });
        throw memberError;
      }

      console.log('✅ Member created:', member);

      await loadWorkspaces();
      setCurrentWorkspaceId(workspace.id);
      localStorage.setItem("current_workspace_id", workspace.id);

      return workspace;
    } catch (error: any) {
      console.error("❌ Full error creating workspace:", error);
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
