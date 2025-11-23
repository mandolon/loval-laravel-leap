import { Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminLayoutWrapper } from "@/components/layout/AdminLayoutWrapper";
import HomePage from "@/pages/HomePage";
import ProjectsPage from "@/pages/Index";
import TasksPage from "@/pages/TasksPage";
import TeamPage from "@/pages/TeamPage";
import ClientsPage from "@/pages/ClientsPage";
import ProjectDetails from "@/pages/ProjectDetails";
import AIChatPage from "@/pages/AIChatPage";
import DetailLibraryPage from "@/pages/DetailLibraryPage";
import TrashPage from "@/pages/TrashPage";
import BuildingCodesPage from "@/pages/BuildingCodesPage";
import KnowledgeBasePage from "@/pages/KnowledgeBasePage";
import NotificationsPage from "@/apps/team/pages/NotificationsPage";

export default function AdminRouter() {
  return (
    <Routes>
      <Route
        path="/admin/workspace/:workspaceId"
        element={
          <ProtectedRoute>
            <AdminLayoutWrapper>
              <HomePage />
            </AdminLayoutWrapper>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/workspace/:workspaceId/projects"
        element={
          <ProtectedRoute>
            <AdminLayoutWrapper>
              <ProjectsPage />
            </AdminLayoutWrapper>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/workspace/:workspaceId/tasks"
        element={
          <ProtectedRoute>
            <AdminLayoutWrapper>
              <TasksPage />
            </AdminLayoutWrapper>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/workspace/:workspaceId/team"
        element={
          <ProtectedRoute>
            <AdminLayoutWrapper>
              <TeamPage />
            </AdminLayoutWrapper>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/workspace/:workspaceId/clients"
        element={
          <ProtectedRoute>
            <AdminLayoutWrapper>
              <ClientsPage />
            </AdminLayoutWrapper>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/workspace/:workspaceId/project/:id"
        element={
          <ProtectedRoute>
            <AdminLayoutWrapper>
              <ProjectDetails />
            </AdminLayoutWrapper>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/workspace/:workspaceId/ai"
        element={
          <ProtectedRoute>
            <AdminLayoutWrapper>
              <AIChatPage />
            </AdminLayoutWrapper>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/detail-library"
        element={
          <ProtectedRoute>
            <AdminLayoutWrapper>
              <DetailLibraryPage />
            </AdminLayoutWrapper>
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
            <AdminLayoutWrapper>
              <TrashPage />
            </AdminLayoutWrapper>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/workspace/:workspaceId/building-codes"
        element={
          <ProtectedRoute>
            <AdminLayoutWrapper>
              <BuildingCodesPage />
            </AdminLayoutWrapper>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/workspace/:workspaceId/knowledge-base"
        element={
          <ProtectedRoute>
            <AdminLayoutWrapper>
              <KnowledgeBasePage />
            </AdminLayoutWrapper>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/workspace/:workspaceId/notifications"
        element={
          <ProtectedRoute>
            <AdminLayoutWrapper>
              <NotificationsPage />
            </AdminLayoutWrapper>
          </ProtectedRoute>
        }
      />
      {/* Redirect legacy routes */}
      <Route path="/workspace/:workspaceId/*" element={<Navigate to={window.location.pathname.replace('/workspace/', '/admin/workspace/')} replace />} />
      <Route path="*" element={<Navigate to="/admin/workspace/:workspaceId" replace />} />
    </Routes>
  );
}
