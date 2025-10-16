import { Home, FolderKanban, CheckSquare, Bot, Plus, ChevronRight, ChevronLeft, User } from "lucide-react";
import { NavLink, useParams, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Separator } from "@/components/ui/separator";
import { WorkspaceSwitcher } from "@/components/WorkspaceSwitcher";
import { CreateProjectDialog } from "@/components/CreateProjectDialog";
import { api } from "@/lib/api/client";
import type { Project } from "@/lib/api/types";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/contexts/UserContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface NewAppSidebarProps {
  onWorkspaceChange?: (workspaceId: string) => void;
}

export function NewAppSidebar({ onWorkspaceChange }: NewAppSidebarProps) {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<'home' | 'workspace' | 'tasks' | 'ai'>('workspace');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('active');

  const currentWorkspaceId = workspaceId || api.workspaces.getCurrentWorkspaceId();
  const currentWorkspace = currentWorkspaceId ? api.workspaces.get(currentWorkspaceId) : null;

  useEffect(() => {
    loadProjects();
  }, [currentWorkspaceId, location.pathname]);

  const loadProjects = () => {
    if (currentWorkspaceId) {
      const workspaceProjects = api.projects.list(currentWorkspaceId);
      setProjects(workspaceProjects);
    } else {
      setProjects([]);
    }
  };

  const handleWorkspaceChange = (newWorkspaceId: string) => {
    api.workspaces.setCurrentWorkspaceId(newWorkspaceId);
    loadProjects();
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

  const handleCreateProject = (input: Parameters<typeof api.projects.create>[0]) => {
    if (!currentWorkspaceId) {
      toast({
        title: "No workspace selected",
        description: "Please select a workspace first",
        variant: "destructive",
      });
      return;
    }

    const projectInput = {
      ...input,
      workspaceId: currentWorkspaceId,
    };

    const newProject = api.projects.create(projectInput);
    loadProjects();
    toast({
      title: "Project created",
      description: `${newProject.name} has been created successfully`,
    });
  };

  const getNavPath = (basePath: string) => {
    if (!currentWorkspaceId) return basePath;
    return basePath === '/' ? `/workspace/${currentWorkspaceId}` : `/workspace/${currentWorkspaceId}${basePath}`;
  };

  const navIcons = [
    { id: 'home' as const, icon: Home, label: 'Home', path: getNavPath('') },
    { id: 'workspace' as const, icon: FolderKanban, label: 'Workspace', path: getNavPath('/projects') },
    { id: 'tasks' as const, icon: CheckSquare, label: 'Tasks', path: getNavPath('/tasks') },
    { id: 'ai' as const, icon: Bot, label: 'AI', path: getNavPath('/ai') },
  ];

  const statusFilters = [
    { label: 'In Progress', value: 'active', type: 'status' as const },
    { label: 'Pending', value: 'on_hold', type: 'status' as const },
    { label: 'Completed', value: 'completed', type: 'phase' as const },
    { label: 'Archived', value: 'archived', type: 'status' as const },
  ];

  const handleStatusFilterClick = (filter: typeof statusFilters[0]) => {
    const filterKey = filter.type === 'phase' ? 'phase' : 'status';
    const filterValue = filter.value;
    setStatusFilter(filterValue);
    if (currentWorkspaceId) {
      navigate(`/workspace/${currentWorkspaceId}/projects?${filterKey}=${filterValue}`);
    }
  };

  const homeLinks = [
    { label: 'Home', path: getNavPath('') },
    { label: 'Users', path: getNavPath('/team') },
    { label: 'Invoices', path: getNavPath('/invoices') },
    { label: 'Work Records', path: getNavPath('/work-records') },
  ];

  const taskFilters = [
    { label: 'All Tasks', count: projects.flatMap(p => api.tasks.list(p.id)).length },
    { label: 'My Tasks', count: 0 },
    { label: 'Completed', count: projects.flatMap(p => api.tasks.list(p.id)).filter(t => t.status === 'complete').length },
  ];

  // Render dynamic content based on active tab
  const renderDynamicContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <div className="p-3 space-y-1">
            {homeLinks.map((link) => (
              <NavLink
                key={link.label}
                to={link.path}
                className={({ isActive }) => `
                  w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors
                  ${isActive ? 'bg-accent text-foreground' : 'text-muted-foreground hover:bg-accent/30'}
                `}
              >
                {link.label}
              </NavLink>
            ))}
          </div>
        );

      case 'workspace':
        return (
          <>
            <div className="p-3">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Projects
                </span>
                <CreateProjectDialog onCreateProject={handleCreateProject}>
                  <Button variant="ghost" size="icon" className="h-5 w-5">
                    <Plus className="h-3 w-3" />
                  </Button>
                </CreateProjectDialog>
              </div>
              
              <div className="space-y-1 max-h-[200px] overflow-y-auto">
                {projects.length === 0 ? (
                  <div className="text-xs text-muted-foreground py-2">
                    No projects yet
                  </div>
                ) : (
                  projects.slice(0, 5).map((project) => (
                    <button
                      key={project.id}
                      onClick={() => navigate(`/workspace/${currentWorkspaceId}/project/${project.id}`)}
                      className="w-full text-left px-2 py-1.5 rounded text-xs text-muted-foreground hover:bg-accent/30 transition-colors truncate"
                    >
                      {project.name}
                    </button>
                  ))
                )}
              </div>
            </div>
          </>
        );

      case 'tasks':
        return (
          <div className="p-3 space-y-1">
            {taskFilters.map((filter) => (
              <button
                key={filter.label}
                className="w-full flex items-center justify-between px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-accent/30 transition-colors"
              >
                <span>{filter.label}</span>
                <span className="text-xs bg-accent/50 px-2 py-0.5 rounded">{filter.count}</span>
              </button>
            ))}
          </div>
        );

      case 'ai':
        return (
          <div className="p-3">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Chats
              </span>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-5 w-5"
                onClick={() => currentWorkspaceId && navigate(`/workspace/${currentWorkspaceId}/ai`)}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
            <div className="text-xs text-muted-foreground py-2">
              No chats yet
            </div>
          </div>
        );
    }
  };

  return (
    <aside className={`${isCollapsed ? 'w-16' : 'w-[240px]'} bg-card border-r border-border flex flex-col h-full transition-all duration-300`}>
      {/* 1. User Profile Section */}
      <div className="p-3 border-b border-border flex-shrink-0">
        <div className="flex items-center justify-between">
          {!isCollapsed && user && (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {user.first_name} {user.last_name}
                </p>
                <p className="text-xs text-muted-foreground truncate capitalize">
                  {user.role}
                </p>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 flex-shrink-0"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            <ChevronLeft className={`h-4 w-4 transition-transform ${isCollapsed ? 'rotate-180' : ''}`} />
          </Button>
        </div>
      </div>

      {/* 2. Navigation Icons */}
      <div className={`p-3 border-b border-border flex-shrink-0 ${isCollapsed ? 'flex-col space-y-2' : 'flex items-center justify-around'}`}>
        {navIcons.map((item) => (
          <NavLink
            key={item.id}
            to={item.path}
            onClick={() => setActiveTab(item.id)}
            title={item.label}
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

      {/* 3. Dynamic Content Area */}
      {!isCollapsed && (
        <div className="flex-1 overflow-y-auto min-h-0">
          {renderDynamicContent()}
        </div>
      )}

      {/* 4. Status Filters (Bottom Section) */}
      {!isCollapsed && (
        <div className="border-t border-border flex-shrink-0">
          <div className="p-3 space-y-1">
            {statusFilters.map((filter) => (
              <button
                key={filter.label}
                onClick={() => handleStatusFilterClick(filter)}
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
      )}

      {/* 5. Footer with Workspace Selector */}
      {!isCollapsed && (
        <div className="p-3 border-t border-border flex-shrink-0">
          <WorkspaceSwitcher onWorkspaceChange={handleWorkspaceChange} />
        </div>
      )}
    </aside>
  );
}
