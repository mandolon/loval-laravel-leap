import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/contexts/UserContext';

const UPDATE_INTERVAL = 60000; // Update every 60 seconds when active
const DEBOUNCE_DELAY = 5000; // Wait 5 seconds after last activity before considering inactive

export const useActivityTracker = () => {
  const { user } = useUser();
  const lastActivityRef = useRef<Date>(new Date());
  const updateTimerRef = useRef<NodeJS.Timeout | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    // Update last_active_at in database
    const updateActivity = async () => {
      try {
        const { data: userData } = await supabase
          .from('users')
          .select('auth_id')
          .eq('id', user.id)
          .maybeSingle();

        if (userData?.auth_id) {
          await supabase
            .from('users')
            .update({ last_active_at: new Date().toISOString() })
            .eq('auth_id', userData.auth_id);
        }
      } catch (error) {
        console.error('Failed to update activity:', error);
      }
    };

    // Track activity events
    const handleActivity = () => {
      lastActivityRef.current = new Date();

      // Clear existing debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Set new debounce timer
      debounceTimerRef.current = setTimeout(() => {
        // User is still active, continue updating
        if (updateTimerRef.current === null) {
          updateActivity();
          updateTimerRef.current = setInterval(updateActivity, UPDATE_INTERVAL);
        }
      }, DEBOUNCE_DELAY);
    };

    // Activity event listeners
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Initial activity update
    updateActivity();
    updateTimerRef.current = setInterval(updateActivity, UPDATE_INTERVAL);

    // Cleanup
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      if (updateTimerRef.current) {
        clearInterval(updateTimerRef.current);
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [user?.id]);
};
