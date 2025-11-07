import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
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
import PrivacyPage from "./pages/PrivacyPage";
import TermsPage from "./pages/TermsPage";
import OnboardingWizard from "./pages/OnboardingWizard";

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
        // Fetch ANY workspace (first one by creation date)
        const { data: workspace, error: workspaceError } = await supabase
          .from('workspaces')
          .select('id, short_id')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (workspaceError) throw workspaceError;

        if (workspace?.short_id) {
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .maybeSingle();
          
          const userRole = roleData?.role || 'team';
          navigate(`/${userRole}/workspace/${workspace.short_id}`, { replace: true });
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

  // Public routes that don't require authentication
  if (location.pathname === '/privacy') {
    return <Routes><Route path="/privacy" element={<PrivacyPage />} /><Route path="*" element={<Navigate to="/privacy" replace />} /></Routes>;
  }
  
  if (location.pathname === '/terms') {
    return <Routes><Route path="/terms" element={<TermsPage />} /><Route path="*" element={<Navigate to="/terms" replace />} /></Routes>;
  }

  if (location.pathname === '/auth') {
    return <Routes><Route path="/auth" element={<AuthPage />} /><Route path="*" element={<Navigate to="/auth" replace />} /></Routes>;
  }

  if (loading || loggingOut || !routingReady) {
    return <LoadingSpinner message="Loading your workspace..." />;
  }

  if (!user) {
    return <Routes><Route path="/auth" element={<AuthPage />} /><Route path="*" element={<Navigate to="/auth" replace />} /></Routes>;
  }

  // Check if user needs to complete onboarding
  if (!user.onboarding_completed) {
    return <Routes><Route path="/onboarding" element={<OnboardingWizard />} /><Route path="*" element={<Navigate to="/onboarding" replace />} /></Routes>;
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
        <BrowserRouter>
          <UserProvider>
            <AppRouter />
          </UserProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
