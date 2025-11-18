import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  useMemo,
  memo,
} from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { useRoleAwareNavigation } from "@/hooks/useRoleAwareNavigation";
import { ProjectInfoContent } from './ProjectInfoContent';
import { ProjectAIContextView } from './ProjectAIContextView';
import {
  Home,
  FolderKanban,
  CheckSquare,
  Sparkles,
  Book,
  MessageSquare,
  Settings,
  ChevronLeft,
  ChevronRight,
  Check,
  Plus,
  Trash2,
} from "lucide-react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from "@tanstack/react-table";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { useWorkspaces } from "@/hooks/useWorkspaces";
import { useCreateProject } from "@/lib/api/hooks/useProjects";
import { useWorkspaceMessages } from "@/lib/api/hooks/useWorkspaceChat";
import { CreateProjectModal } from "@/components/CreateProjectModal";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { TeamAvatarMenu } from "./TeamAvatarMenu";
import ProjectPanel from "./ProjectPanel";
import { WorkspaceSwitcher } from "@/components/WorkspaceSwitcher";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { WorkspaceMembersTable } from "@/components/workspace/WorkspaceMembersTable";
import { ExcelExportImport } from "@/components/workspace/ExcelExportImport";
import TeamFileViewer from "./viewers/TeamFileViewer";
import Team3DModelViewer from "./viewers/Team3DModelViewer";
import ExcalidrawCanvas from '@/components/drawings/ExcalidrawCanvas';
import { DrawingErrorBoundary } from '@/components/drawings/DrawingErrorBoundary';
import { SCALE_PRESETS, getInchesPerSceneUnit, type ScalePreset, type ArrowCounterStats } from '@/utils/excalidraw-measurement-tools';
import type { Task, User } from '@/lib/api/types';
import { useWorkspaceTasks, useCreateTask, useUpdateTask, useDeleteTask, taskKeys } from '@/lib/api/hooks/useTasks';
import { useUploadTaskFile } from '@/lib/api/hooks/useFiles';
import { useProjects } from '@/lib/api/hooks/useProjects';
import { TasksTable } from './TasksTable';
import TaskDrawer from '@/components/TaskDrawer';
import { TeamDetailLibraryView } from './TeamDetailLibraryView';
import { useWorkspaceChatUnreadCount } from '@/lib/api/hooks/useChatReadReceipts';
import { Calendar } from '@/components/ui/calendar';

// ----------------------------------
// Theme & constants
// ----------------------------------
const RAIL_GRADIENT = `
  linear-gradient(180deg, hsl(222 47% 10%) 0%, hsl(222 47% 8%) 55%, hsl(222 47% 6%) 100%),
  radial-gradient(80% 50% at 50% 0%, hsl(213 94% 68% / 0.14), transparent),
  radial-gradient(80% 50% at 50% 100%, hsl(259 94% 68% / 0.12), transparent)
`.trim();

const HOVER_DELAY_MS = 250;
const CLOSE_DELAY_MS = 150;
const DOUBLE_TAP_MS = 300;
const LONG_PRESS_MS = 600;

// ----------------------------------
// TypeScript Interfaces
// ----------------------------------
interface SettingsRailItemProps {
  active: boolean;
  currentWorkspaceId: string;
  navigate: (path: string) => void;
  navigateToWorkspace: (path: string) => void;
  setActive: (tab: string) => void;
}

interface RailItemProps {
  tabKey: string;
  label: string;
  icon: any;
  active: boolean;
  items?: string[];
  openTab: string | null;
  setOpenTab: React.Dispatch<React.SetStateAction<string | null>>;
  selected: { tab: string; item: string } | null;
  setSelected: React.Dispatch<React.SetStateAction<{ tab: string; item: string } | null>>;
  onActivate: () => void;
  menuEnabled?: boolean;
  onCreateProject?: (input: any) => void;
  currentWorkspaceId?: string;
  hasNotification?: boolean;
}

interface TopHeaderProps {
  railCollapsed: boolean;
  setRailCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  mdUp: boolean;
}

interface PageHeaderProps {
  tabKey: string;
  title: string;
  selected?: { tab: string; item: string } | null;
  projectPanelCollapsed?: boolean;
  onToggleProjectPanel?: () => void;
  projectName?: string;
}

interface TabsRowProps {
  tabs: Array<{ key: string; label: string; icon: React.ReactNode }>;
  active: string;
  onChange: (key: string) => void;
}

// ----------------------------------
// Media hook (for sidebar peek on md+)
// ----------------------------------
function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches
  );

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

// ----------------------------------
// Maps / data
// ----------------------------------
const ICON_MAP = {
  home: Home,
  projects: FolderKanban,
  tasks: CheckSquare,
  ai: Sparkles,
  chat: MessageSquare,
  details: Book,
  settings: Settings,
};

const TITLES = {
  home: "Home",
  projects: "Projects",
  tasks: "Tasks",
  ai: "MyHome AI",
  chat: "Chat",
  details: "Detail Library",
  settings: "Settings",
};

const ITEMS_CONFIG = {
  home: ["Inbox", "Replies", "My Tasks", "Posts"],
  projects: [], // Removed hardcoded projects - using real data from database
};

// ----------------------------------
// Root App
// ----------------------------------
export default function RehomeDoubleSidebar({ children }: { children?: React.ReactNode }) {
  const [active, setActive] = useState("home");
  const [openTab, setOpenTab] = useState<string | null>(null);
  const [selected, setSelected] = useState<{ tab: string; item: string } | null>(null);
  const [railCollapsed, setRailCollapsed] = useState(false);
  const [projectPanelCollapsed, setProjectPanelCollapsed] = useState(false);
  const [autoCollapsedProjectPanel, setAutoCollapsedProjectPanel] = useState(false);
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [selectedWhiteboard, setSelectedWhiteboard] = useState<{ pageId: string; pageName: string; versionTitle: string } | null>(null);
  const [selectedModel, setSelectedModel] = useState<{ versionId: string; versionNumber: string; modelFile: any; settings: any } | null>(null);
  const [showArrowStats, setShowArrowStats] = useState(true); // Toggle visibility of stats display
  const [currentScale, setCurrentScale] = useState<ScalePreset>("1/4\" = 1'");
  const [arrowStats, setArrowStats] = useState<ArrowCounterStats>({ count: 0, values: [] });
  const [inchesPerSceneUnit, setInchesPerSceneUnit] = useState<number>(getInchesPerSceneUnit(SCALE_PRESETS["1/4\" = 1'"]));
  const [pxPerStep, setPxPerStep] = useState(0.668); // Calibration state
  const [chatResetTrigger, setChatResetTrigger] = useState(0);
  const mdUp = useMediaQuery("(min-width: 768px)");
  const { currentWorkspaceId } = useWorkspaces();
  const { user } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const { navigateToWorkspace, role } = useRoleAwareNavigation(currentWorkspaceId || undefined);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createProjectMutation = useCreateProject(currentWorkspaceId || "");

  // Fetch workspace messages to check for unread
  const { data: workspaceMessages = [] } = useWorkspaceMessages(currentWorkspaceId || "");

  // Set up realtime subscription for instant notification updates
  useEffect(() => {
    if (!currentWorkspaceId) return;

    const channel = supabase
      .channel('dashboard-workspace-messages-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workspace_chat_messages',
          filter: `workspace_id=eq.${currentWorkspaceId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['workspace-chat', currentWorkspaceId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentWorkspaceId, queryClient]);

  // Check if workspace has unread messages using database-backed read receipts
  const { data: workspaceUnreadCount = 0 } = useWorkspaceChatUnreadCount(
    currentWorkspaceId || '',
    user?.id || ''
  );
  const hasUnreadWorkspaceMessages = workspaceUnreadCount > 0;

  // Sync active state with URL
  useEffect(() => {
    const path = location.pathname;
    
    if (path.includes('/settings')) {
      setActive('settings');
    } else if (path.includes('/chat')) {
      setActive('chat');
    } else if (path.includes('/home')) {
      setActive('home');
    } else if (path.includes('/projects')) {
      setActive('projects');
    } else if (path.includes('/tasks')) {
      setActive('tasks');
    } else if (path.includes('/ai')) {
      setActive('ai');
    } else if (path.includes('/detail-library')) {
      setActive('details');
    } else if (path.endsWith(`/workspace/${currentWorkspaceId}`)) {
      setActive('home');
    }
  }, [location.pathname, currentWorkspaceId]);

  const handleChatActivate = useCallback(() => {
    setActive("chat");
    navigateToWorkspace("/chat");
    setChatResetTrigger(prev => prev + 1);
  }, [navigateToWorkspace, setChatResetTrigger]);

  const handleCalibration = useCallback(() => {
    window.dispatchEvent(new Event('trigger-calibration'));
  }, []);

  // Read URL parameters early for use in effects
  const [searchParams, setSearchParams] = useSearchParams();
  const urlProjectId = searchParams.get('projectId');
  const urlFileId = searchParams.get('fileId');
  const urlWhiteboardPageId = searchParams.get('whiteboardPageId');

  const handleCreateProject = useCallback(async (input: any) => {
    if (!currentWorkspaceId || !user?.id) {
      toast({
        title: "No workspace selected",
        description: "Please select a workspace first",
        variant: "destructive",
      });
      return;
    }

    createProjectMutation.mutate(input, {
      onSuccess: async (newProject) => {
        // For non-admin users, add them as a project member so they can see the project
        if (!user.is_admin) {
          try {
            // Generate short_id for project_member
            const shortId = `PM-${Math.random().toString(36).substring(2, 6)}`;
            
            const { error: memberError } = await supabase
              .from('project_members')
              .insert({
                short_id: shortId,
                project_id: newProject.id,
                user_id: user.id,
              });

            if (memberError) {
              console.error('Error adding user as project member:', memberError);
              // Don't fail the whole operation, just log the error
            }
          } catch (error) {
            console.error('Error adding user as project member:', error);
          }
        }

        // Invalidate projects query to refresh the list
        queryClient.invalidateQueries({ queryKey: ['team-user-projects', currentWorkspaceId, user.id, user.is_admin] });
        toast({
          title: "Project created",
          description: `${newProject.name} has been created successfully`,
        });
      },
    });
  }, [currentWorkspaceId, createProjectMutation, queryClient, user, toast]);

  // Fetch user's projects for the current workspace
  // Admin users see ALL projects in workspace, non-admin users see only projects they're members of
  const { data: userProjects = [] } = useQuery({
    queryKey: ['team-user-projects', currentWorkspaceId, user?.id, user?.is_admin],
    queryFn: async () => {
      if (!currentWorkspaceId || !user?.id) {
        console.log('Missing workspace or user:', { currentWorkspaceId, userId: user?.id });
        return [];
      }
      
      // ADMIN: Fetch ALL projects in workspace
      if (user.is_admin) {
        const { data, error } = await supabase
          .from('projects')
          .select('id, name')
          .eq('workspace_id', currentWorkspaceId)
          .is('deleted_at', null)
          .order('name');

        if (error) {
          console.error('Error fetching admin projects:', error);
          return [];
        }

        console.log('Fetched admin projects:', data);
        return data || [];
      }

      // NON-ADMIN: Fetch only projects where user is a member
      const { data, error } = await supabase
        .from('project_members')
        .select(`
          project_id,
          projects!inner (
            id,
            name
          )
        `)
        .eq('user_id', user.id)
        .eq('projects.workspace_id', currentWorkspaceId)
        .is('deleted_at', null)
        .is('projects.deleted_at', null);

      if (error) {
        console.error('Error fetching user projects:', error);
        return [];
      }

      const projects = data?.map((pm: any) => ({ id: pm.projects.id, name: pm.projects.name })) || [];
      return projects;
    },
    enabled: !!currentWorkspaceId && !!user?.id,
  });

  // No fallback to hardcoded data - show empty list if no projects exist
  const projectItems = userProjects.map((p: any) => p.name);

  const projectPanelTab = searchParams.get('projectTab') || 'files';
  const isInfoTabActive = projectPanelTab === 'info';
  const isAITabActive = projectPanelTab === 'ai';

  // Restore project selection from URL on load
  useEffect(() => {
    if (!urlProjectId || !userProjects.length || active !== 'projects') return;
    
    const project = userProjects.find((p: any) => p.id === urlProjectId);
    if (project && selected?.item !== project.name) {
      // Sync the selected state with URL when projectId changes
      setSelected({ tab: 'projects', item: project.name });
    }
  }, [urlProjectId, userProjects, active]);

  // Update URL when project selection changes (skip if we're on info tab to avoid conflicts)
  useEffect(() => {
    if (active !== 'projects' || !selected?.item) return;
    // Skip URL updates when on info tab - ProjectInfoNavigation handles those
    if (projectPanelTab === 'info') return;
    
    const project = userProjects.find((p: any) => p.name === selected.item);
    if (project && urlProjectId !== project.id) {
      setSearchParams(prev => {
        const newParams = new URLSearchParams(prev);
        newParams.set('projectId', project.id);
        return newParams;
      }, { replace: true });
    }
  }, [selected?.item, userProjects, active, urlProjectId, setSearchParams, projectPanelTab, selectedWhiteboard]);

  // Update URL when file selection changes
  useEffect(() => {
    if (!selectedFile || active !== 'projects') return;
    
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      if (selectedFile.id) {
        newParams.set('fileId', selectedFile.id);
        newParams.delete('whiteboardPageId');
      }
      return newParams;
    }, { replace: true });
  }, [selectedFile, active, setSearchParams]);

  // Update URL when whiteboard selection changes
  useEffect(() => {
    if (!selectedWhiteboard || active !== 'projects') return;
    
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      if (selectedWhiteboard.pageId) {
        newParams.set('whiteboardPageId', selectedWhiteboard.pageId);
        newParams.delete('fileId');
      }
      return newParams;
    }, { replace: true });
  }, [selectedWhiteboard, active, setSearchParams]);

  // Auto-collapse project panel on small screens
  useEffect(() => {
    let autoCollapsedRef = false;
    
    const handleResize = () => {
      const width = window.innerWidth;
      const shouldCollapse = width < 1400; // Breakpoint at 1400px
      
      setProjectPanelCollapsed(prev => {
        if (shouldCollapse && !prev) {
          autoCollapsedRef = true;
          setAutoCollapsedProjectPanel(true);
          return true;
        } else if (!shouldCollapse && autoCollapsedRef) {
          autoCollapsedRef = false;
          setAutoCollapsedProjectPanel(false);
          return false;
        }
        return prev;
      });
    };

    // Check on mount
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []); // Empty dependency array


  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Soft background */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(45rem 30rem at 50% 4%, hsl(215 75% 94%) 0%, hsl(220 35% 97%) 35%, hsl(0 0% 100%) 100%)",
        }}
      />

      {/* Top header */}
      <TopHeader
        railCollapsed={railCollapsed}
        setRailCollapsed={setRailCollapsed}
        mdUp={mdUp}
      />

      {/* Fixed narrow rail */}
      <aside
        className="fixed left-1.5 top-1.5 bottom-1.5 w-16 z-40 text-white rounded-xl shadow-xl border border-white/10 backdrop-blur-md flex flex-col items-center pt-3 gap-0"
        style={{
          background: RAIL_GRADIENT,
          transform: railCollapsed
            ? mdUp
              ? "translateX(calc(-100% + 6px))"
              : "translateX(-100%)"
            : "translateX(0)",
          transition: "transform 260ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        <div className="h-8 w-8" />
        <div className="my-2 h-px w-8 bg-white/10" />

        {["home", "chat", "projects"].map((tab) => (
          <RailItem
            key={tab}
            tabKey={tab}
            label={TITLES[tab as keyof typeof TITLES]}
            icon={ICON_MAP[tab as keyof typeof ICON_MAP]}
            active={active === tab}
            items={tab === "projects" ? projectItems : ITEMS_CONFIG[tab as keyof typeof ITEMS_CONFIG]}
            openTab={openTab}
            setOpenTab={setOpenTab}
            selected={selected}
            setSelected={setSelected}
            onActivate={tab === "chat" ? handleChatActivate : tab === "home" ? () => { setActive("home"); navigateToWorkspace(""); } : tab === "projects" ? () => { setActive("projects"); navigateToWorkspace("/projects"); } : () => setActive(tab)}
            menuEnabled={tab === "projects"}
            onCreateProject={tab === "projects" ? handleCreateProject : undefined}
            currentWorkspaceId={currentWorkspaceId}
            hasNotification={tab === "chat" ? hasUnreadWorkspaceMessages : false}
          />
        ))}

        {["tasks", "ai"].map((tab) => (
          <RailItem
            key={tab}
            tabKey={tab}
            label={TITLES[tab as keyof typeof TITLES]}
            icon={ICON_MAP[tab as keyof typeof ICON_MAP]}
            active={active === tab}
            openTab={openTab}
            setOpenTab={setOpenTab}
            selected={selected}
            setSelected={setSelected}
            onActivate={tab === "tasks" ? () => { setActive("tasks"); navigateToWorkspace("/tasks"); } : tab === "ai" ? () => { setActive("ai"); navigateToWorkspace("/ai"); } : () => setActive(tab)}
          />
        ))}

        <div className="my-2 h-px w-8 bg-white/20" />

        <RailItem
          tabKey="details"
          label={TITLES.details}
          icon={ICON_MAP.details}
          active={active === "details"}
          items={[]}
          openTab={openTab}
          setOpenTab={setOpenTab}
          selected={selected}
          setSelected={setSelected}
          onActivate={() => { setActive("details"); navigateToWorkspace("/detail-library"); }}
        />

        <div className="mt-auto w-full flex flex-col items-center">
          <div className="mb-2 h-px w-8 bg-white/10" />
          <SettingsRailItem
            active={active === "settings"}
            currentWorkspaceId={currentWorkspaceId || ""}
            navigate={navigate}
            navigateToWorkspace={navigateToWorkspace}
            setActive={setActive}
          />
        </div>
      </aside>

      {/* Content frame */}
      <div
        className="fixed z-30 rounded-xl border border-slate-200 bg-white/80 backdrop-blur-sm shadow-sm transition-all duration-300 ease-out"
        style={{
          top: "calc(0.375rem + 2.25rem + 0.25rem)",
          bottom: "0.75rem",
          right: active === "projects" && selected?.tab === "projects" && !projectPanelCollapsed
            ? "calc(240px + 0.375rem + 0.5rem)" // panel width + margin + gap
            : "0.375rem",
          left: railCollapsed
            ? mdUp
              ? "calc(0.375rem + 6px + 0.75rem)"
              : "0.375rem"
            : "calc(0.375rem + 4rem + 0.75rem)",
        }}
      >
        <div className="h-full overflow-hidden flex flex-col">
          {active !== "settings" && (
            <PageHeader 
              tabKey={active} 
              title={TITLES[active as keyof typeof TITLES] || active}
              selected={selected}
              projectPanelCollapsed={projectPanelCollapsed}
              onToggleProjectPanel={() => setProjectPanelCollapsed(!projectPanelCollapsed)}
              projectName={active === "projects" && selected?.item ? selected.item : undefined}
            />
          )}

          <div
            className={
              active === "tasks"
                ? "flex-1 min-h-0 overflow-hidden"
                : "flex-1 min-h-0 overflow-auto"
            }
          >
            {active === "projects" ? (
              <div className="h-full flex flex-col">
                {/* File/Whiteboard Viewer Area */}
                <div className="flex-1 min-h-0 h-full">
                  {isInfoTabActive ? (
                    <ProjectInfoContent
                      projectId={userProjects.find((p: any) => p.name === selected?.item)?.id || ''}
                      workspaceId={currentWorkspaceId || ''}
                      contentType={(searchParams.get('infoSection') || 'project-profile') as any}
                    />
                  ) : isAITabActive ? (
                    <ProjectAIContextView
                      projectId={userProjects.find((p: any) => p.name === selected?.item)?.id || ''}
                      workspaceId={currentWorkspaceId || ''}
                    />
                  ) : selectedModel ? (
                    <Team3DModelViewer
                      modelFile={selectedModel.modelFile}
                      settings={selectedModel.settings}
                      versionNumber={selectedModel.versionNumber}
                      versionId={selectedModel.versionId}
                    />
                  ) : selectedWhiteboard ? (
                    <DrawingErrorBoundary 
                      onReset={() => {
                        // Reset whiteboard selection to force reload
                        setSelectedWhiteboard(null);
                        setTimeout(() => setSelectedWhiteboard(selectedWhiteboard), 100);
                      }}
                    >
                      <ExcalidrawCanvas
                        pageId={selectedWhiteboard.pageId}
                        projectId={userProjects.find((p: any) => p.name === selected?.item)?.id || ''}
                        onApiReady={(api) => {/* Optional: store api reference */}}
                        inchesPerSceneUnit={inchesPerSceneUnit}
                        onArrowStatsChange={setArrowStats}
                        onCalibrationChange={(newInchesPerSceneUnit) => setInchesPerSceneUnit(newInchesPerSceneUnit)}
                      />
                    </DrawingErrorBoundary>
                  ) : selectedFile ? (
                    <TeamFileViewer file={selectedFile} />
                  ) : !selected?.item ? (
                    // Empty state: No project selected
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center max-w-md px-6">
                        <h2 className="text-2xl font-semibold mb-3 text-slate-900">
                          Open a project to begin
                        </h2>
                        <p className="text-lg text-slate-600">
                          In the sidebar, hover over Projects and select. Use the Project Panel to manage files, preview PDFs and images, mark up in Whiteboards, and edit project info.
                        </p>
                      </div>
                    </div>
                  ) : (
                    // Empty state: Project selected but no item chosen
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center max-w-md px-6">
                        <h2 className="text-2xl font-semibold mb-3 text-slate-900">
                          Start in the Project Panel
                        </h2>
                        <p className="text-lg text-slate-600">
                          Click the tabs to open files, whiteboard pages, or project info—then pick an item to preview here.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : active === "details" ? (
              <TeamDetailLibraryView />
            ) : active === "tasks" ? (
              <TasksView />
            ) : active === "chat" ? (
              <ChatView resetTrigger={chatResetTrigger} />
            ) : active === "home" ? (
              <HomeView />
            ) : active === "ai" ? (
              children
            ) : active === "settings" ? (
              children
            ) : null}
          </div>
        </div>
      </div>

      {/* ProjectPanel - separate fixed element outside the content frame */}
      {active === "projects" && selected?.tab === "projects" && (
        <div
          className="fixed z-30 rounded-xl border border-slate-200 bg-white shadow-sm transition-all duration-300 ease-out"
          style={{
            top: "calc(0.375rem + 2.25rem + 0.25rem)",
            bottom: "0.75rem",
            right: "0.375rem",
            width: projectPanelCollapsed ? 0 : "240px",
            opacity: projectPanelCollapsed ? 0 : 1,
            overflow: "hidden",
          }}
        >
            <ProjectPanel
              projectId={userProjects.find((p: any) => p.name === selected.item)?.id || ''}
              projectName={selected.item}
              onBreadcrumb={(crumb) => {}}
              onFileSelect={(file) => {
                setSelectedFile(file);
                setSelectedWhiteboard(null);
                setSelectedModel(null);
              }}
              onWhiteboardSelect={(wb) => {
                setSelectedWhiteboard(wb);
                setSelectedFile(null);
                setSelectedModel(null);
              }}
              onModelSelect={(model) => {
                setSelectedModel(model);
                setSelectedFile(null);
                setSelectedWhiteboard(null);
              }}
              showArrowStats={showArrowStats}
              onToggleArrowStats={() => setShowArrowStats(!showArrowStats)}
              currentScale={currentScale}
              onScaleChange={(scale) => {
                setCurrentScale(scale);
                setInchesPerSceneUnit(getInchesPerSceneUnit(SCALE_PRESETS[scale]));
              }}
              arrowStats={arrowStats}
              onCalibrate={handleCalibration}
              inchesPerSceneUnit={inchesPerSceneUnit}
              initialFileId={urlFileId}
              initialWhiteboardPageId={urlWhiteboardPageId}
            />
        </div>
      )}
    </div>
  );
}

// ----------------------------------
// Rail Icon + Hover Menu
// ----------------------------------
const RailItem = memo(function RailItem({
  tabKey,
  label,
  icon: IconComponent,
  active,
  items = [],
  openTab,
  setOpenTab,
  selected,
  setSelected,
  onActivate,
  menuEnabled = false,
  onCreateProject,
  currentWorkspaceId,
  hasNotification = false,
}: RailItemProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const showTimer = useRef<number | null>(null);
  const hideTimer = useRef<number | null>(null);
  const longPressTimer = useRef<number | null>(null);
  const overIcon = useRef(false);
  const overPanel = useRef(false);
  const [hoverItem, setHoverItem] = useState<string | null>(null);
  const isTouchRef = useRef(false);
  const lastTapRef = useRef(0);
  const suppressClickRef = useRef(false);

  const scheduleOpen = useCallback(() => {
    if (!menuEnabled || openTab === tabKey) return;
    if (showTimer.current) clearTimeout(showTimer.current);
    showTimer.current = window.setTimeout(() => setOpenTab(tabKey), HOVER_DELAY_MS);
  }, [menuEnabled, openTab, tabKey, setOpenTab]);

  const scheduleClose = useCallback(() => {
    if (!menuEnabled) return;
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => {
      if (!overIcon.current && !overPanel.current) {
        setOpenTab((t) => (t === tabKey ? null : t));
      }
    }, CLOSE_DELAY_MS);
  }, [menuEnabled, tabKey, setOpenTab]);

  useEffect(() => {
    if (!menuEnabled || openTab !== tabKey) return;
    const onDocPointer = (ev: PointerEvent) => {
      const el = containerRef.current;
      if (el && !el.contains(ev.target as Node)) setOpenTab(null);
    };
    document.addEventListener("pointerdown", onDocPointer);
    return () => document.removeEventListener("pointerdown", onDocPointer);
  }, [openTab, tabKey, setOpenTab, menuEnabled]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      isTouchRef.current = e.pointerType === "touch";
      suppressClickRef.current = false; // Don't suppress clicks
      overIcon.current = true;

      if (isTouchRef.current && menuEnabled) {
        if (longPressTimer.current) clearTimeout(longPressTimer.current);
        longPressTimer.current = window.setTimeout(() => {
          setOpenTab(tabKey);
          lastTapRef.current = 0;
        }, LONG_PRESS_MS);
      }
    },
    [menuEnabled, setOpenTab, tabKey]
  );

  const handlePointerUp = useCallback(() => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);

    if (isTouchRef.current && menuEnabled) {
      const now = performance.now();
      if (now - lastTapRef.current <= DOUBLE_TAP_MS) {
        onActivate();
        setOpenTab(null);
        lastTapRef.current = 0;
      } else {
        setOpenTab(tabKey);
        lastTapRef.current = now;
      }
    }
  }, [menuEnabled, onActivate, setOpenTab, tabKey]);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      // Don't prevent default on touch devices
      if (!isTouchRef.current) {
        // For mouse clicks, navigate immediately
        onActivate();
        // After navigating via icon click, close hover menu. Reopens on next hover.
        if (menuEnabled) {
          if (showTimer.current) clearTimeout(showTimer.current);
          if (hideTimer.current) clearTimeout(hideTimer.current);
          overIcon.current = false;
          overPanel.current = false;
          setOpenTab(null);
        }
      } else {
        // For touch, let handlePointerUp handle the logic
        if (!menuEnabled) {
          // If menu not enabled, navigate on touch
          onActivate();
        }
      }
    },
    [onActivate, menuEnabled, setOpenTab]
  );

  const handlePointerEnter = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerType === "mouse") {
        overIcon.current = true;
        scheduleOpen();
      }
    },
    [scheduleOpen]
  );

  const handlePointerLeave = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerType === "mouse") {
        overIcon.current = false;
        scheduleClose();
      }
    },
    [scheduleClose]
  );

  const handleMenuMouseEnter = useCallback(() => {
    overPanel.current = true;
    setOpenTab(tabKey);
  }, [tabKey, setOpenTab]);

  const handleMenuMouseLeave = useCallback(() => {
    overPanel.current = false;
    scheduleClose();
  }, [scheduleClose]);

  const handleItemClick = useCallback(
    (item: string) => {
      setSelected({ tab: tabKey, item });
      onActivate();
      setOpenTab(null);
      const ae = document.activeElement as HTMLElement;
      if (ae?.blur) ae.blur();
    },
    [tabKey, setSelected, onActivate, setOpenTab]
  );

  const handleItemKeyDown = useCallback(
    (e: React.KeyboardEvent, item: string) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleItemClick(item);
      }
    },
    [handleItemClick]
  );

  return (
    <div
      className="relative z-40 flex flex-col items-center gap-1 mb-4 group/nav"
      ref={containerRef}
    >
      <button
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onBlur={scheduleClose}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={menuEnabled && openTab === tabKey}
        className={`relative group h-11 w-11 cursor-pointer grid place-items-center rounded-xl transition duration-300 ease-out touch-manipulation ${
          active
            ? "bg-white/10 text-white"
            : "text-white/80 hover:text-white hover:bg-white/5"
        }`}
        style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
      >
        <span
          aria-hidden
          className={`absolute inset-0 rounded-xl transform ring-1 ring-white/10 bg-white/0 opacity-0 scale-95 transition duration-300 group-hover:bg-white/5 group-hover:opacity-100 group-hover:scale-100 ${
            active ? "opacity-100 bg-white/5" : ""
          }`}
        />
        <span
          aria-hidden
          className="pointer-events-none absolute -inset-2 rounded-2xl opacity-0 blur-md transition duration-300 group-hover:opacity-60"
          style={{
            background:
              "radial-gradient(24px 24px at 50% 50%, rgba(255,255,255,0.35), transparent 70%)",
          }}
        />
        <span className="pointer-events-none transform transition duration-300 group-hover:-translate-y-px group-hover:translate-x-[1px] group-hover:scale-110 group-hover:rotate-[2deg] group-hover:drop-shadow-[0_6px_14px_rgba(255,255,255,0.35)] active:scale-95">
          <IconComponent className="h-5 w-5" />
        </span>

        {hasNotification && (
          <span 
            className="absolute top-0 right-0 w-2 h-2 rounded-full"
            style={{ backgroundColor: '#e93d82' }}
          />
        )}

        <span className="pointer-events-none absolute left-12 px-1.5 py-1 rounded-md text-[11px] text-slate-700 bg-white/90 backdrop-blur-sm border border-slate-200 opacity-0 -translate-x-[6px] group-hover:opacity-100 group-hover:translate-x-0 transition">
          {label}
        </span>
      </button>

      <div
        className={`w-12 px-1 text-center text-[11px] leading-tight tracking-wide select-none transition-colors ${
          active ? "text-white" : "text-white/70"
        } group-hover/nav:text-white`}
      >
        {label}
      </div>

      {menuEnabled && (
        <div
          role="menu"
          data-open={openTab === tabKey ? "true" : "false"}
          className={`absolute left-16 top-1/2 -translate-y-1/2 w-56 rounded-2xl border border-slate-200 bg-white/95 backdrop-blur-md shadow-md p-2 z-50 ${
            openTab === tabKey
              ? "opacity-100 translate-x-0 pointer-events-auto"
              : "opacity-0 -translate-x-2 pointer-events-none"
          } transition duration-200`}
          onMouseEnter={handleMenuMouseEnter}
          onMouseLeave={handleMenuMouseLeave}
        >
          {tabKey === "projects" ? (
            <div className="px-2 pt-1 pb-1.5 text-sm font-medium text-slate-800 tracking-[0.04em] flex items-center justify-between">
              <span>{label}</span>
              {onCreateProject ? (
                <CreateProjectModal onCreateProject={onCreateProject} workspaceId={currentWorkspaceId || ''}>
                  <button
                    aria-label="Add project"
                    className="h-6 w-6 grid place-items-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition"
                  >
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </button>
                </CreateProjectModal>
              ) : (
                <button
                  aria-label="Add project"
                  className="h-6 w-6 grid place-items-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition"
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </button>
              )}
            </div>
          ) : (
            <div className="px-2 pt-1 pb-1.5 text-[12px] text-slate-500">{label}</div>
          )}

          <div className="flex flex-col">
            {items.map((t) => {
              const isSelected = selected?.tab === tabKey && selected?.item === t;
              const isHover = hoverItem === t;
              return (
                <button
                  key={t}
                  role="menuitem"
                  tabIndex={0}
                  aria-pressed={isSelected}
                  onClick={() => handleItemClick(t)}
                  onKeyDown={(e) => handleItemKeyDown(e, t)}
                  onMouseEnter={() => setHoverItem(t)}
                  onMouseLeave={() => setHoverItem(null)}
                  onPointerEnter={() => setHoverItem(t)}
                  onPointerLeave={() => setHoverItem(null)}
                  className={`text-left inline-flex items-center group gap-2 w-full rounded-lg px-1.5 py-1.5 text-[13px] transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-[#e8f0fe] text-slate-900 ring-1 ring-[#d2e3fc]"
                      : isHover
                      ? "bg-slate-100 text-slate-900"
                      : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  {tabKey === "projects" && (
                    <span
                      className={`shrink-0 transition ${
                        isHover ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                      }`}
                      aria-hidden
                    >
                      <svg
                        viewBox="0 0 24 24"
                        width="12"
                        height="12"
                        fill="currentColor"
                        stroke="none"
                      >
                        <path d="M8 5l10 7-10 7z" />
                      </svg>
                    </span>
                  )}
                  <span>{t}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
});

// ----------------------------------
// Settings Rail Item with Workspace Switcher
// ----------------------------------
const SettingsRailItem = memo(function SettingsRailItem({
  active,
  currentWorkspaceId,
  navigate,
  navigateToWorkspace,
  setActive,
}: SettingsRailItemProps) {
  const { toast } = useToast();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [newWorkspaceDescription, setNewWorkspaceDescription] = useState("");
  const [editWorkspaceName, setEditWorkspaceName] = useState("");
  const [editWorkspaceDescription, setEditWorkspaceDescription] = useState("");
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const { currentWorkspace, workspaces, switchWorkspace, createWorkspace, refetch } = useWorkspaces();
  const navigateRouter = useNavigate();

  const handleWorkspaceChange = (newWorkspaceId: string) => {
    switchWorkspace(newWorkspaceId);
    navigateRouter(`/workspace/${newWorkspaceId}/projects`);
    setDropdownOpen(false);
  };

  const handleOpenSettings = () => {
    if (currentWorkspace) {
      setEditWorkspaceName(currentWorkspace.name);
      setEditWorkspaceDescription(currentWorkspace.description || "");
      setSettingsDialogOpen(true);
    }
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newWorkspaceName.trim()) return;

    const newWorkspace = await createWorkspace({
      name: newWorkspaceName.trim(),
      description: newWorkspaceDescription.trim(),
      icon: '🏢',
    });

    if (newWorkspace) {
      toast({
        title: "Workspace created",
        description: `${newWorkspace.name} has been created successfully`,
      });

      setNewWorkspaceName("");
      setNewWorkspaceDescription("");
      setCreateDialogOpen(false);
      
      navigateRouter(`/workspace/${newWorkspace.id}/projects`);
    }
  };

  const handleUpdateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editWorkspaceName.trim() || !currentWorkspaceId) return;

    setIsUpdating(true);
    
    try {
      const { error } = await supabase
        .from('workspaces')
        .update({
          name: editWorkspaceName.trim(),
          description: editWorkspaceDescription.trim(),
        })
        .eq('id', currentWorkspaceId);

      if (error) throw error;

      await refetch();
      toast({
        title: "Workspace updated",
        description: "Changes have been saved",
      });
      setSettingsDialogOpen(false);
    } catch (error) {
      console.error('Error updating workspace:', error);
      toast({
        title: "Error",
        description: "Failed to update workspace",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteWorkspace = async () => {
    if (!currentWorkspaceId || deleteConfirmText !== "DELETE") return;
    
    setIsDeleting(true);
    
    try {
      const { error } = await supabase
        .from('workspaces')
        .delete()
        .eq('id', currentWorkspaceId);

      if (error) throw error;

      await refetch();
      
      const remainingWorkspaces = workspaces.filter(w => w.id !== currentWorkspaceId);
      
      if (remainingWorkspaces.length > 0) {
        switchWorkspace(remainingWorkspaces[0].id);
        navigateRouter(`/workspace/${remainingWorkspaces[0].id}/projects`);
      } else {
        localStorage.removeItem('current_workspace_id');
        navigateRouter('/');
      }
      
      toast({
        title: "Workspace deleted",
        description: "Workspace has been removed",
      });
      
      setDeleteDialogOpen(false);
      setDeleteConfirmText("");
      setSettingsDialogOpen(false);
    } catch (error) {
      console.error('Error deleting workspace:', error);
      toast({
        title: "Error",
        description: "Failed to delete workspace",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="relative z-40 flex flex-col items-center gap-2.5 mb-2.5 group/nav">
      {/* Settings icon button - centered */}
      <button
        onClick={() => {
          console.log('Settings button clicked, active state:', active);
          setActive('settings');
          navigateToWorkspace("/settings");
        }}
        className={`relative h-11 w-11 rounded-lg grid place-items-center transition-all duration-200 touch-manipulation ${
          active
            ? "bg-white/20 text-white shadow-[0_0_16px_rgba(255,255,255,0.15)]"
            : "text-white/80 hover:text-white hover:bg-white/10 hover:shadow-[0_0_12px_rgba(255,255,255,0.1)]"
        }`}
        style={{ WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}
        title="Settings"
      >
        <Settings className="h-5 w-5" />
      </button>

      {/* Workspace name dropdown - opens full menu directly */}
      <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <button
            className="w-12 px-1 text-center text-[11px] leading-tight text-white/90 hover:text-white/100 transition-all cursor-pointer truncate rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 touch-manipulation"
            style={{ 
              WebkitTapHighlightColor: 'transparent', 
              touchAction: 'manipulation',
              height: '28px',
              padding: '0 4px'
            }}
            title={currentWorkspace?.name || "Switch workspace"}
          >
            {currentWorkspace?.name || "Workspace"}
          </button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent 
          align="center" 
          side="bottom"
          className="w-56 bg-popover z-50"
          sideOffset={4}
        >
          {/* Header */}
          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
            Workspaces
          </div>
          <DropdownMenuSeparator />
          
          {/* Workspace list */}
          {workspaces.map((workspace) => (
            <DropdownMenuItem
              key={workspace.id}
              onClick={() => handleWorkspaceChange(workspace.id)}
              className="cursor-pointer"
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-xs">{workspace.name}</span>
                {currentWorkspaceId === workspace.id && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </div>
            </DropdownMenuItem>
          ))}
          
          <DropdownMenuSeparator />
          
          {/* Settings */}
          <DropdownMenuItem
            onClick={() => {
              handleOpenSettings();
              setDropdownOpen(false);
            }}
            className="cursor-pointer"
          >
            <Settings className="mr-2 h-4 w-4" />
            <span className="text-xs">Workspace settings</span>
          </DropdownMenuItem>
          
          {/* Create workspace */}
          <DropdownMenuItem
            onClick={() => {
              setCreateDialogOpen(true);
              setDropdownOpen(false);
            }}
            className="cursor-pointer"
          >
            <Plus className="mr-2 h-4 w-4" />
            <span className="text-xs">Create workspace</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Create Workspace Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Workspace</DialogTitle>
            <DialogDescription>
              Organize your projects by creating a new workspace
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateWorkspace} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="workspace-name">Workspace Name</Label>
              <Input
                id="workspace-name"
                placeholder="e.g., Commercial Projects"
                value={newWorkspaceName}
                onChange={(e) => setNewWorkspaceName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="workspace-description">Description (optional)</Label>
              <Textarea
                id="workspace-description"
                placeholder="Describe this workspace..."
                value={newWorkspaceDescription}
                onChange={(e) => setNewWorkspaceDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Create Workspace</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Workspace Settings Dialog */}
      <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Workspace Settings</DialogTitle>
            <DialogDescription>
              Update your workspace name and description
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateWorkspace} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="edit-workspace-name">Workspace Name</Label>
              <Input
                id="edit-workspace-name"
                placeholder="e.g., Commercial Projects"
                value={editWorkspaceName}
                onChange={(e) => setEditWorkspaceName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-workspace-description">Description (optional)</Label>
              <Textarea
                id="edit-workspace-description"
                placeholder="Describe this workspace..."
                value={editWorkspaceDescription}
                onChange={(e) => setEditWorkspaceDescription(e.target.value)}
                rows={3}
              />
            </div>
            
            <div className="space-y-4 pt-4 border-t">
              {currentWorkspaceId && (
                <WorkspaceMembersTable workspaceId={currentWorkspaceId} />
              )}
            </div>
            
            <div className="space-y-4 pt-4 border-t">
              {currentWorkspaceId && (
                <ExcelExportImport workspaceId={currentWorkspaceId} />
              )}
            </div>
            
            <div className="space-y-4 pt-4 border-t border-destructive/20">
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-destructive flex items-center gap-2">
                  <Trash2 className="h-4 w-4" />
                  Danger Zone
                </h3>
                <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Delete Workspace</p>
                      <p className="text-xs text-muted-foreground">
                        Permanently delete this workspace and all projects within it. This action cannot be undone.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault();
                        setDeleteDialogOpen(true);
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSettingsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isUpdating}>
                {isUpdating ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Workspace Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workspace?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <div className="text-destructive font-medium">
                ⚠️ This will permanently delete:
              </div>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Workspace: "{currentWorkspace?.name}"</li>
                <li>All projects in this workspace</li>
                <li>All tasks, files, notes, and invoices</li>
              </ul>
              <p className="text-sm font-medium">
                This action cannot be undone.
              </p>
              <div className="space-y-2">
                <Label htmlFor="delete-confirm">
                  Type "DELETE" to confirm:
                </Label>
                <Input
                  id="delete-confirm"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="DELETE"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDeleteConfirmText("");
                setDeleteDialogOpen(false);
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteConfirmText !== "DELETE" || isDeleting}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (deleteConfirmText === "DELETE" && !isDeleting) {
                  handleDeleteWorkspace();
                }
              }}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete Workspace"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
});

// ----------------------------------
// Global Header
// ----------------------------------
const TopHeader = memo(function TopHeader({
  railCollapsed,
  setRailCollapsed,
  mdUp,
}: TopHeaderProps) {
  const leftValue = railCollapsed
    ? mdUp
      ? "calc(0.375rem + 6px + 0.75rem)"
      : "0.375rem"
    : "calc(0.375rem + 3.5rem + 0.75rem)";

  return (
    <div
      className="fixed z-50 h-9 flex items-center group/header"
      style={{
        top: "0.375rem",
        left: leftValue,
        right: "0.375rem",
        transition: "left 260ms cubic-bezier(0.22, 1, 0.36, 1)",
      }}
    >
      <div className="w-full px-2">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center">
          {/* Left: collapse toggle (appears on header hover) */}
          <div className="h-9 flex items-center justify-start gap-2">
            <button
              onClick={() => setRailCollapsed((v) => !v)}
              className="opacity-0 group-hover/header:opacity-100 transition-opacity duration-200 h-7 w-7 rounded-md border border-slate-200 bg-white grid place-items-center shadow-sm"
              aria-label={railCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={railCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {railCollapsed ? (
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="m9 18 6-6-6-6" />
                </svg>
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="m15 18-6-6 6-6" />
                </svg>
              )}
            </button>
          </div>

          {/* Center: search + calendar + new */}
          <div className="h-9 flex items-center justify-center">
            <div className="flex items-center gap-2">
              <label className="relative block">
                <span className="absolute inset-y-0 left-2 grid place-items-center">
                  <svg
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-slate-400"
                  >
                    <circle cx="11" cy="11" r="7" />
                    <path d="m21 21-4.3-4.3" />
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder="Search"
                  className="w-[380px] max-w-[48vw] h-7 rounded-lg border border-slate-200 bg-white/90 pl-8 pr-2 text-sm outline-none placeholder:text-slate-400 focus:border-slate-300 focus:ring-2 focus:ring-slate-200/60"
                />
              </label>

              <button
                className="h-7 w-7 rounded-md border border-slate-200 bg-white grid place-items-center shadow-sm"
                aria-label="Open calendar"
              >
                <span className="sr-only">Calendar</span>
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-slate-500"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <path d="M16 2v4M8 2v4M3 10h18" />
                </svg>
              </button>

              <button className="h-7 px-2.5 rounded-full border border-violet-200 bg-white text-violet-700 text-[12px] font-medium shadow-sm inline-flex items-center gap-1">
                <svg
                  viewBox="0 0 24 24"
                  width="14"
                  height="14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
                New
              </button>
            </div>
          </div>

          {/* Right: account chip */}
          <div className="h-9 flex items-center justify-end pr-1">
            <TeamAvatarMenu />
          </div>
        </div>
      </div>
    </div>
  );
});

// ----------------------------------
// Page Header (inside content)
// ----------------------------------
const PageHeader = memo(function PageHeader({ 
  tabKey, 
  title, 
  selected, 
  projectPanelCollapsed, 
  onToggleProjectPanel,
  projectName 
}: PageHeaderProps) {
  const Icon = ICON_MAP[tabKey] || Home;
  const showCollapseButton = tabKey === "projects" && selected?.tab === "projects";

  return (
    <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-slate-200/70 rounded-t-xl">
      <div className="h-10 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-6 w-6 rounded-md border border-slate-200 bg-white grid place-items-center shadow-sm">
            <Icon className="h-4 w-4 text-slate-600" />
          </div>
          <span className="truncate text-[#202020] text-[15px] font-medium">
            {title}
            {projectName && (
              <>
                <span className="mx-2 text-slate-400">—</span>
                <span className="truncate text-[15px] font-normal text-slate-400" title={projectName}>{projectName}</span>
              </>
            )}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {showCollapseButton && onToggleProjectPanel && (
            <button
              onClick={onToggleProjectPanel}
              className="h-7 w-7 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors group"
              aria-label={projectPanelCollapsed ? "Show project panel" : "Hide project panel"}
              title={projectPanelCollapsed ? "Show Files & Whiteboards" : "Hide Files & Whiteboards"}
            >
              {projectPanelCollapsed ? (
                <ChevronLeft className="h-4 w-4 text-slate-600 group-hover:text-slate-900" />
              ) : (
                <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-slate-900" />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

// ----------------------------------
// Shared Tabs Row
// ----------------------------------
function TabsRow({ tabs, active, onChange }: TabsRowProps) {
  return (
    <div className="-mx-6 px-6 h-7 flex items-end gap-2 text-[13px] border-b border-slate-200/70 bg-white/80 backdrop-blur-sm">
      <nav className="flex items-center gap-4">
        {tabs.map(({ key, label, icon }) => {
          const isActive = key === active;
          return (
            <button
              key={key}
              onClick={() => onChange(key)}
              className={`inline-flex items-center gap-1 whitespace-nowrap text-[13px] font-medium leading-none px-1 pt-0 pb-2 -mb-px rounded-none bg-transparent hover:bg-slate-100/60 ${
                isActive
                  ? "text-[#202020] border-b-2 border-slate-900"
                  : "text-[#202020] hover:text-[#202020] border-b-2 border-transparent"
              }`}
            >
              <span className="shrink-0" aria-hidden>
                {icon}
              </span>
              <span>{label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

// ----------------------------------
// Chat View - Integrated with database
// ----------------------------------
import TeamChatSlim from './TeamChatSlim';

interface ChatViewProps {
  resetTrigger?: number;
}

const ChatView = memo(function ChatView({ resetTrigger }: ChatViewProps) {
  const { currentWorkspaceId } = useWorkspaces();
  const { user } = useUser();
  const { data: projects = [] } = useProjects(currentWorkspaceId || '', user?.id, user?.is_admin);

  const [selectedProject, setSelectedProject] = React.useState<any>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [page, setPage] = useState<'chat' | 'files'>('chat');
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);

  // Reset to home/default chat view when component mounts or resetTrigger changes
  React.useEffect(() => {
    setSelectedProject(null);
    setPage('chat');
    setIsWorkspaceChat(false); // Also reset workspace chat state
  }, [resetTrigger]);

  const [isWorkspaceChat, setIsWorkspaceChat] = React.useState(false);

  const handleToggleSidebar = () => setSidebarCollapsed((prev) => !prev);
  const handleToggleFiles = () => setPage((prev) => prev === 'chat' ? 'files' : 'chat');

  return (
    <div className="flex h-full w-full">
      <TeamChatSlim
        projects={projects}
        selectedProject={selectedProject}
        onProjectSelect={setSelectedProject}
        onToggleSidebar={handleToggleSidebar}
        onToggleFiles={handleToggleFiles}
        onFileSelect={setSelectedFileId}
        page={page}
        onPageChange={setPage}
        showSidePanel={!sidebarCollapsed}
        workspaceId={currentWorkspaceId || undefined}
        isWorkspaceChat={isWorkspaceChat}
        onWorkspaceChatChange={setIsWorkspaceChat}
      />
    </div>
  );
});

// ----------------------------------
// Home View
// ----------------------------------
const HomeView = memo(function HomeView() {
  const VIEW_TABS = ["Overview", "To Do", "Calendar", "Activity"];
  const [viewTab, setViewTab] = useState("Overview");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const { currentWorkspace } = useWorkspaces();
  const { data: tasks = [] } = useWorkspaceTasks(currentWorkspace?.id || '');

  const icon = (t: string) =>
    t === "Overview" ? (
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="11" width="4" height="9" rx="1" />
        <rect x="10" y="7" width="4" height="13" rx="1" />
        <rect x="17" y="13" width="4" height="7" rx="1" />
      </svg>
    ) : t === "To Do" ? (
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="m9 12 2 2 4-5" />
      </svg>
    ) : t === "Calendar" ? (
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
    ) : (
      <svg
        viewBox="0 0 24 24"
        width="14"
        height="14"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M22 12h-4l-3 7-6-14-3 7H2" />
      </svg>
    );

  const tabs = VIEW_TABS.map((t) => ({ key: t, label: t, icon: icon(t) }));

  // Get tasks with due dates
  const tasksWithDates = useMemo(() => {
    return tasks.filter(task => task.dueDate);
  }, [tasks]);

  // Get dates that have tasks
  const datesWithTasks = useMemo(() => {
    return tasksWithDates.map(task => new Date(task.dueDate!).toDateString());
  }, [tasksWithDates]);

  // Get tasks for selected date
  const tasksForSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    const selectedDateString = selectedDate.toDateString();
    return tasksWithDates.filter(task =>
      new Date(task.dueDate!).toDateString() === selectedDateString
    );
  }, [selectedDate, tasksWithDates]);

  // Render calendar view
  const renderCalendarView = () => (
    <div className="flex gap-6">
      <div className="flex-shrink-0">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          className="rounded-md border"
          modifiers={{
            hasTask: (date) => datesWithTasks.includes(date.toDateString())
          }}
          modifiersStyles={{
            hasTask: {
              fontWeight: 'bold',
              textDecoration: 'underline',
              textDecorationColor: 'hsl(222.2 47.4% 11.2%)',
              textUnderlineOffset: '3px'
            }
          }}
        />
      </div>
      <div className="flex-1">
        <h3 className="text-sm font-semibold mb-3">
          {selectedDate ? selectedDate.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }) : 'Select a date'}
        </h3>
        {tasksForSelectedDate.length > 0 ? (
          <div className="space-y-2">
            {tasksForSelectedDate.map(task => (
              <div
                key={task.id}
                className="p-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-slate-900">{task.title}</h4>
                    {task.description && (
                      <p className="text-xs text-slate-600 mt-1">{task.description}</p>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    task.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                    task.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                    task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-slate-100 text-slate-800'
                  }`}>
                    {task.priority}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
                  <span className={`px-2 py-0.5 rounded ${
                    task.status === 'done_completed' ? 'bg-green-100 text-green-800' :
                    task.status === 'progress_update' ? 'bg-blue-100 text-blue-800' :
                    'bg-slate-100 text-slate-800'
                  }`}>
                    {task.status === 'done_completed' ? 'Completed' :
                     task.status === 'progress_update' ? 'In Progress' :
                     'Redline'}
                  </span>
                  {task.assignees.length > 0 && (
                    <span>{task.assignees.length} assignee{task.assignees.length > 1 ? 's' : ''}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">No tasks scheduled for this date.</p>
        )}
      </div>
    </div>
  );

  return (
    <div className="px-6 pt-1 pb-12">
      <div className="mt-1 mb-3">
        <TabsRow tabs={tabs} active={viewTab} onChange={setViewTab} />
      </div>

      <div className="mt-3">
        {viewTab === "Overview" && (
          <div className="text-sm text-slate-600">Home content placeholder</div>
        )}
        {viewTab === "To Do" && (
          <div className="text-sm text-slate-600">To Do content placeholder</div>
        )}
        {viewTab === "Calendar" && renderCalendarView()}
        {viewTab === "Activity" && (
          <div className="text-sm text-slate-600">Activity content placeholder</div>
        )}
      </div>
    </div>
  );
});

// ----------------------------------
// Tasks View — TanStack Table
// ----------------------------------

// View tabs for Tasks
const VIEW_TABS = ["List", "Board", "Calendar", "View"];
const viewIcon = (tab: string) => {
  if (tab === "List")
    return (
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="8" y1="6" x2="21" y2="6" />
        <line x1="8" y1="12" x2="21" y2="12" />
        <line x1="8" y1="18" x2="21" y2="18" />
        <line x1="3" y1="6" x2="3.01" y2="6" />
        <line x1="3" y1="12" x2="3.01" y2="12" />
        <line x1="3" y1="18" x2="3.01" y2="18" />
      </svg>
    );
  if (tab === "Board")
    return (
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
      </svg>
    );
  if (tab === "Calendar")
    return (
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    );
  if (tab === "View")
    return (
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  return null;
};

const TasksView = memo(function TasksView() {
  const { currentWorkspaceId } = useWorkspaces();
  const { user } = useUser();
  const navigate = useNavigate();
  const { navigateToWorkspace } = useRoleAwareNavigation();
  const queryClient = useQueryClient();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showClosedOnly, setShowClosedOnly] = useState(false);
  const [taskAssignees, setTaskAssignees] = useState<User[]>([]);
  const [taskCreator, setTaskCreator] = useState<User | null>(null);
  const [viewTab, setViewTab] = useState("List");
  const deleteTaskMutation = useDeleteTask();
  const [drawerWidth, setDrawerWidth] = useState(640);
  const tabsRef = useRef<HTMLDivElement>(null);
  const [tabsTop, setTabsTop] = useState(0);

  useEffect(() => {
    if (tabsRef.current) {
      const rect = tabsRef.current.getBoundingClientRect();
      const parentRect = tabsRef.current.parentElement?.getBoundingClientRect();
      if (parentRect) {
        setTabsTop(rect.bottom - parentRect.top);
      }
    }
  }, []);
  
  const tabs = VIEW_TABS.map((v) => ({
    icon: viewIcon(v),
    label: v,
    key: v,
  }));

  // Fetch data
  const { data: tasks = [], isLoading: tasksLoading } = useWorkspaceTasks(currentWorkspaceId || '');
  const { data: projects = [] } = useProjects(currentWorkspaceId || '', user?.id, user?.is_admin);
  
  // Loading progress state for animated progress bar
  const [loadingProgress, setLoadingProgress] = useState(0);

  // Animate loading progress while tasks are loading
  useEffect(() => {
    if (tasksLoading) {
      setLoadingProgress(0);
      
      // Simulate progress (faster early, slower later)
      const interval = setInterval(() => {
        setLoadingProgress(prev => {
          if (prev >= 90) return prev; // Stop at 90% until actually loaded
          const increment = prev < 30 ? 15 : prev < 60 ? 10 : 5;
          return Math.min(prev + increment, 90);
        });
      }, 300);
      
      return () => {
        clearInterval(interval);
      };
    } else if (tasks.length >= 0) {
      // Complete progress when loaded
      setLoadingProgress(100);
    }
  }, [tasksLoading, tasks.length]);

  // Sync selectedTask with updated task from tasks array
  useEffect(() => {
    if (selectedTask) {
      const updatedTask = tasks.find((t) => t.id === selectedTask.id);
      if (updatedTask) {
        // Only update if the task actually changed (deep comparison for assignees)
        const assigneesChanged = JSON.stringify(selectedTask.assignees?.sort() || []) !== 
                                 JSON.stringify(updatedTask.assignees?.sort() || []);
        const taskChanged = selectedTask.title !== updatedTask.title ||
                           selectedTask.description !== updatedTask.description ||
                           selectedTask.status !== updatedTask.status ||
                           assigneesChanged;
        
        if (taskChanged) {
          setSelectedTask(updatedTask);
        }
      }
    }
  }, [tasks, selectedTask?.id]);
  
  // Fetch all workspace members for assignee selection
  const { data: workspaceMembers = [] } = useQuery<User[]>({
    queryKey: ['workspace-members', currentWorkspaceId],
    queryFn: async (): Promise<User[]> => {
      // First get workspace members
      const { data: members, error: membersError } = await supabase
        .from('workspace_members')
        .select('*')
        .eq('workspace_id', currentWorkspaceId)
        .is('deleted_at', null);
      
      if (membersError) {
        console.error('Error fetching workspace members:', membersError);
        throw membersError;
      }
      
      if (!members || members.length === 0) return [];
      
      // Get all user IDs
      const userIds = members.map(m => m.user_id);
      
      // Fetch user details
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('*')
        .in('id', userIds);
      
      if (usersError) {
        console.error('Error fetching users:', usersError);
        throw usersError;
      }
      
      // Create a map of user data
      const userMap = new Map(users?.map(u => [u.id, u]) || []);
      
      // Combine the data
      const result = members.map(member => {
        const user = userMap.get(member.user_id);
        return {
          id: user?.id || member.user_id,
          shortId: user?.short_id || '',
          authId: user?.auth_id || null,
          name: user?.name || 'Unknown User',
          email: user?.email || '',
          phone: user?.phone || null,
          avatarUrl: user?.avatar_url || null,
          lastActiveAt: user?.last_active_at || null,
          createdAt: user?.created_at || null,
          updatedAt: user?.updated_at || null,
          deletedAt: user?.deleted_at || null,
          deletedBy: user?.deleted_by || null,
        };
      });
      
      console.log('✅ Workspace members loaded:', {
        count: result.length,
        ids: result.map(m => m.id),
        names: result.map(m => m.name)
      });
      
      // Ensure current user is always included if they exist
      if (user && !result.find(m => m.id === user.id)) {
        result.push({
          id: user.id,
          shortId: user.short_id,
          authId: user.auth_id || '',
          name: user.name,
          email: user.email,
          phone: user.phone || undefined,
          avatarUrl: user.avatar_url,
          lastActiveAt: user.last_active_at,
          createdAt: new Date().toISOString(), // Default value since UserProfile doesn't have this
          updatedAt: new Date().toISOString(), // Default value since UserProfile doesn't have this
          deletedAt: undefined,
          deletedBy: undefined,
        });
      }
      
      return result;
    },
    enabled: !!currentWorkspaceId,
  });
  
  // Warn about orphaned references
  useEffect(() => {
    tasks.forEach(task => {
      if (!task.createdBy) {
        console.warn(`⚠️ Task "${task.title}" has NULL created_by`);
      }
      const assignees = Array.isArray(task.assignees) ? task.assignees : [];
      assignees.forEach(assigneeId => {
        if (!workspaceMembers.find(m => m.id === assigneeId)) {
          console.warn(`⚠️ Task "${task.title}" has orphaned assignee: ${assigneeId}`);
        }
      });
    });
  }, [tasks, workspaceMembers]);
  
  // Fetch unique creator IDs from tasks that aren't in workspaceMembers
  const creatorIds = useMemo(() => {
    const memberIds = new Set(workspaceMembers.map(m => m.id));
    const taskCreatorIds = tasks
      .map((t) => t.createdBy)
      .filter(Boolean) // Filter out null/undefined
      .filter((id) => !memberIds.has(id));
    
    console.log('🔍 Creator IDs to fetch:', {
      creatorIds: [...new Set(taskCreatorIds)],
      fromTasks: tasks.map(t => ({ title: t.title, createdBy: t.createdBy }))
    });
    
    return [...new Set(taskCreatorIds)];
  }, [tasks, workspaceMembers]);
  
  // Extract assignee IDs that aren't in workspaceMembers
  const assigneeIds = useMemo(() => {
    const memberIds = new Set(workspaceMembers.map(m => m.id));
    const taskAssigneeIds = tasks
      .flatMap((t) => Array.isArray(t.assignees) ? t.assignees : [])
      .filter(Boolean) // Filter out null/undefined
      .filter((id) => !memberIds.has(id));
    
    console.log('🔍 Assignee IDs to fetch:', {
      assigneeIds: [...new Set(taskAssigneeIds)],
      fromTasks: tasks.map(t => ({ 
        title: t.title, 
        assignees: Array.isArray(t.assignees) ? t.assignees : [] 
      }))
    });
    
    return [...new Set(taskAssigneeIds)];
  }, [tasks, workspaceMembers]);
  
  // Fetch missing creators
  const { data: missingCreators = [] } = useQuery({
    queryKey: ['missing-creators', creatorIds],
    queryFn: async () => {
      if (creatorIds.length === 0) return [];
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .in('id', creatorIds)
        .is('deleted_at', null);
      
      if (error) {
        console.error('Error fetching missing creators:', error);
        return [];
      }
      
      const creators = (data || []).map((u: any) => ({
        id: u.id,
        authId: u.auth_id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        avatarUrl: u.avatar_url,
        isAdmin: u.is_admin,
        title: u.title,
        shortId: u.short_id,
        lastActiveAt: u.last_active_at,
        createdAt: u.created_at,
        updatedAt: u.updated_at,
        deletedAt: u.deleted_at,
        deletedBy: u.deleted_by,
      }));
      
      console.log('📥 Missing creators fetched:', {
        count: creators.length,
        users: creators.map((u: User) => ({ id: u.id, name: u.name }))
      });
      
      return creators;
    },
    enabled: creatorIds.length > 0,
  });
  
  // Fetch missing assignees
  const { data: missingAssignees = [] } = useQuery({
    queryKey: ['missing-assignees', assigneeIds],
    queryFn: async () => {
      if (assigneeIds.length === 0) return [];
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .in('id', assigneeIds)
        .is('deleted_at', null);
      
      if (error) {
        console.error('Error fetching missing assignees:', error);
        return [];
      }
      
      const assignees = (data || []).map((u: any) => ({
        id: u.id,
        authId: u.auth_id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        avatarUrl: u.avatar_url,
        isAdmin: u.is_admin,
        title: u.title,
        shortId: u.short_id,
        lastActiveAt: u.last_active_at,
        createdAt: u.created_at,
        updatedAt: u.updated_at,
        deletedAt: u.deleted_at,
        deletedBy: u.deleted_by,
      }));
      
      console.log('📥 Missing assignees fetched:', {
        requested: assigneeIds,
        received: assignees.length,
        users: assignees.map((u: User) => ({ id: u.id, name: u.name })),
        missing: assigneeIds.filter(id => !assignees.find((u: User) => u.id === id))
      });
      
      return assignees;
    },
    enabled: assigneeIds.length > 0,
  });
  
  // Combine workspaceMembers with missing creators and assignees
  const allUsers = useMemo(() => {
    const combined = [...workspaceMembers, ...missingCreators, ...missingAssignees];
    
    console.log('👥 Final allUsers array:', {
      total: combined.length,
      sources: {
        workspaceMembers: workspaceMembers.length,
        missingCreators: missingCreators.length,
        missingAssignees: missingAssignees.length
      },
      users: combined.map(u => ({ id: u.id, name: u.name }))
    });
    
    return combined;
  }, [workspaceMembers, missingCreators, missingAssignees]);

  // Mutations
  const createTaskMutation = useCreateTask();
  const updateTaskMutation = useUpdateTask();
  const statusToggleInProgress = useRef<Set<string>>(new Set());
  const originalStatusBeforeComplete = useRef<Map<string, Task['status']>>(new Map());

  // Cycle status helper - task_redline and progress_update both go to completed, completed goes back to its original status
  const cycleStatus = (status: Task['status'], originalStatus?: Task['status']): Task['status'] => {
    if (status === 'task_redline') return 'done_completed';
    if (status === 'progress_update') return 'done_completed';
    // done_completed goes back to its original status, or defaults to task_redline
    return originalStatus || 'task_redline';
  };

  // Handlers
  const handleTaskClick = useCallback((task: Task) => {
    setSelectedTask(task);
    
    // Fetch task creator and assignees from allUsers (includes workspaceMembers + missing creators)
    const creator = allUsers.find((u) => u.id === task.createdBy) || null;
    const assignees = allUsers.filter((u) => task.assignees.includes(u.id));
    
    setTaskCreator(creator);
    setTaskAssignees(assignees);
  }, [allUsers]);

  const handleProjectClick = useCallback((projectId: string) => {
    navigateToWorkspace(`/project/${projectId}?tab=files`);
  }, [navigateToWorkspace]);

  const handleStatusToggle = useCallback((taskId: string) => {
    // Prevent multiple rapid clicks on the same task
    if (statusToggleInProgress.current.has(taskId)) {
      return;
    }
    
    // Prevent if mutation is already pending
    if (updateTaskMutation.isPending) {
      return;
    }
    
    // Get the latest task status from the query cache to avoid stale data
    const queryKey = taskKeys.workspace(currentWorkspaceId || '');
    const cachedTasks: Task[] | undefined = queryClient.getQueryData(queryKey);
    const task = cachedTasks?.find((t) => t.id === taskId) || tasks.find((t) => t.id === taskId);
    
    if (!task) {
      return;
    }
    
    // Mark this task as being toggled immediately
    statusToggleInProgress.current.add(taskId);
    
    const currentStatus = task.status;
    let nextStatus: Task['status'];
    
    if (currentStatus === 'done_completed') {
      // Restore to original status if available, otherwise default to task_redline
      const originalStatus = originalStatusBeforeComplete.current.get(taskId);
      nextStatus = originalStatus || 'task_redline';
      // Remove from map after restoring
      originalStatusBeforeComplete.current.delete(taskId);
    } else {
      // Store the current status as the original before marking as completed
      originalStatusBeforeComplete.current.set(taskId, currentStatus);
      nextStatus = 'done_completed';
    }
    
    // Trigger mutation immediately - optimistic update will handle UI update
    updateTaskMutation.mutate(
      {
        id: taskId,
        input: { status: nextStatus },
      },
      {
        onSettled: () => {
          // Remove from set after mutation completes
          statusToggleInProgress.current.delete(taskId);
        },
      }
    );
  }, [tasks, updateTaskMutation, queryClient, currentWorkspaceId]);

  const handleUpdateTaskAssignees = useCallback((taskId: string, assignees: string[]) => {
    updateTaskMutation.mutate({
      id: taskId,
      input: { assignees },
    });
  }, [updateTaskMutation]);

  const uploadTaskFileMutation = useUploadTaskFile();

  const handleQuickAdd = useCallback(
    async (input: { title: string; projectId: string; assignees: string[]; status: Task['status']; files: File[] }) => {
      // Create the task first
      createTaskMutation.mutate(
        {
          title: input.title,
          projectId: input.projectId,
          assignees: input.assignees,
          status: input.status,
          description: '',
          priority: 'medium',
        },
        {
          onSuccess: async (task) => {
            // Upload files after task is created
            if (input.files.length > 0) {
              for (const file of input.files) {
                try {
                  await uploadTaskFileMutation.mutateAsync({
                    file,
                    taskId: task.id,
                    projectId: input.projectId,
                  });
                } catch (error) {
                  console.error('Error uploading file:', error);
                }
              }
            }
          },
        }
      );
    },
    [createTaskMutation, uploadTaskFileMutation]
  );

  const handleTaskUpdate = useCallback(
    (updates: Partial<Task>) => {
      if (selectedTask) {
        updateTaskMutation.mutate({
          id: selectedTask.id,
          input: updates,
        });
      }
    },
    [selectedTask, updateTaskMutation]
  );

  if (tasksLoading) {
    return (
      <div className="relative h-full w-full">
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
          <div className="text-center">
            <div className="text-[10px] text-muted-foreground mb-2">Loading tasks...</div>
            <div className="h-1 w-32 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary animate-pulse" style={{ width: `${loadingProgress}%` }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="px-6 pt-1 pb-12 h-full flex flex-col overflow-hidden relative">
        {/* Fixed Tabs - stays at top */}
        <div ref={tabsRef} className="mt-1 mb-3 shrink-0 relative z-10">
          <TabsRow tabs={tabs} active={viewTab} onChange={setViewTab} />
        </div>

        {/* Content area that shifts left when drawer opens */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div
            className="flex-1 flex flex-col transition-[margin-right] duration-200 ease-out"
            style={{ marginRight: selectedTask ? drawerWidth : 0 }}
          >
            {/* Filter row - moves left with table */}
            <div className="-mx-6 px-6 mt-1.5 mb-0 flex items-center justify-between gap-2 text-[12px] h-6 shrink-0">
              <div className="flex items-center gap-2.5 text-[#202020] font-medium">
                <button className="inline-flex items-center gap-1 h-6 px-3 rounded-full border border-slate-200 bg-white text-[#202020] hover:bg-slate-50 transition-colors">
                  Group: Status
                </button>
                <button className="inline-flex items-center gap-1 h-6 px-3 rounded-full border border-slate-200 bg-white text-[#202020] hover:bg-slate-50 transition-colors">
                  Subtasks
                </button>
                <button className="inline-flex items-center gap-1 h-6 px-3 rounded-full border border-slate-200 bg-white text-[#202020] hover:bg-slate-50 transition-colors">
                  Columns
                </button>
              </div>
              <div className="flex items-center gap-2.5 font-medium">
                <button className="h-6 px-3 rounded-full border border-slate-200 bg-white inline-flex items-center gap-1 hover:bg-slate-50 transition-colors">
                  Save view
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>
                <button className="h-6 px-3 rounded-full text-slate-600 hover:bg-slate-100 transition-colors">Filter</button>
                <button 
                  onClick={() => setShowClosedOnly(!showClosedOnly)}
                  className={`h-6 px-3 rounded-full transition-colors inline-flex items-center gap-1 ${
                    showClosedOnly 
                      ? 'border border-slate-200 bg-white text-[#202020] hover:bg-slate-50' 
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Closed
                </button>
                <button className="h-6 px-3 rounded-full text-slate-600 hover:bg-slate-100 transition-colors">Assignee</button>
                <button className="h-6 w-6 rounded-full bg-slate-900 text-white grid place-items-center text-[11px]">A</button>
              </div>
            </div>

            {/* Tasks table */}
            <div className="flex-1 overflow-hidden">
              <TasksTable
                tasks={tasks}
                projects={projects}
                users={allUsers}
                onTaskClick={handleTaskClick}
                onProjectClick={handleProjectClick}
                onStatusToggle={handleStatusToggle}
                onQuickAdd={handleQuickAdd}
                onUpdateTaskAssignees={handleUpdateTaskAssignees}
                showClosedOnly={showClosedOnly}
              />
            </div>
          </div>
        </div>

        {/* Drawer - positioned absolutely from tabs border to bottom of page */}
        <TaskDrawer
          open={!!selectedTask}
          task={selectedTask}
          width={drawerWidth}
          topOffset={tabsTop}
          onWidthChange={setDrawerWidth}
          projectName={selectedTask ? (projects.find((p: any) => p.id === selectedTask.projectId)?.name || undefined) : undefined}
          users={allUsers}
          assignees={taskAssignees}
          createdBy={taskCreator}
          onClose={() => setSelectedTask(null)}
          onUpdate={handleTaskUpdate}
          onStatusToggle={handleStatusToggle}
          onDeleteTask={async (taskId) => {
            await deleteTaskMutation.mutateAsync(taskId);
            setSelectedTask(null);
          }}
        />
      </div>

    </>
  );
});

// Export components for use in page wrappers
export { 
  RehomeDoubleSidebar as TeamDashboardLayout,
  TasksView,
  HomeView,
  ChatView,
  TabsRow,
  TopHeader
};
