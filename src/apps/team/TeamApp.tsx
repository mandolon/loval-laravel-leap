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
          <Route path="/workspace/:workspaceId" element={<HomePage />} />
          <Route path="/workspace/:workspaceId/chat" element={<ChatPage />} />
          <Route path="/workspace/:workspaceId/projects" element={<ProjectsPage />} />
          <Route path="/workspace/:workspaceId/tasks" element={<TasksPage />} />
          <Route path="/workspace/:workspaceId/ai" element={<AIPage />} />
          <Route path="/workspace/:workspaceId/detail-library" element={<DetailLibraryPage />} />
          <Route path="/detail-library" element={<DetailLibraryPage />} />
          
          {/* Settings Routes */}
          <Route path="/workspace/:workspaceId/settings" element={<SettingsPage />}>
            <Route index element={<Navigate to="profile" replace />} />
            <Route path="profile" element={<ProfileContent />} />
            <Route path="workspaces" element={<WorkspacesContent />} />
            <Route path="members" element={<MembersContent />} />
            <Route path="imports" element={<ImportsExportsContent />} />
            <Route path="trash" element={<TrashContent />} />
          </Route>
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </TeamDashboardLayout>
    </div>
  );
}
