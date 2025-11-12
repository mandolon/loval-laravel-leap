import { ChevronRight, ChevronDown } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspaceMessages } from "@/lib/api/hooks/useWorkspaceChat";

// Collapsible container with smooth animation (same as ProjectPanel)
function Expander({ isOpen, children }: { isOpen: boolean; children: React.ReactNode }) {
  const style = {
    display: "grid",
    gridTemplateRows: isOpen ? "1fr" : "0fr",
    transition: "grid-template-rows 240ms cubic-bezier(0.34, 1.56, 0.64, 1)",
  };
  return (
    <div style={style}>
      <div className="overflow-hidden">{children}</div>
    </div>
  );
}

const THEME = {
  background: "#fcfcfc",
  card: "#ffffff",
  border: "#e2e8f0",
  text: "#0f172a",
  textSecondary: "#475569",
  hover: "#f1f5f9",
  activeBackground: "rgba(76, 117, 209, 0.1)",
};

interface Project {
  id: string;
  name: string;
  description?: string;
  updated_at?: string;
  created_at?: string;
  unreadChatCount?: number;
  latestMessageAt?: string | null;
}

interface ChatSidePanelProps {
  projects: Project[];
  selectedProject: Project | null;
  onProjectSelect: (project: Project) => void;
  workspaceId?: string;
  isWorkspaceChat: boolean;
  onWorkspaceChatSelect: () => void;
}

export function ChatSidePanel({
  projects,
  selectedProject,
  onProjectSelect,
  workspaceId,
  isWorkspaceChat,
  onWorkspaceChatSelect,
}: ChatSidePanelProps) {
  const [recentExpanded, setRecentExpanded] = useState(true);
  const [allExpanded, setAllExpanded] = useState(true);
  const queryClient = useQueryClient();

  // Fetch workspace messages to check for unread
  const { data: workspaceMessages = [] } = useWorkspaceMessages(workspaceId || "");

  // Fetch latest message timestamps for all projects
  const { data: projectLatestMessages = [] } = useQuery({
    queryKey: ['project-latest-messages-side-panel', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      
      const projectIds = projects.map(p => p.id);
      if (projectIds.length === 0) return [];
      
      const messagesPromises = projectIds.map(async (projectId) => {
        const { data: latestMsg } = await supabase
          .from('project_chat_messages')
          .select('created_at')
          .eq('project_id', projectId)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        return {
          projectId,
          latestMessageAt: latestMsg?.created_at || null,
        };
      });
      
      return Promise.all(messagesPromises);
    },
    enabled: !!workspaceId && projects.length > 0,
  });

  // Get the latest workspace message timestamp
  const latestWorkspaceMessageAt = useMemo(() => {
    if (workspaceMessages.length === 0) return null;
    return workspaceMessages[workspaceMessages.length - 1]?.createdAt || null;
  }, [workspaceMessages]);

  // Set up realtime subscription for instant notification updates on all project messages
  useEffect(() => {
    if (!workspaceId) return;

    const channel = supabase
      .channel('chat-side-panel-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_chat_messages',
        },
        () => {
          // Force re-render by invalidating queries
          queryClient.invalidateQueries({ queryKey: ['project-latest-messages-side-panel'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workspaceId, queryClient]);

  // Helper to check unread messages
  const getLastViewedKey = (projectId: string | null, workspaceIdParam: string | null) => {
    if (projectId) return `last_viewed_project_${projectId}`;
    if (workspaceIdParam) return `last_viewed_workspace_${workspaceIdParam}`;
    return null;
  };

  // Check if workspace has unread messages
  const hasUnreadWorkspaceMessages = useMemo(() => {
    if (!workspaceId || workspaceMessages.length === 0) return false;
    const key = getLastViewedKey(null, workspaceId);
    if (!key) return false;
    const lastViewed = parseInt(localStorage.getItem(key) || '0', 10);
    return workspaceMessages.length > lastViewed;
  }, [workspaceId, workspaceMessages.length]);

  // Check if a project has unread messages
  const hasUnreadProjectMessages = (projectId: string, messageCount: number) => {
    if (messageCount === 0) return false;
    const key = getLastViewedKey(projectId, null);
    if (!key) return false;
    const lastViewed = parseInt(localStorage.getItem(key) || '0', 10);
    return messageCount > lastViewed;
  };

  // Sort projects by most recent message timestamp
  const sortedProjects = useMemo(() => {
    return [...projects]
      .map((project) => {
        const latestData = projectLatestMessages.find((p) => p.projectId === project.id);
        return {
          ...project,
          latestMessageAt: latestData?.latestMessageAt,
        };
      })
      .sort((a, b) => {
        const aTime = a.latestMessageAt ? new Date(a.latestMessageAt).getTime() : 0;
        const bTime = b.latestMessageAt ? new Date(b.latestMessageAt).getTime() : 0;
        return bTime - aTime;
      });
  }, [projects, projectLatestMessages]);

  // Filter recent projects to only show those with messages
  const recentProjects = sortedProjects.filter(p => p.latestMessageAt).slice(0, 6);
  const allProjects = sortedProjects;

  const formatAccessTime = (timestamp?: string) => {
    if (!timestamp) return "";
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true }).replace("about ", "");
    } catch {
      return "";
    }
  };

  return (
    <div
      className="w-64 h-full flex flex-col border-r overflow-hidden"
      style={{
        background: THEME.background,
        borderColor: THEME.border,
      }}
    >
      {/* Header */}
      <div className="p-4 border-b" style={{ borderColor: THEME.border }}>
        <button
          onClick={onWorkspaceChatSelect}
          className="w-full flex items-center justify-between transition-colors p-2 -m-2 rounded-lg relative"
          style={{
            background: isWorkspaceChat ? THEME.activeBackground : "transparent",
          }}
          onMouseEnter={(e) => {
            if (!isWorkspaceChat) {
              e.currentTarget.style.background = THEME.hover;
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = isWorkspaceChat ? THEME.activeBackground : "transparent";
          }}
        >
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <div className="text-left">
              <div className="text-sm font-medium" style={{ color: THEME.text }}>
                Workspace chat
              </div>
              <div className="text-xs" style={{ color: THEME.textSecondary }}>
                {latestWorkspaceMessageAt && formatAccessTime(latestWorkspaceMessageAt)}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasUnreadWorkspaceMessages && (
              <div 
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: '#e93d82' }}
              />
            )}
            <ChevronRight className="h-4 w-4 opacity-40" />
          </div>
        </button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 h-0">
        {/* Recent Projects */}
        {recentProjects.length > 0 && (
          <div className="p-4">
            <button
              onClick={() => setRecentExpanded(!recentExpanded)}
              className="w-full flex items-center gap-2 text-xs font-semibold mb-2 px-2 py-1 rounded hover:bg-slate-100 transition-colors"
              style={{ color: THEME.textSecondary }}
            >
              <ChevronDown
                className="h-3.5 w-3.5 transition-transform"
                style={{
                  transform: recentExpanded ? "rotate(0deg)" : "rotate(-90deg)",
                }}
              />
              RECENT PROJECTS
            </button>
            <Expander isOpen={recentExpanded}>
              <div className="space-y-1 mb-2">
                {recentProjects.map((project) => {
                  const hasUnread = hasUnreadProjectMessages(project.id, project.unreadChatCount || 0);
                  return (
                    <button
                      key={project.id}
                      onClick={() => onProjectSelect(project)}
                      className="w-full text-left px-3 py-2 rounded-lg transition-colors"
                      style={{
                        background:
                          project.id === selectedProject?.id && !isWorkspaceChat
                            ? THEME.hover
                            : "transparent",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = THEME.hover)
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background =
                          project.id === selectedProject?.id && !isWorkspaceChat
                            ? THEME.hover
                            : "transparent")
                      }
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium" style={{ color: THEME.text }}>
                            {project.name}
                          </div>
                          <div className="text-xs mt-0.5" style={{ color: THEME.textSecondary }}>
                            {project.latestMessageAt && formatAccessTime(project.latestMessageAt)}
                          </div>
                        </div>
                        {hasUnread && (
                          <div 
                            className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5"
                            style={{ backgroundColor: '#e93d82' }}
                          />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </Expander>
          </div>
        )}

        {/* All Projects */}
        <div className="p-4 pt-2">
          <button
            onClick={() => setAllExpanded(!allExpanded)}
            className="w-full flex items-center gap-2 text-xs font-semibold mb-2 px-2 py-1 rounded hover:bg-slate-100 transition-colors"
            style={{ color: THEME.textSecondary }}
          >
            <ChevronDown
              className="h-3.5 w-3.5 transition-transform"
              style={{
                transform: allExpanded ? "rotate(0deg)" : "rotate(-90deg)",
              }}
            />
            ALL PROJECTS
          </button>
          <Expander isOpen={allExpanded}>
            <div className="space-y-1">
              {allProjects.map((project) => {
                const hasUnread = hasUnreadProjectMessages(project.id, project.unreadChatCount || 0);
                return (
                  <button
                    key={project.id}
                    onClick={() => onProjectSelect(project)}
                    className="w-full text-left px-3 py-2 rounded-lg transition-colors"
                    style={{
                      background:
                        project.id === selectedProject?.id && !isWorkspaceChat
                          ? THEME.hover
                          : "transparent",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = THEME.hover)
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background =
                        project.id === selectedProject?.id && !isWorkspaceChat
                          ? THEME.hover
                          : "transparent")
                    }
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-medium" style={{ color: THEME.text }}>
                        {project.name}
                      </div>
                      {hasUnread && (
                        <div 
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: '#e93d82' }}
                        />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </Expander>
        </div>
      </ScrollArea>
    </div>
  );
}
