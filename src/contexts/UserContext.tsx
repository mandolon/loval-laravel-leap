import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { User as AuthUser, Session } from "@supabase/supabase-js";

interface UserProfile {
  id: string;
  short_id: string;
  auth_id: string;
  name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  title?: string;
  initials: string;
  last_active_at?: string;
  is_admin: boolean;
}

interface UserContextType {
  user: UserProfile | null;
  session: Session | null;
  loading: boolean;
  loggingOut: boolean;
  updateUser: (updates: Partial<UserProfile>) => Promise<void>;
  signOut: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [profileLoadError, setProfileLoadError] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener with token recovery
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Handle SIGNED_OUT event immediately, even during logout
        if (event === 'SIGNED_OUT') {
          setUser(null);
          setSession(null);
          setLoading(false);
          return;
        }
        
        // Ignore other auth state changes during logout to prevent flashing
        if (loggingOut) return;
        
        // Handle token refresh failures
        if (event === 'TOKEN_REFRESHED' && !session) {
          console.error('Token refresh failed - signing out user');
          await signOut();
          return;
        }
        
        // Reset error state on new session
        setProfileLoadError(false);
        
        setSession(session);
        if (session?.user) {
          setTimeout(() => {
            loadUserProfile(session.user);
          }, 0);
        } else {
          setUser(null);
          setLoading(false);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        loadUserProfile(session.user);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [loggingOut]);

  // Check for forced sign-out every 10 seconds
  useEffect(() => {
    if (!session || loggingOut) return;

    const checkForcedSignOut = async () => {
      try {
        const { data: { user: authUser }, error } = await supabase.auth.getUser();
        
        if (error || !authUser) return;

        const forcedSignOutAt = authUser.app_metadata?.forced_signout_at;
        
        if (forcedSignOutAt) {
          console.log('Detected forced sign-out - signing out locally');
          await signOut();
        }
      } catch (err) {
        console.error('Error checking forced sign-out:', err);
      }
    };

    // Check immediately
    checkForcedSignOut();

    // Then check every 10 seconds
    const interval = setInterval(checkForcedSignOut, 10000);

    return () => clearInterval(interval);
  }, [session, loggingOut]);

  const loadUserProfile = async (authUser: AuthUser) => {
    // Don't retry if we already failed
    if (profileLoadError) {
      setLoading(false);
      return;
    }

    try {
      // Fetch user profile with soft delete filter
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', authUser.id)
        .is('deleted_at', null)
        .maybeSingle();

      if (profileError) {
        // Check if it's an auth-related error
        if (profileError.message?.includes('JWT') || profileError.message?.includes('token')) {
          console.error('Authentication error - signing out');
          await signOut();
          return;
        }
        
        // Check if it's a service unavailable error (503)
        if (profileError.message?.includes('503') || profileError.code === 'PGRST002') {
          console.error('Service unavailable - stopping retry attempts');
          setProfileLoadError(true);
        }
        throw profileError;
      }
      
      if (!profile) {
        console.error('User profile not found or deleted');
        setUser(null);
        setLoading(false);
        return;
      }

      // Generate initials from name
      const initials = profile.name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) || 'U';

      setUser({
        ...profile,
        auth_id: authUser.id,
        initials,
        is_admin: profile.is_admin || false,
      });
    } catch (error) {
      console.error('Error loading user profile:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const updateUser = async (updates: Partial<UserProfile>) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;

      // Regenerate initials if name changed
      const newInitials = updates.name
        ? updates.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
        : user.initials;

      setUser((prev) => (prev ? { ...prev, ...updates, initials: newInitials } : null));
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      // Set logging out flag to prevent state changes during logout
      setLoggingOut(true);
      
      // Clear local state first
      setUser(null);
      setSession(null);
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Supabase signOut error:', error);
      }
      
      // Manually clear all Supabase auth data from localStorage as backup
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('sb-')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      // Navigate to auth page
      navigate('/auth', { replace: true });
    } catch (err) {
      console.error('Error during sign out:', err);
      // Still clear state even if signout fails
      setUser(null);
      setSession(null);
      navigate('/auth', { replace: true });
    } finally {
      // Small delay to ensure navigation completes before clearing flag
      setTimeout(() => {
        setLoggingOut(false);
      }, 100);
    }
  };

  return (
    <UserContext.Provider value={{ user, session, loading, loggingOut, updateUser, signOut }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
