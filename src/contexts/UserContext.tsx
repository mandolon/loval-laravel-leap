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
  onboarding_completed: boolean;
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
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        // Ignore auth state changes during logout to prevent flashing
        if (loggingOut) return;
        
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

  const loadUserProfile = async (authUser: AuthUser) => {
    try {
      // Fetch user profile with soft delete filter
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', authUser.id)
        .is('deleted_at', null)
        .maybeSingle();

      if (profileError) throw profileError;
      
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
        onboarding_completed: profile.onboarding_completed || false,
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
      
      // Clear local state
      setUser(null);
      setSession(null);
      
      // Actually sign out from Supabase
      await supabase.auth.signOut();
      
      // Navigate to auth page
      navigate('/auth');
    } catch (err) {
      console.error('Error during sign out:', err);
    } finally {
      setLoggingOut(false);
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
