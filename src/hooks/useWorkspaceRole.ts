import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/contexts/UserContext';

export const useWorkspaceRole = (workspaceId: string | undefined) => {
  const { user } = useUser();
  const [role, setRole] = useState<'team' | 'consultant' | 'client' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRole = async () => {
      // Global admins bypass workspace roles
      if (user?.is_admin) {
        setRole('team');
        setLoading(false);
        return;
      }

      if (!user?.id || !workspaceId) {
        setRole(null);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('workspace_members')
          .select('role')
          .eq('workspace_id', workspaceId)
          .eq('user_id', user.id)
          .is('deleted_at', null)
          .maybeSingle();

        if (error) throw error;
        setRole((data?.role as 'team' | 'consultant' | 'client') || null);
      } catch (error) {
        console.error('Error fetching workspace role:', error);
        setRole(null);
      } finally {
        setLoading(false);
      }
    };

    fetchRole();
  }, [user?.id, user?.is_admin, workspaceId]);

  return {
    role,
    isTeam: role === 'team',
    isConsultant: role === 'consultant',
    isClient: role === 'client',
    loading
  };
};
