import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export function useWorkspaceFromUrl() {
  const { workspaceId: shortId } = useParams<{ workspaceId: string }>();
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const resolveWorkspaceId = async () => {
      if (!shortId) {
        setLoading(false);
        return;
      }

      // Check if it's already a UUID (for backwards compatibility)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(shortId)) {
        setWorkspaceId(shortId);
        setLoading(false);
        return;
      }

      // Look up UUID from short_id
      const { data, error } = await supabase
        .from("workspaces")
        .select("id")
        .eq("short_id", shortId)
        .single();

      if (data && !error) {
        setWorkspaceId(data.id);
      } else {
        console.error("Error resolving workspace ID:", error);
      }
      
      setLoading(false);
    };

    resolveWorkspaceId();
  }, [shortId]);

  return { workspaceId, shortId, loading };
}
