import { Routes, Route, Navigate } from 'react-router-dom';
import TeamDashboardLayout from './layouts/TeamDashboardLayout';
import HomePage from './pages/HomePage';
import ProjectsPage from './pages/ProjectsPage';
import TasksPage from './pages/TasksPage';
import DetailLibraryPage from './pages/DetailLibraryPage';
import ChatPage from './pages/ChatPage';
import AIPage from './pages/AIPage';
import SettingsPage from './pages/SettingsPage';
import { ProfileContent } from './components/settings/ProfileContent';
import { MembersContent } from './components/settings/MembersContent';
import { WorkspacesContent } from './components/settings/WorkspacesContent';
import { ImportsExportsContent } from './components/settings/ImportsExportsContent';
import { TrashContent } from './components/settings/TrashContent';
import './styles/team-dashboard.css';

export default function TeamApp() {
  return (
    <div className="team-app">
      <TeamDashboardLayout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/team/workspace/:workspaceId" element={<HomePage />} />
          <Route path="/team/workspace/:workspaceId/chat" element={<ChatPage />} />
          <Route path="/team/workspace/:workspaceId/projects" element={<ProjectsPage />} />
          <Route path="/team/workspace/:workspaceId/tasks" element={<TasksPage />} />
          <Route path="/team/workspace/:workspaceId/ai" element={<AIPage />} />
          <Route path="/team/workspace/:workspaceId/detail-library" element={<DetailLibraryPage />} />
          <Route path="/detail-library" element={<DetailLibraryPage />} />
          
          {/* Settings Routes - using explicit paths for better compatibility */}
          <Route path="/team/workspace/:workspaceId/settings" element={<SettingsPage />}>
            <Route index element={<Navigate to="profile" replace />} />
            <Route path="profile" element={<ProfileContent />} />
            <Route path="workspaces" element={<WorkspacesContent />} />
            <Route path="members" element={<MembersContent />} />
            <Route path="imports" element={<ImportsExportsContent />} />
            <Route path="trash" element={<TrashContent />} />
          </Route>
          
          {/* Legacy redirect for backwards compatibility */}
          <Route path="/workspace/:workspaceId/*" element={<Navigate to={window.location.pathname.replace('/workspace/', '/team/workspace/')} replace />} />
          
          {/* Catch-all should be last */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </TeamDashboardLayout>
    </div>
  );
}
