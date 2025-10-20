import { Home, FolderKanban, CheckSquare, Bot, Plus, ChevronRight, ChevronLeft, Sun, Moon, Trash2 } from "lucide-react";
import { NavLink, useParams, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { WorkspaceSwitcher } from "@/components/WorkspaceSwitcher";
import { CreateProjectDialog } from "@/components/CreateProjectDialog";
import { AIChatThreadsList } from "@/components/chat/AIChatThreadsList";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspaces } from "@/hooks/useWorkspaces";
import type { Project } from "@/lib/api/types";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/contexts/UserContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useTheme } from "next-themes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface SandboxSidebarProps {
  onWorkspaceChange?: (workspaceId: string) => void;
}

const T = {
  border: "border-[#1d2230] dark:border-[#1d2230]",
  borderSubtle: "border-[#1a2030]/60 dark:border-[#1a2030]/60",
  radius: "rounded-[8px]",
  radiusSmall: "rounded-[6px]",
  text: "text-[12px]",
  textSmall: "text-[11px]",
  focus: "focus:outline-none focus:ring-1 focus:ring-[#3b82f6]/40",
};

export function SandboxSidebar({ onWorkspaceChange }: SandboxSidebarProps) {
  const { workspaceId, id: projectId } = useParams<{ workspaceId: string; id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user, signOut } = useUser();
  const { theme, setTheme } = useTheme();
  const { currentWorkspace, currentWorkspaceId, refetch: refetchWorkspaces } = useWorkspaces();
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

  const handleWorkspaceChange = async (newWorkspaceId: string) => {
    localStorage.setItem("current_workspace_id", newWorkspaceId);
    await refetchWorkspaces();
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
    { label: 'Sandbox', path: getNavPath('/sandbox') },
  ];

  // Render dynamic content based on active tab
  const renderDynamicContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <div className="flex flex-col items-start justify-start px-3 pb-3 space-y-2">
            {homeLinks.map((link) => (
              <NavLink
                key={link.label}
                to={link.path}
                className={({ isActive }) => `
                  px-2.5 py-1 ${T.radius} w-full text-left transition-colors
                  ${isActive ? 'bg-[#141C28] dark:bg-[#141C28] text-blue-300 dark:text-blue-300' : 'text-neutral-400 dark:text-neutral-400 hover:bg-[#141C28] dark:hover:bg-[#141C28] hover:text-blue-300 dark:hover:text-blue-300'} ${T.focus}
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
            <div className="flex flex-col items-start justify-start px-3 py-2 space-y-2">
              <div className="w-full space-y-2 max-h-[200px] overflow-y-auto">
                {filteredProjects.length === 0 ? (
                  <div className={`${T.text} text-neutral-500 py-1 px-2.5`}>
                    No {statusFilter} projects
                  </div>
                ) : (
                  filteredProjects.slice(0, 5).map((project) => {
                    const isActive = projectId === project.id;
                    return (
                      <button
                        key={project.id}
                        type="button"
                        onClick={() => navigate(`/workspace/${currentWorkspaceId}/project/${project.id}`)}
                        className={`px-2.5 py-1 ${T.radius} w-full text-left transition-colors ${
                          isActive 
                            ? 'bg-[#141C28] dark:bg-[#141C28] text-blue-300 dark:text-blue-300' 
                            : 'text-neutral-400 dark:text-neutral-400 hover:bg-[#141C28] dark:hover:bg-[#141C28] hover:text-blue-300 dark:hover:text-blue-300'
                        } ${T.focus}`}
                        aria-current={isActive ? 'true' : undefined}
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
          <div className="flex flex-col items-start justify-start px-3 pb-3 space-y-2">
            <NavLink
              to={getNavPath('/tasks')}
              className={({ isActive }) => `
                px-2.5 py-1 ${T.radius} w-full text-left transition-colors
                ${isActive && !location.search ? 'bg-[#141C28] dark:bg-[#141C28] text-blue-300 dark:text-blue-300' : 'text-neutral-400 dark:text-neutral-400 hover:bg-[#141C28] dark:hover:bg-[#141C28] hover:text-blue-300 dark:hover:text-blue-300'} ${T.focus}
              `}
            >
              <span>All Tasks</span>
            </NavLink>
            <NavLink
              to={getNavPath('/tasks?view=my-tasks')}
              className={({ isActive }) => `
                px-2.5 py-1 ${T.radius} w-full text-left transition-colors
                ${location.search.includes('my-tasks') ? 'bg-[#141C28] dark:bg-[#141C28] text-blue-300 dark:text-blue-300' : 'text-neutral-400 dark:text-neutral-400 hover:bg-[#141C28] dark:hover:bg-[#141C28] hover:text-blue-300 dark:hover:text-blue-300'} ${T.focus}
              `}
            >
              <span>My Tasks</span>
            </NavLink>
            <NavLink
              to={getNavPath('/tasks?view=completed')}
              className={({ isActive }) => `
                px-2.5 py-1 ${T.radius} w-full text-left transition-colors
                ${location.search.includes('completed') ? 'bg-[#141C28] dark:bg-[#141C28] text-blue-300 dark:text-blue-300' : 'text-neutral-400 dark:text-neutral-400 hover:bg-[#141C28] dark:hover:bg-[#141C28] hover:text-blue-300 dark:hover:text-blue-300'} ${T.focus}
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
    <aside className={`${isCollapsed ? 'w-16' : 'w-[200px]'} bg-[#0F1219] dark:bg-[#0F1219] border-r ${T.borderSubtle} flex flex-col h-full transition-all duration-300`}>
      {/* 1. User Profile Section */}
      <div className={`py-2 px-3 border-b border-[#1d2230] dark:border-[#1d2230] flex-shrink-0 bg-[#0E1118] dark:bg-[#0E1118]`}>
        {isCollapsed ? (
          <div className="flex justify-center">
            <button
              className={`h-8 w-8 flex items-center justify-center rounded-[6px] text-neutral-400 hover:bg-[#141C28] dark:hover:bg-[#141C28] transition-colors ${T.focus}`}
              onClick={() => setIsCollapsed(!isCollapsed)}
            >
              <ChevronLeft className="h-4 w-4 rotate-180" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            {user && (
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="flex-1 min-w-0">
                  <p className={`text-[11px] font-medium truncate text-neutral-300 dark:text-neutral-300`}>
                    {user.name}
                  </p>
                  <p className={`text-[10px] text-neutral-500 dark:text-neutral-500 truncate`}>
                    {user.is_admin ? 'Admin' : user.email}
                  </p>
                </div>
              </div>
            )}
            <button
              className={`h-8 w-8 flex items-center justify-center rounded-[6px] text-neutral-400 hover:bg-[#141C28] dark:hover:bg-[#141C28] transition-colors flex-shrink-0 ${T.focus}`}
              onClick={() => setIsCollapsed(!isCollapsed)}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* 2. Navigation Icons */}
      <div className={`px-2 py-3 border-b ${T.borderSubtle} flex-shrink-0 ${isCollapsed ? 'flex flex-col items-center space-y-2' : 'flex items-center justify-center gap-1'}`}>
        {navIcons.map((item) => (
          <NavLink
            key={item.id}
            to={item.path}
            onClick={() => setActiveTab(item.id)}
            title={item.label}
          >
            <button
              className={`h-10 w-10 flex items-center justify-center ${T.radiusSmall} transition-colors ${T.focus} ${
                activeTab === item.id 
                  ? 'bg-[#141C28] text-blue-300' 
                  : 'text-neutral-400 hover:bg-[#141C28]/60'
              }`}
            >
              <item.icon className="h-5 w-5" />
            </button>
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
        <div className={`border-t ${T.borderSubtle} flex-shrink-0`}>
          <div className="flex flex-col items-start justify-start px-3 py-2 space-y-2">
            {statusFilters.map((filter) => (
              <button
                key={filter.label}
                type="button"
                onClick={() => handleStatusFilterClick(filter)}
                className={`px-2.5 py-1 ${T.radius} w-full text-left transition-colors ${
                  statusFilter === filter.value
                    ? 'bg-[#141C28] dark:bg-[#141C28] text-blue-300 dark:text-blue-300'
                    : 'text-neutral-400 dark:text-neutral-400 hover:bg-[#141C28] dark:hover:bg-[#141C28] hover:text-blue-300 dark:hover:text-blue-300'
                } ${T.focus}`}
                aria-current={statusFilter === filter.value ? 'true' : undefined}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 5. Footer with Workspace Selector or Avatar */}
      <div className={`h-10 px-3 flex items-center justify-between border-t border-[#1a2030]/40 dark:border-[#1a2030]/40 bg-[#0E1118] dark:bg-[#0E1118] text-neutral-400 dark:text-neutral-400 flex-shrink-0 mt-auto`}>
        {isCollapsed ? (
          <div className="flex justify-center w-full">
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className={`h-7 w-7 rounded-full p-0 ${T.focus}`}>
                    <Avatar className="h-7 w-7">
                      <AvatarFallback 
                        className="text-white text-[10px] font-semibold"
                        style={{ background: user.avatar_url || 'linear-gradient(135deg, hsl(280, 70%, 60%) 0%, hsl(320, 80%, 65%) 100%)' }}
                      >
                        {user.initials}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-[#0E1118] border-[#1d2230]">
                  <DropdownMenuItem 
                    onClick={() => navigate('/profile')}
                    className="text-neutral-300 hover:bg-[#141C28] hover:text-blue-300 focus:bg-[#141C28] focus:text-blue-300"
                  >
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => currentWorkspaceId && navigate(`/workspace/${currentWorkspaceId}/trash`)}
                    className="text-neutral-300 hover:bg-[#141C28] hover:text-blue-300 focus:bg-[#141C28] focus:text-blue-300"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Trash
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-neutral-300 hover:bg-[#141C28] hover:text-blue-300 focus:bg-[#141C28] focus:text-blue-300">
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-[#1d2230]" />
                  <DropdownMenuItem 
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    className="text-neutral-300 hover:bg-[#141C28] hover:text-blue-300 focus:bg-[#141C28] focus:text-blue-300"
                  >
                    {theme === 'dark' ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
                    {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-[#1d2230]" />
                  <DropdownMenuItem 
                    onClick={signOut}
                    className="text-neutral-300 hover:bg-[#141C28] hover:text-blue-300 focus:bg-[#141C28] focus:text-blue-300"
                  >
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        ) : (
          <div className="w-full">
            <WorkspaceSwitcher onWorkspaceChange={handleWorkspaceChange} />
          </div>
        )}
      </div>
    </aside>
  );
}
