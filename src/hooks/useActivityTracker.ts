import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/contexts/UserContext';
import { useLocation } from 'react-router-dom';

// Map route patterns to main page names
const getPageName = (pathname: string): string => {
  if (pathname.includes('/home')) return 'home';
  if (pathname.includes('/projects')) return 'projects';
  if (pathname.includes('/tasks')) return 'tasks';
  if (pathname.includes('/chat')) return 'chat';
  if (pathname.includes('/files')) return 'files';
  if (pathname.includes('/notes')) return 'notes';
  if (pathname.includes('/drawings')) return 'drawings';
  if (pathname.includes('/settings')) return 'settings';
  if (pathname.includes('/trash')) return 'trash';
  return 'home'; // default
};

export const useActivityTracker = () => {
  const { user, loggingOut } = useUser();
  const location = useLocation();

  useEffect(() => {
    // Don't track activity if user is not logged in or currently logging out
    if (!user?.id || loggingOut) return;

    // Update last_active_at and last_page_visited when user navigates to a new page
    const updateActivity = async () => {
      // Double-check user is still logged in before updating
      if (!user?.id || loggingOut) return;
      
      const pageName = getPageName(location.pathname);
      
      try {
        const { data: userData } = await supabase
          .from('users')
          .select('auth_id')
          .eq('id', user.id)
          .maybeSingle();

        if (userData?.auth_id && user?.id && !loggingOut) {
          await supabase
            .from('users')
            .update({ 
              last_active_at: new Date().toISOString(),
              last_page_visited: pageName
            })
            .eq('auth_id', userData.auth_id);
        }
      } catch (error) {
        console.error('Failed to update activity:', error);
      }
    };

    // Update activity when page/route changes
    updateActivity();

  }, [user?.id, loggingOut, location.pathname]);
};
