import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { UserProvider, useUser } from "./contexts/UserContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { NewAppLayout } from "./components/layout/NewAppLayout";
import { ThemeProvider } from "./components/ThemeProvider";
import { UpdateChecker } from "./components/UpdateChecker";
import { useWorkspaceRole } from "./hooks/useWorkspaceRole";
import { LoadingSpinner } from "./components/LoadingSpinner";
import { supabase } from "@/integrations/supabase/client";
import TeamApp from "./apps/team/TeamApp";
import HomePage from "./pages/HomePage";
import ProjectsPage from "./pages/Index";
import TasksPage from "./pages/TasksPage";
import TeamPage from "./pages/TeamPage";
import ClientsPage from "./pages/ClientsPage";
import ProjectDetails from "./pages/ProjectDetails";
import ProfilePage from "./pages/ProfilePage";
import AuthPage from "./pages/AuthPage";
import AIChatPage from "./pages/AIChatPage";
import DetailLibraryPage from "./pages/DetailLibraryPage";
import TrashPage from "./pages/TrashPage";
import NotFound from "./pages/NotFound";
import NoWorkspacePage from "./pages/NoWorkspacePage";

const queryClient = new QueryClient();

function AppRouter() {
  const { user, loading, loggingOut } = useUser();
  const location = useLocation();
  const navigate = useNavigate();
  const [routingReady, setRoutingReady] = useState(false);
  const [defaultWorkspaceLoading, setDefaultWorkspaceLoading] = useState(false);
  const [defaultWorkspaceFetched, setDefaultWorkspaceFetched] = useState(false);
  
  // Extract workspace ID from URL path
  const workspaceIdMatch = location.pathname.match(/^\/workspace\/([^/]+)/);
  const workspaceId = workspaceIdMatch ? workspaceIdMatch[1] : undefined;
  
  const { role, loading: roleLoading, error: roleError } = useWorkspaceRole(workspaceId);
  
  // Fetch default workspace for non-admin users without workspaceId
  useEffect(() => {
    const fetchDefaultWorkspace = async () => {
      // Only fetch if:
      // - User is loaded and not admin
      // - No workspaceId in URL
      // - Not already loading
      // - Not on auth page
      // - Haven't already fetched (to prevent re-fetching)
      if (
        !user?.id || 
        user.is_admin || 
        workspaceId || 
        defaultWorkspaceLoading ||
        defaultWorkspaceFetched ||
        location.pathname === '/auth' ||
        loading
      ) {
        return;
      }

      setDefaultWorkspaceLoading(true);
      try {
        // Fetch user's first workspace
        const { data: members, error: memberError } = await supabase
          .from('workspace_members')
          .select('workspace_id')
          .eq('user_id', user.id)
          .is('deleted_at', null)
          .limit(1)
          .maybeSingle();

        if (memberError) {
          throw memberError;
        }

        if (members?.workspace_id) {
          // Redirect to default workspace
          navigate(`/workspace/${members.workspace_id}`, { replace: true });
        }
        // If no workspace found, fall through to NoWorkspacePage
      } catch (error) {
        console.error('Error fetching default workspace:', error);
        // Don't set error state - let it fall through to NoWorkspacePage
      } finally {
        setDefaultWorkspaceLoading(false);
        setDefaultWorkspaceFetched(true);
      }
    };

    fetchDefaultWorkspace();
  }, [user?.id, user?.is_admin, workspaceId, location.pathname, loading, navigate]);

  // Reset defaultWorkspaceFetched when workspaceId changes or user changes
  useEffect(() => {
    if (workspaceId) {
      setDefaultWorkspaceFetched(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    // Reset when user changes (e.g., logout/login)
    if (!user?.id) {
      setDefaultWorkspaceFetched(false);
      setRoutingReady(false);
    }
  }, [user?.id]);

  // Wait for routing decision to be finalized before showing content
  useEffect(() => {
    // Auth page - always ready (handled separately before loading check)
    if (location.pathname === '/auth') {
      setRoutingReady(true);
      return;
    }

    // Still loading user - wait
    if (loading || loggingOut) {
      setRoutingReady(false);
      return;
    }

    // No user - not ready (should show auth page)
    if (!user) {
      setRoutingReady(true);
      return;
    }

    // For admins: only wait for user load (already done)
    if (user.is_admin) {
      setRoutingReady(true);
      return;
    }

    // For non-admins: wait for role determination (if workspaceId exists)
    // OR wait for default workspace fetch to complete (if no workspaceId)
    if (workspaceId) {
      // Wait for role to be determined
      if (!roleLoading) {
        setRoutingReady(true);
      } else {
        setRoutingReady(false);
      }
    } else {
      // No workspaceId - MUST wait for default workspace fetch attempt to complete
      // Don't show NoWorkspacePage until we've tried to fetch default workspace
      if (!defaultWorkspaceLoading && defaultWorkspaceFetched) {
        setRoutingReady(true);
      } else {
        setRoutingReady(false);
      }
    }
  }, [loading, roleLoading, loggingOut, user, workspaceId, defaultWorkspaceLoading, defaultWorkspaceFetched, location.pathname]);

  // PRIORITY 0: Auth route - ALWAYS allow access, even during loading
  if (location.pathname === '/auth') {
    return (
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="*" element={<Navigate to="/auth" replace />} />
      </Routes>
    );
  }

  // Loading states
  if (loading || loggingOut || !routingReady) {
    return <LoadingSpinner message="Loading your workspace..." />;
  }

  // During logout, show nothing to prevent flashing
  if (loggingOut) {
    return null;
  }

  // PRIORITY 0.5: No user - redirect to auth
  if (!user) {
    return (
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="*" element={<Navigate to="/auth" replace />} />
      </Routes>
    );
  }

  // PRIORITY 1: Admin check FIRST (highest priority - regardless of role)
  if (user.is_admin) {
    return (
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <NewAppLayout>
                <HomePage />
              </NewAppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/workspace/:workspaceId"
          element={
            <ProtectedRoute>
              <NewAppLayout>
                <HomePage />
              </NewAppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/workspace/:workspaceId/projects"
          element={
            <ProtectedRoute>
              <NewAppLayout>
                <ProjectsPage />
              </NewAppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/workspace/:workspaceId/tasks"
          element={
            <ProtectedRoute>
              <NewAppLayout>
                <TasksPage />
              </NewAppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/workspace/:workspaceId/team"
          element={
            <ProtectedRoute>
              <NewAppLayout>
                <TeamPage />
              </NewAppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/workspace/:workspaceId/clients"
          element={
            <ProtectedRoute>
              <NewAppLayout>
                <ClientsPage />
              </NewAppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/workspace/:workspaceId/project/:id"
          element={
            <ProtectedRoute>
              <NewAppLayout>
                <ProjectDetails />
              </NewAppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/workspace/:workspaceId/ai"
          element={
            <ProtectedRoute>
              <NewAppLayout>
                <AIChatPage />
              </NewAppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/detail-library"
          element={
            <ProtectedRoute>
              <NewAppLayout>
                <DetailLibraryPage />
              </NewAppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/workspace/:workspaceId/detail-library"
          element={
            <ProtectedRoute>
              <Navigate to="/detail-library" replace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/workspace/:workspaceId/trash"
          element={
            <ProtectedRoute>
              <NewAppLayout>
                <TrashPage />
              </NewAppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <NewAppLayout>
                <ProfilePage />
              </NewAppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects"
          element={
            <ProtectedRoute>
              <NewAppLayout>
                <ProjectsPage />
              </NewAppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/tasks"
          element={
            <ProtectedRoute>
              <NewAppLayout>
                <TasksPage />
              </NewAppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/team"
          element={
            <ProtectedRoute>
              <NewAppLayout>
                <TeamPage />
              </NewAppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/clients"
          element={
            <ProtectedRoute>
              <NewAppLayout>
                <ClientsPage />
              </NewAppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/project/:id"
          element={
            <ProtectedRoute>
              <NewAppLayout>
                <ProjectDetails />
              </NewAppLayout>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    );
  }

  // PRIORITY 2: Non-admin without workspaceId - show workspace selector or redirect
  // Note: This only applies to non-admin users. Admins are handled above.
  // User is guaranteed to exist at this point (checked above)
  if (!workspaceId) {
    return (
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="*" element={<NoWorkspacePage />} />
      </Routes>
    );
  }

  // PRIORITY 3: Non-admin with workspaceId - wait for role (should already be done, but double-check)
  if (roleLoading) {
    return <LoadingSpinner message="Loading your workspace..." />;
  }

  // PRIORITY 4: Team users get TeamApp
  if (role === 'team') {
    return <TeamApp />;
  }

  // PRIORITY 5: Default routes for consultants, clients, and others
  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <NewAppLayout>
              <HomePage />
            </NewAppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/workspace/:workspaceId"
        element={
          <ProtectedRoute>
            <NewAppLayout>
              <HomePage />
            </NewAppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/workspace/:workspaceId/projects"
        element={
          <ProtectedRoute>
            <NewAppLayout>
              <ProjectsPage />
            </NewAppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/workspace/:workspaceId/tasks"
        element={
          <ProtectedRoute>
            <NewAppLayout>
              <TasksPage />
            </NewAppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/workspace/:workspaceId/team"
        element={
          <ProtectedRoute>
            <NewAppLayout>
              <TeamPage />
            </NewAppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/workspace/:workspaceId/clients"
        element={
          <ProtectedRoute>
            <NewAppLayout>
              <ClientsPage />
            </NewAppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/workspace/:workspaceId/project/:id"
        element={
          <ProtectedRoute>
            <NewAppLayout>
              <ProjectDetails />
            </NewAppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/workspace/:workspaceId/ai"
        element={
          <ProtectedRoute>
            <NewAppLayout>
              <AIChatPage />
            </NewAppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/detail-library"
        element={
          <ProtectedRoute>
            <NewAppLayout>
              <DetailLibraryPage />
            </NewAppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/workspace/:workspaceId/detail-library"
        element={
          <ProtectedRoute>
            <Navigate to="/detail-library" replace />
          </ProtectedRoute>
        }
      />
      <Route
        path="/workspace/:workspaceId/trash"
        element={
          <ProtectedRoute>
            <NewAppLayout>
              <TrashPage />
            </NewAppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <NewAppLayout>
              <ProfilePage />
            </NewAppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects"
        element={
          <ProtectedRoute>
            <NewAppLayout>
              <ProjectsPage />
            </NewAppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/tasks"
        element={
          <ProtectedRoute>
            <NewAppLayout>
              <TasksPage />
            </NewAppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/team"
        element={
          <ProtectedRoute>
            <NewAppLayout>
              <TeamPage />
            </NewAppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/clients"
        element={
          <ProtectedRoute>
            <NewAppLayout>
              <ClientsPage />
            </NewAppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/project/:id"
        element={
          <ProtectedRoute>
            <NewAppLayout>
              <ProjectDetails />
            </NewAppLayout>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <UpdateChecker />
      <HashRouter>
        <UserProvider>
          <AppRouter />
        </UserProvider>
      </HashRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
