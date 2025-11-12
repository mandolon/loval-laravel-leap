import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import ProjectPanel from '../components/ProjectPanel';
import { useProjects } from '@/lib/api/hooks/useProjects';

export default function ProjectsPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  
  const { data: projects, isLoading } = useProjects(workspaceId || '');

  // Select first project by default
  useEffect(() => {
    if (projects && projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  const selectedProject = projects?.find(p => p.id === selectedProjectId);

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header with collapse button */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200/60">
        <h1 className="text-lg font-semibold text-slate-900">
          {selectedProject?.name || 'Projects'}
        </h1>
        
        <button
          onClick={() => setPanelCollapsed(!panelCollapsed)}
          className="h-8 w-8 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors group"
          aria-label={panelCollapsed ? "Show project panel" : "Hide project panel"}
          title={panelCollapsed ? "Show Files & Whiteboards" : "Hide Files & Whiteboards"}
        >
          {panelCollapsed ? (
            <ChevronLeft className="h-4 w-4 text-slate-600 group-hover:text-slate-900" />
          ) : (
            <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-slate-900" />
          )}
        </button>
      </div>

      {/* Main content area with panel */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Main project view - Center Preview Canvas */}
        <div className="flex-1 flex items-center justify-center overflow-auto">
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

        {/* Collapsible ProjectPanel (slides from right) */}
        <div
          className={`absolute top-0 right-0 bottom-0 transition-transform duration-300 ease-out ${
            panelCollapsed ? 'translate-x-full' : 'translate-x-0'
          }`}
          style={{
            width: '240px',
            boxShadow: panelCollapsed ? 'none' : '-2px 0 8px rgba(0,0,0,0.1)',
          }}
        >
          {selectedProjectId && (
            <ProjectPanel
              projectId={selectedProjectId}
              projectName={selectedProject?.name}
              onBreadcrumb={(crumb) => console.log('Breadcrumb:', crumb)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
