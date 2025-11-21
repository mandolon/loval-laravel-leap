import { Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { NewAppLayout } from "@/components/layout/NewAppLayout";
import HomePage from "@/pages/HomePage";
import ProjectsPage from "@/pages/Index";
import TasksPage from "@/pages/TasksPage";
import TeamPage from "@/pages/TeamPage";
import ClientsPage from "@/pages/ClientsPage";
import ProjectDetails from "@/pages/ProjectDetails";
import AIChatPage from "@/pages/AIChatPage";
import DetailLibraryPage from "@/pages/DetailLibraryPage";
import TrashPage from "@/pages/TrashPage";
import NotificationsPage from "@/apps/team/pages/NotificationsPage";

export default function ConsultantRouter() {
  return (
    <Routes>
      <Route
        path="/consultant/workspace/:workspaceId"
        element={
          <ProtectedRoute>
            <NewAppLayout>
              <HomePage />
            </NewAppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/consultant/workspace/:workspaceId/projects"
        element={
          <ProtectedRoute>
            <NewAppLayout>
              <ProjectsPage />
            </NewAppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/consultant/workspace/:workspaceId/tasks"
        element={
          <ProtectedRoute>
            <NewAppLayout>
              <TasksPage />
            </NewAppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/consultant/workspace/:workspaceId/team"
        element={
          <ProtectedRoute>
            <NewAppLayout>
              <TeamPage />
            </NewAppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/consultant/workspace/:workspaceId/clients"
        element={
          <ProtectedRoute>
            <NewAppLayout>
              <ClientsPage />
            </NewAppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/consultant/workspace/:workspaceId/project/:id"
        element={
          <ProtectedRoute>
            <NewAppLayout>
              <ProjectDetails />
            </NewAppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/consultant/workspace/:workspaceId/ai"
        element={
          <ProtectedRoute>
            <NewAppLayout>
              <AIChatPage />
            </NewAppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/consultant/detail-library"
        element={
          <ProtectedRoute>
            <NewAppLayout>
              <DetailLibraryPage />
            </NewAppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/consultant/workspace/:workspaceId/detail-library"
        element={
          <ProtectedRoute>
            <Navigate to="/consultant/detail-library" replace />
          </ProtectedRoute>
        }
      />
      <Route
        path="/consultant/workspace/:workspaceId/trash"
        element={
          <ProtectedRoute>
            <NewAppLayout>
              <TrashPage />
            </NewAppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/consultant/workspace/:workspaceId/notifications"
        element={
          <ProtectedRoute>
            <NewAppLayout>
              <NotificationsPage />
            </NewAppLayout>
          </ProtectedRoute>
        }
      />
      {/* Redirect legacy routes */}
      <Route path="/workspace/:workspaceId/*" element={<Navigate to={window.location.pathname.replace('/workspace/', '/consultant/workspace/')} replace />} />
      <Route path="*" element={<Navigate to="/consultant/workspace/:workspaceId" replace />} />
    </Routes>
  );
}
