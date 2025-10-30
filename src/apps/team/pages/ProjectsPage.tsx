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
        {/* Main project view */}
        <div className="flex-1 p-6 overflow-auto">
          {isLoading ? (
            <div className="text-slate-600 text-sm">Loading projects...</div>
          ) : projects?.length === 0 ? (
            <div className="text-slate-600 text-sm">No projects found</div>
          ) : (
            <div className="space-y-4">
              {/* Project selector */}
              <div className="flex flex-wrap gap-2">
                {projects?.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => setSelectedProjectId(project.id)}
                    className={`px-4 py-2 rounded-lg border transition-colors text-sm ${
                      selectedProjectId === project.id
                        ? 'border-blue-400 bg-blue-50 text-blue-900'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    {project.name}
                  </button>
                ))}
              </div>

              {/* Project details */}
              {selectedProject && (
                <div className="mt-6 p-4 border border-slate-200 rounded-lg bg-slate-50/50">
                  <h2 className="text-sm font-semibold mb-2 text-slate-900">{selectedProject.name}</h2>
                  <div className="text-xs text-slate-600 space-y-1">
                    <div>Status: <span className="font-medium">{selectedProject.status}</span></div>
                    <div>Phase: <span className="font-medium">{selectedProject.phase}</span></div>
                    {selectedProject.description && (
                      <div className="mt-2 text-slate-500">{selectedProject.description}</div>
                    )}
                  </div>
                </div>
              )}
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
