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

export default function AdminRouter() {
  return (
    <Routes>
      <Route
        path="/admin/workspace/:workspaceId"
        element={
          <ProtectedRoute>
            <NewAppLayout>
              <HomePage />
            </NewAppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/workspace/:workspaceId/projects"
        element={
          <ProtectedRoute>
            <NewAppLayout>
              <ProjectsPage />
            </NewAppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/workspace/:workspaceId/tasks"
        element={
          <ProtectedRoute>
            <NewAppLayout>
              <TasksPage />
            </NewAppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/workspace/:workspaceId/team"
        element={
          <ProtectedRoute>
            <NewAppLayout>
              <TeamPage />
            </NewAppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/workspace/:workspaceId/clients"
        element={
          <ProtectedRoute>
            <NewAppLayout>
              <ClientsPage />
            </NewAppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/workspace/:workspaceId/project/:id"
        element={
          <ProtectedRoute>
            <NewAppLayout>
              <ProjectDetails />
            </NewAppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/workspace/:workspaceId/ai"
        element={
          <ProtectedRoute>
            <NewAppLayout>
              <AIChatPage />
            </NewAppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/detail-library"
        element={
          <ProtectedRoute>
            <NewAppLayout>
              <DetailLibraryPage />
            </NewAppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/workspace/:workspaceId/detail-library"
        element={
          <ProtectedRoute>
            <Navigate to="/admin/detail-library" replace />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/workspace/:workspaceId/trash"
        element={
          <ProtectedRoute>
            <NewAppLayout>
              <TrashPage />
            </NewAppLayout>
          </ProtectedRoute>
        }
      />
      {/* Redirect legacy routes */}
      <Route path="/workspace/:workspaceId/*" element={<Navigate to={window.location.pathname.replace('/workspace/', '/admin/workspace/')} replace />} />
      <Route path="*" element={<Navigate to="/admin/workspace/:workspaceId" replace />} />
    </Routes>
  );
}
