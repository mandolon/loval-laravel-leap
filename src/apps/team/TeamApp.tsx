import { Routes, Route, Navigate } from 'react-router-dom';
import TeamDashboardLayout from './layouts/TeamDashboardLayout';
import HomePage from './pages/HomePage';
import ProjectsPage from './pages/ProjectsPage';
import TasksPage from './pages/TasksPage';
import DetailLibraryPage from './pages/DetailLibraryPage';
import ChatPage from './pages/ChatPage';
import AIPage from './pages/AIPage';
import './styles/team-dashboard.css';

export default function TeamApp() {
  return (
    <div className="team-app">
      <TeamDashboardLayout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/workspace/:workspaceId" element={<HomePage />} />
          <Route path="/workspace/:workspaceId/chat" element={<ChatPage />} />
          <Route path="/workspace/:workspaceId/projects" element={<ProjectsPage />} />
          <Route path="/workspace/:workspaceId/tasks" element={<TasksPage />} />
          <Route path="/workspace/:workspaceId/ai" element={<AIPage />} />
          <Route path="/workspace/:workspaceId/detail-library" element={<DetailLibraryPage />} />
          <Route path="/detail-library" element={<DetailLibraryPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </TeamDashboardLayout>
    </div>
  );
}
