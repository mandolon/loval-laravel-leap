import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useProjects } from '@/lib/api/hooks/useProjects';

export default function ProjectsPage() {
  const { workspaceId, projectId } = useParams<{ workspaceId: string; projectId?: string }>();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  
  const { data: projects, isLoading } = useProjects(workspaceId || '');

  // Select project from URL or first project by default
  useEffect(() => {
    if (projectId) {
      setSelectedProjectId(projectId);
    } else if (projects && projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId, projectId]);

  const selectedProject = projects?.find(p => p.id === selectedProjectId);

  return (
    <div className="h-full flex items-center justify-center overflow-auto">
      {isLoading ? (
        <div className="text-slate-600 text-sm">Loading projects...</div>
      ) : !selectedProjectId ? (
        // Empty state: No project selected
        <div className="flex flex-col items-center justify-center text-center max-w-md px-6">
          <h2 className="text-2xl font-semibold mb-3 text-slate-900">
            Open a project to begin
          </h2>
          <p className="text-lg text-slate-600">
            In the sidebar, hover over Projects and select. Use the Project Panel to manage files, preview PDFs and images, mark up in Whiteboards, and edit project info.
          </p>
        </div>
      ) : (
        // Empty state: Project selected but no item chosen
        <div className="flex flex-col items-center justify-center text-center max-w-md px-6">
          <h2 className="text-2xl font-semibold mb-3 text-slate-900">
            Select an item to preview
          </h2>
          <p className="text-lg text-slate-600">
            Pick a file, whiteboard, or project info from the panel to view it here.
          </p>
        </div>
      )}
    </div>
  );
}
