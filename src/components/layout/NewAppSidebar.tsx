import { Home, FolderKanban, CheckSquare, Bot, Plus, ChevronRight, ChevronLeft } from "lucide-react";
import { NavLink, useParams, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Separator } from "@/components/ui/separator";
import { WorkspaceSwitcher } from "@/components/WorkspaceSwitcher";
import { CreateProjectDialog } from "@/components/CreateProjectDialog";
import { AIChatThreadsList } from "@/components/chat/AIChatThreadsList";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspaces } from "@/hooks/useWorkspaces";
import type { Project } from "@/lib/api/types";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/contexts/UserContext";

interface NewAppSidebarProps {
  onWorkspaceChange?: (workspaceId: string) => void;
}

export function NewAppSidebar({ onWorkspaceChange }: NewAppSidebarProps) {
  const { workspaceId, id: projectId } = useParams<{ workspaceId: string; id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user } = useUser();
  const { currentWorkspace, currentWorkspaceId } = useWorkspaces();
  const [activeTab, setActiveTab] = useState<'home' | 'workspace' | 'tasks' | 'ai'>('workspace');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('active');

  useEffect(() => {
    if (currentWorkspaceId || workspaceId) {
      loadProjects();
    }
  }, [currentWorkspaceId, workspaceId, location.pathname]);

  // Realtime subscription for projects in sidebar
  useEffect(() => {
    const wsId = workspaceId || currentWorkspaceId;
    if (!wsId) return;

    const channel = supabase
      .channel('sidebar-projects-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'projects',
          filter: `workspace_id=eq.${wsId}`
        },
        () => {
          loadProjects();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentWorkspaceId, workspaceId]);

  const loadProjects = async () => {
    const wsId = workspaceId || currentWorkspaceId;
    if (!wsId) return;

    try {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("workspace_id", wsId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error("Error loading projects:", error);
    }
  };

  const handleWorkspaceChange = (newWorkspaceId: string) => {
    localStorage.setItem("current_workspace_id", newWorkspaceId);
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

  const handleCreateProject = async (input: any) => {
    const wsId = workspaceId || currentWorkspaceId;
    if (!wsId || !user?.id) {
      toast({
        title: "No workspace selected",
        description: "Please select a workspace first",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: newProject, error } = await supabase
        .from("projects")
        .insert({
          workspace_id: wsId,
          name: input.name,
          description: input.description || null,
          status: input.status || "active",
          phase: input.phase || "Pre-Design",
          address: input.address || {},
          primary_client_first_name: input.primaryClient?.firstName || null,
          primary_client_last_name: input.primaryClient?.lastName || null,
          primary_client_email: input.primaryClient?.email || null,
          primary_client_phone: input.primaryClient?.phone || null,
          secondary_client_first_name: input.secondaryClient?.firstName || null,
          secondary_client_last_name: input.secondaryClient?.lastName || null,
          secondary_client_email: input.secondaryClient?.email || null,
          secondary_client_phone: input.secondaryClient?.phone || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      await loadProjects();
      toast({
        title: "Project created",
        description: `${newProject.name} has been created successfully`,
      });
    } catch (error) {
      console.error("Error creating project:", error);
      toast({
        title: "Error",
        description: "Failed to create project",
        variant: "destructive",
      });
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
    { id: 'ai' as const, icon: Bot, label: 'AI', path: getNavPath('/ai') },
  ];

  const statusFilters = [
    { label: 'In Progress', value: 'active' },
    { label: 'Pending', value: 'pending' },
    { label: 'Completed', value: 'completed' },
    { label: 'Archived', value: 'archived' },
  ];

  const handleStatusFilterClick = (filter: typeof statusFilters[0]) => {
    const filterValue = filter.value;
    setStatusFilter(filterValue);
    if (currentWorkspaceId) {
      navigate(`/workspace/${currentWorkspaceId}/projects?status=${filterValue}`);
    }
  };

  const homeLinks = [
    { label: 'Home', path: getNavPath('') },
    { label: 'Users', path: getNavPath('/team') },
    { label: 'Invoices', path: getNavPath('/invoices') },
    { label: 'Work Records', path: getNavPath('/work-records') },
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
                  w-full flex items-center gap-2 px-3 py-2 rounded-md text-base font-medium transition-colors
                  ${isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/50'}
                `}
              >
                {link.label}
              </NavLink>
            ))}
          </div>
        );

      case 'workspace':
        const filteredProjects = projects.filter(project => project.status === statusFilter);
        return (
          <>
            <div className="p-3">
              <div className="space-y-1 max-h-[200px] overflow-y-auto">
                {filteredProjects.length === 0 ? (
                  <div className="text-base text-muted-foreground py-2 px-3">
                    No {statusFilter} projects
                  </div>
                ) : (
                  filteredProjects.slice(0, 5).map((project) => {
                    const isActive = projectId === project.id;
                    return (
                      <button
                        key={project.id}
                        onClick={() => navigate(`/workspace/${currentWorkspaceId}/project/${project.id}`)}
                        className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-md text-base font-medium transition-colors truncate ${
                          isActive 
                            ? 'bg-accent text-accent-foreground' 
                            : 'text-muted-foreground hover:bg-accent/50'
                        }`}
                      >
                        <span className="truncate">{project.name}</span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </>
        );

      case 'tasks':
        return (
          <div className="p-3 space-y-1">
            <NavLink
              to={getNavPath('/tasks')}
              className={({ isActive }) => `
                w-full flex items-center justify-between px-3 py-2 rounded-md text-base font-medium transition-colors
                ${isActive && !location.search ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/50'}
              `}
            >
              <span>All Tasks</span>
            </NavLink>
            <NavLink
              to={getNavPath('/tasks?view=my-tasks')}
              className={({ isActive }) => `
                w-full flex items-center justify-between px-3 py-2 rounded-md text-base font-medium transition-colors
                ${location.search.includes('my-tasks') ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/50'}
              `}
            >
              <span>My Tasks</span>
            </NavLink>
            <NavLink
              to={getNavPath('/tasks?view=completed')}
              className={({ isActive }) => `
                w-full flex items-center justify-between px-3 py-2 rounded-md text-base font-medium transition-colors
                ${location.search.includes('completed') ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/50'}
              `}
            >
              <span>Completed</span>
            </NavLink>
          </div>
        );

      case 'ai':
        return <AIChatThreadsList workspaceId={currentWorkspaceId || workspaceId || ''} />;
    }
  };

  return (
    <aside className={`${isCollapsed ? 'w-14' : 'w-[200px]'} bg-card border-r border-border flex flex-col h-full transition-all duration-300`}>
      {/* 1. User Profile Section */}
      <div className="pt-3 pr-3 pb-3 border-b border-border flex-shrink-0">
        <div className="flex items-center justify-between">
          {!isCollapsed && user && (
            <div className="flex items-center gap-2 flex-1 min-w-0 pl-6">
              <div className="flex-1 min-w-0">
                <p className="text-base font-semibold truncate">
                  {user.name}
                </p>
                <p className="text-base text-muted-foreground truncate">
                  {user.is_admin ? 'Admin' : user.email}
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
      <div className={`px-3 py-3 border-b border-border flex-shrink-0 ${isCollapsed ? 'flex flex-col items-center space-y-1' : 'flex flex-wrap items-center justify-center gap-2'}`}>
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
              className={`h-8 w-8 ${activeTab === item.id ? 'bg-accent text-accent-foreground' : ''}`}
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

      {/* 4. Project Status Filters */}
      {!isCollapsed && activeTab === 'workspace' && (
        <div className="border-t border-border flex-shrink-0">
          <div className="p-3 space-y-1">
            {statusFilters.map((filter) => (
              <button
                key={filter.label}
                onClick={() => handleStatusFilterClick(filter)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-base transition-colors ${
                  statusFilter === filter.value
                    ? 'bg-accent text-accent-foreground font-medium'
                    : 'text-muted-foreground hover:bg-accent/50'
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
