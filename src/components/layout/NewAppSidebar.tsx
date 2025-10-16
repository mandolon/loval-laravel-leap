import { Home, FolderKanban, CheckSquare, Settings, Plus, ChevronRight } from "lucide-react";
import { NavLink, useParams, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Separator } from "@/components/ui/separator";
import { WorkspaceSwitcher } from "@/components/WorkspaceSwitcher";
import { api } from "@/lib/api/client";

interface NewAppSidebarProps {
  onWorkspaceChange?: (workspaceId: string) => void;
}

export function NewAppSidebar({ onWorkspaceChange }: NewAppSidebarProps) {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'home' | 'workspace' | 'tasks' | 'settings'>('workspace');
  const [projectCount, setProjectCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('active');

  const currentWorkspaceId = workspaceId || api.workspaces.getCurrentWorkspaceId();

  useEffect(() => {
    updateProjectCount();
  }, [currentWorkspaceId, location.pathname]);

  const updateProjectCount = () => {
    if (currentWorkspaceId) {
      const projects = api.projects.list(currentWorkspaceId);
      setProjectCount(projects.length);
    }
  };

  const handleWorkspaceChange = (newWorkspaceId: string) => {
    api.workspaces.setCurrentWorkspaceId(newWorkspaceId);
    updateProjectCount();
    onWorkspaceChange?.(newWorkspaceId);
    
    // Navigate to the same page but with new workspace
    const currentPath = location.pathname;
    if (currentPath.includes('/workspace/')) {
      const pathParts = currentPath.split('/');
      pathParts[2] = newWorkspaceId;
      navigate(pathParts.join('/'));
    } else {
      navigate(`/workspace/${newWorkspaceId}/projects`);
    }
  };

  const getNavPath = (basePath: string) => {
    if (!currentWorkspaceId) return basePath;
    return basePath === '/' ? `/workspace/${currentWorkspaceId}` : `/workspace/${currentWorkspaceId}${basePath}`;
  };

  const navIcons = [
    { id: 'home' as const, icon: Home, label: 'Home', path: getNavPath('') },
    { id: 'workspace' as const, icon: FolderKanban, label: 'Workspace', path: getNavPath('/projects') },
    { id: 'tasks' as const, icon: CheckSquare, label: 'Tasks', path: getNavPath('/tasks') },
    { id: 'settings' as const, icon: Settings, label: 'Settings', path: getNavPath('/team') },
  ];

  const statusFilters = [
    { label: 'In Progress', value: 'active' },
    { label: 'Pending', value: 'on_hold' },
    { label: 'Completed', value: 'active' },
    { label: 'Archived', value: 'archived' },
  ];

  const handleStatusFilterClick = (value: string) => {
    setStatusFilter(value);
    if (currentWorkspaceId) {
      navigate(`/workspace/${currentWorkspaceId}/projects?status=${value}`);
    }
  };

  return (
    <aside className="w-[200px] bg-card border-r border-border flex flex-col h-screen">
      {/* Navigation Icons */}
      <div className="p-3 flex items-center justify-around border-b border-border flex-shrink-0">
        {navIcons.map((item) => (
          <NavLink
            key={item.id}
            to={item.path}
            onClick={() => setActiveTab(item.id)}
          >
            <Button
              variant="ghost"
              size="icon"
              className={`h-9 w-9 ${activeTab === item.id ? 'bg-accent text-accent-foreground' : ''}`}
            >
              <item.icon className="h-4 w-4" />
            </Button>
          </NavLink>
        ))}
      </div>

      {/* Workspace Switcher */}
      <div className="p-3 border-b border-border flex-shrink-0">
        <WorkspaceSwitcher onWorkspaceChange={handleWorkspaceChange} />
      </div>

      {/* Projects Section */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Projects
            </span>
            <Button variant="ghost" size="icon" className="h-5 w-5">
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          
          {projectCount === 0 ? (
            <>
              <div className="text-xs text-destructive mb-2">Error loading projects</div>
              <Button variant="link" className="h-auto p-0 text-xs text-primary" onClick={updateProjectCount}>
                Retry
              </Button>
            </>
          ) : (
            <div className="text-xs text-muted-foreground">
              {projectCount} {projectCount === 1 ? 'project' : 'projects'}
            </div>
          )}
        </div>

        <Separator />

        {/* Status Filters */}
        <div className="p-3 space-y-1">
          {statusFilters.map((filter) => (
            <button
              key={filter.label}
              onClick={() => handleStatusFilterClick(filter.value)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                statusFilter === filter.value
                  ? 'bg-accent/50 text-foreground'
                  : 'text-muted-foreground hover:bg-accent/30'
              }`}
            >
              <ChevronRight className="h-3 w-3" />
              {filter.label}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
