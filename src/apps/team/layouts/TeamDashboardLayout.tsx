import RehomeDoubleSidebar from '../components/TeamDashboardCore';
import { ProjectViewProvider } from '@/contexts/ProjectViewContext';

export default function TeamDashboardLayout({ children }: { children?: React.ReactNode }) {
  return (
    <ProjectViewProvider>
      <RehomeDoubleSidebar>{children}</RehomeDoubleSidebar>
    </ProjectViewProvider>
  );
}
