import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { UserProvider } from "./contexts/UserContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { NewAppLayout } from "./components/layout/NewAppLayout";
import HomePage from "./pages/HomePage";
import ProjectsPage from "./pages/Index";
import TasksPage from "./pages/TasksPage";
import TeamPage from "./pages/TeamPage";
import ClientsPage from "./pages/ClientsPage";
import ProjectDetails from "./pages/ProjectDetails";
import ProfilePage from "./pages/ProfilePage";
import AuthPage from "./pages/AuthPage";
import AIChatPage from "./pages/AIChatPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <UserProvider>
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
        </UserProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
