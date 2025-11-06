import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { UserProvider, useUser } from "./contexts/UserContext";
import { ThemeProvider } from "./components/ThemeProvider";
import { UpdateChecker } from "./components/UpdateChecker";
import { useWorkspaceRole } from "./hooks/useWorkspaceRole";
import { LoadingSpinner } from "./components/LoadingSpinner";
import { supabase } from "@/integrations/supabase/client";
import AdminRouter from "./routers/AdminRouter";
import TeamRouter from "./routers/TeamRouter";
import ConsultantRouter from "./routers/ConsultantRouter";
import ClientRouter from "./routers/ClientRouter";
import AuthPage from "./pages/AuthPage";
import NoWorkspacePage from "./pages/NoWorkspacePage";

const queryClient = new QueryClient();

function AppRouter() {
  const { user, loading, loggingOut } = useUser();
  const location = useLocation();
  const navigate = useNavigate();
  const [routingReady, setRoutingReady] = useState(false);
  const [defaultWorkspaceLoading, setDefaultWorkspaceLoading] = useState(false);
  const [defaultWorkspaceFetched, setDefaultWorkspaceFetched] = useState(false);
  
  // Extract workspace ID from URL path - support both old and new formats
  const workspaceIdMatch = location.pathname.match(/\/(admin|team|consultant|client)\/workspace\/([^/]+)/) 
    || location.pathname.match(/^\/workspace\/([^/]+)/);
  const workspaceId = workspaceIdMatch ? (workspaceIdMatch[2] || workspaceIdMatch[1]) : undefined;
  
  const { role, loading: roleLoading } = useWorkspaceRole(workspaceId);
  
  // Fetch default workspace for users without workspaceId
  useEffect(() => {
    const fetchDefaultWorkspace = async () => {
      if (!user?.id || workspaceId || defaultWorkspaceLoading || defaultWorkspaceFetched || 
          location.pathname === '/auth' || loading) {
        return;
      }

      setDefaultWorkspaceLoading(true);
      try {
        const { data: members, error: memberError } = await supabase
          .from('workspace_members')
          .select('workspace_id')
          .eq('user_id', user.id)
          .is('deleted_at', null)
          .limit(1)
          .maybeSingle();

        if (memberError) throw memberError;

        if (members?.workspace_id) {
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .maybeSingle();
          
          const userRole = roleData?.role || 'team';
          navigate(`/${userRole}/workspace/${members.workspace_id}`, { replace: true });
        }
      } catch (error) {
        console.error('Error fetching default workspace:', error);
      } finally {
        setDefaultWorkspaceLoading(false);
        setDefaultWorkspaceFetched(true);
      }
    };

    fetchDefaultWorkspace();
  }, [user?.id, workspaceId, location.pathname, loading, navigate]);

  useEffect(() => {
    if (workspaceId) setDefaultWorkspaceFetched(false);
  }, [workspaceId]);

  useEffect(() => {
    if (!user?.id) {
      setDefaultWorkspaceFetched(false);
      setRoutingReady(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (location.pathname === '/auth') {
      setRoutingReady(true);
      return;
    }
    if (loading || loggingOut) {
      setRoutingReady(false);
      return;
    }
    if (!user) {
      setRoutingReady(true);
      return;
    }
    if (workspaceId) {
      if (!roleLoading) setRoutingReady(true);
      else setRoutingReady(false);
    } else {
      if (!defaultWorkspaceLoading && defaultWorkspaceFetched) setRoutingReady(true);
      else setRoutingReady(false);
    }
  }, [loading, roleLoading, loggingOut, user, workspaceId, defaultWorkspaceLoading, defaultWorkspaceFetched, location.pathname]);

  if (location.pathname === '/auth') {
    return <Routes><Route path="/auth" element={<AuthPage />} /><Route path="*" element={<Navigate to="/auth" replace />} /></Routes>;
  }

  if (loading || loggingOut || !routingReady) {
    return <LoadingSpinner message="Loading your workspace..." />;
  }

  if (!user) {
    return <Routes><Route path="/auth" element={<AuthPage />} /><Route path="*" element={<Navigate to="/auth" replace />} /></Routes>;
  }

  if (!workspaceId) {
    return <Routes><Route path="/auth" element={<AuthPage />} /><Route path="*" element={<NoWorkspacePage />} /></Routes>;
  }

  if (roleLoading) {
    return <LoadingSpinner message="Loading your workspace..." />;
  }

  // Redirect legacy /workspace/* URLs to role-based URLs
  if (location.pathname.startsWith('/workspace/') && role) {
    const newPath = location.pathname.replace('/workspace/', `/${role}/workspace/`);
    return <Navigate to={newPath} replace />;
  }

  // Route based on user's role
  if (role === 'admin') return <AdminRouter />;
  if (role === 'team') return <TeamRouter />;
  if (role === 'consultant') return <ConsultantRouter />;
  if (role === 'client') return <ClientRouter />;

  return <Routes><Route path="/auth" element={<AuthPage />} /><Route path="*" element={<NoWorkspacePage />} /></Routes>;
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
