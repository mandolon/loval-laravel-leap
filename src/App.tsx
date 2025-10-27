import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { UserProvider, useUser } from "./contexts/UserContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { NewAppLayout } from "./components/layout/NewAppLayout";
import { ThemeProvider } from "./components/ThemeProvider";
import { UpdateChecker } from "./components/UpdateChecker";
import { useWorkspaceRole } from "./hooks/useWorkspaceRole";
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
  const { user, loading } = useUser();
  const location = useLocation();
  
  // Extract workspace ID from URL path
  const workspaceIdMatch = location.pathname.match(/^\/workspace\/([^/]+)/);
  const workspaceId = workspaceIdMatch ? workspaceIdMatch[1] : undefined;
  
  const { role, loading: roleLoading } = useWorkspaceRole(workspaceId);
  
  if (loading || roleLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  
  // Admins always use the standard admin dashboard
  if (user?.is_admin) {
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
            {/* Redirect old workspace-based route to new top-level route */}
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
            {/* Legacy routes for backward compatibility */}
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
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
      </Routes>
    );
  }
  
  // Team users get the new team dashboard
  if (role === 'team') {
    return <TeamApp />;
  }
  
  // Default routes for consultants, clients, and others
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
