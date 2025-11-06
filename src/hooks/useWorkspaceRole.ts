import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/contexts/UserContext';

export const useWorkspaceRole = (workspaceId: string | undefined) => {
  const { user } = useUser();
  const [role, setRole] = useState<'admin' | 'team' | 'consultant' | 'client' | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Abort previous fetch if workspaceId changes
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const fetchRole = async () => {
      // Reset state for new fetch
      setError(null);
      
      // If no user, set loading to false and return
      if (!user?.id) {
        setRole(null);
        setLoading(false);
        return;
      }

      // If no workspaceId, set loading to false and return null role
      // (App.tsx will handle routing for users without workspaceId)
      if (!workspaceId) {
        setRole(null);
        setLoading(false);
        return;
      }

      // Set loading to true when starting fetch
      setLoading(true);

      // Create new abort controller for this fetch
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      try {
        const { data, error: fetchError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();

        // Check if fetch was aborted
        if (abortController.signal.aborted) {
          return;
        }

        if (fetchError) throw fetchError;
        
        // Set role (even if null - user might not have a role entry)
        setRole((data?.role as 'admin' | 'team' | 'consultant' | 'client') || null);
        setError(null);
      } catch (err) {
        // Don't set error if fetch was aborted
        if (abortController.signal.aborted) {
          return;
        }
        
        console.error('Error fetching user role:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch user role'));
        setRole(null);
      } finally {
        // Only update loading state if not aborted
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchRole();

    // Cleanup: abort fetch on unmount or dependency change
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [user?.id, workspaceId]);

  return {
    role,
    isAdmin: role === 'admin',
    isTeam: role === 'team',
    isConsultant: role === 'consultant',
    isClient: role === 'client',
    loading,
    error
  };
};
