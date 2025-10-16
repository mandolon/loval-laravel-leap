import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { UserProvider } from "./contexts/UserContext";
import { NewAppLayout } from "./components/layout/NewAppLayout";
import HomePage from "./pages/HomePage";
import ProjectsPage from "./pages/Index";
import TasksPage from "./pages/TasksPage";
import TeamPage from "./pages/TeamPage";
import ClientsPage from "./pages/ClientsPage";
import ProjectDetails from "./pages/ProjectDetails";
import ProfilePage from "./pages/ProfilePage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <UserProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <NewAppLayout>
            <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/workspace/:workspaceId" element={<HomePage />} />
            <Route path="/workspace/:workspaceId/projects" element={<ProjectsPage />} />
            <Route path="/workspace/:workspaceId/tasks" element={<TasksPage />} />
            <Route path="/workspace/:workspaceId/team" element={<TeamPage />} />
            <Route path="/workspace/:workspaceId/clients" element={<ClientsPage />} />
            <Route path="/workspace/:workspaceId/project/:id" element={<ProjectDetails />} />
            <Route path="/profile" element={<ProfilePage />} />
            {/* Legacy routes for backward compatibility */}
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/team" element={<TeamPage />} />
            <Route path="/clients" element={<ClientsPage />} />
            <Route path="/project/:id" element={<ProjectDetails />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
            </Routes>
          </NewAppLayout>
        </BrowserRouter>
      </TooltipProvider>
    </UserProvider>
  </QueryClientProvider>
);

export default App;
