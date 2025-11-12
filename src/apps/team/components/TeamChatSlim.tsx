import React, { useMemo, useRef, useState, useEffect } from "react";
import { ChevronDown, PanelLeftClose, PanelLeft } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  useProjectMessages, 
  useCreateMessage, 
  useDeleteMessage 
} from "@/lib/api/hooks/useProjectChat";
import {
  useWorkspaceMessages,
  useCreateWorkspaceMessage,
  useDeleteWorkspaceMessage,
  useUpdateWorkspaceMessage
} from "@/lib/api/hooks/useWorkspaceChat";
import { useProjects } from "@/lib/api/hooks/useProjects";
import { WorkspaceChatMessage } from "./WorkspaceChatMessage";
import { TeamAvatar } from "@/components/TeamAvatar";
import { useToast } from "@/hooks/use-toast";
import { useProjectFiles, useUploadChatFiles } from "@/lib/api/hooks/useProjectFiles";
import { useWorkspaceFiles, useUploadWorkspaceFiles } from "@/lib/api/hooks/useWorkspaceFiles";
import type { Project } from "@/lib/api/types";
import TeamFilesView from "./TeamFilesView";
import WorkspaceFilesView from "./WorkspaceFilesView";
import { ChatHeader } from "./chat/ChatHeader";
import { ChatSidePanel } from "./chat/ChatSidePanel";
import { supabase } from "@/integrations/supabase/client";
import FileUploadChip, { type UploadStatus } from "@/components/chat/FileUploadChip";
import { format, isToday, isYesterday, isSameDay, parseISO } from "date-fns";
import { 
  useMarkWorkspaceChatAsRead, 
  useMarkProjectChatAsRead, 
  useWorkspaceLastReadAt, 
  useProjectLastReadAt,
  useUnreadMessageIds 
} from "@/lib/api/hooks/useChatReadReceipts";

// Theme Configuration - Exact from reference
const THEME = {
  background: "#fcfcfc",
  card: "#ffffff",
  border: "#e2e8f0",
  text: "#0f172a",
  textSecondary: "#475569",
  accent: "#4C75D1",
  hover: "#f1f5f9",
  highlight: "#f1f5f9",
  backdrop: "rgba(252, 252, 252, 0.8)", // Semi-transparent backdrop
  avatarBackground: "#000000",
  avatarBorder: "#000000",
  avatarText: "#ffffff",
  fontFamily: "'Segoe UI', 'Roboto', 'Helvetica Neue', -apple-system, BlinkMacSystemFont, Arial, sans-serif",
  borderRadius: "12px",
};

const availableTags = ["General", "Markup", "Progress", "Complete"];

// Date Divider Component
function DateDivider({ date }: { date: string }) {
  const formatDate = (dateStr: string) => {
    const parsedDate = parseISO(dateStr);
    if (isToday(parsedDate)) return "Today";
    if (isYesterday(parsedDate)) return "Yesterday";
    return format(parsedDate, "MMMM d, yyyy");
  };

  return (
    <div className="flex items-center justify-center my-2 px-4">
      <div 
        className="text-xs font-normal px-2.5 py-1 rounded-md"
        style={{ 
          color: "#94a3b8",
          opacity: 0.7
        }}
      >
        {formatDate(date)}
      </div>
    </div>
  );
}

// Helper function to group messages by date
function groupMessagesByDate(messages: any[]) {
  const grouped: { date: string; messages: any[] }[] = [];
  let currentDate: string | null = null;

  messages.forEach((msg) => {
    const msgDate = format(parseISO(msg.createdAt), "yyyy-MM-dd");
    
    if (msgDate !== currentDate) {
      currentDate = msgDate;
      grouped.push({ date: msg.createdAt, messages: [msg] });
    } else {
      grouped[grouped.length - 1].messages.push(msg);
    }
  });

  return grouped;
}

interface TeamChatSlimProps {
  projects: Project[];
  selectedProject: Project | null;
  onProjectSelect: (project: Project | null) => void;
  onToggleSidebar: () => void;
  onToggleFiles: () => void;
  onFileSelect?: (fileId: string) => void;
  page?: 'chat' | 'files';
  onPageChange?: (page: 'chat' | 'files') => void;
  showSidePanel?: boolean;
  workspaceId?: string;
}

export default function TeamChatSlim({
  projects,
  selectedProject,
  onProjectSelect,
  onToggleSidebar,
  onToggleFiles,
  onFileSelect,
  page = 'chat',
  onPageChange,
  showSidePanel = false,
  workspaceId,
}: TeamChatSlimProps) {
  const { user } = useUser();
  const [text, setText] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<Array<{ id: string; name: string }>>([]);
  const [uploads, setUploads] = useState<Array<{ id: string; file: File; progress: number; status: UploadStatus }>>([]);
  const [selectedTag, setSelectedTag] = useState("General");
  const [showChatSelector, setShowChatSelector] = useState(false);
  const [showTagSelector, setShowTagSelector] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showMobilePopover, setShowMobilePopover] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState({ x: 0, y: 0 });
  const [popoverMessageId, setPopoverMessageId] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<{ messageId: string; userName: string } | null>(null);
  const [isWorkspaceChat, setIsWorkspaceChat] = useState(false);
  const [isSidePanelCollapsed, setIsSidePanelCollapsed] = useState(true);
  const [fileViewMode, setFileViewMode] = useState<'grid' | 'list'>('grid');
  const [fileSelectMode, setFileSelectMode] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Get mark as read mutations
  const markWorkspaceChatAsRead = useMarkWorkspaceChatAsRead();
  const markProjectChatAsRead = useMarkProjectChatAsRead();

  // Get last read timestamps for highlighting new messages
  const { data: workspaceLastReadAt } = useWorkspaceLastReadAt(
    isWorkspaceChat ? (workspaceId || "") : "",
    user?.id || ""
  );
  const { data: projectLastReadAt } = useProjectLastReadAt(
    isWorkspaceChat ? "" : (selectedProject?.id || ""),
    user?.id || ""
  );

  const currentLastReadAt = isWorkspaceChat ? workspaceLastReadAt : projectLastReadAt;

  // Fetch project messages or workspace messages based on mode
  const { data: rawProjectMessages = [] } = useProjectMessages(
    isWorkspaceChat ? "" : (selectedProject?.id || "")
  );
  const { data: rawWorkspaceMessages = [] } = useWorkspaceMessages(
    isWorkspaceChat ? (workspaceId || "") : ""
  );
  const { data: projectFiles = [] } = useProjectFiles(selectedProject?.id || "");
  const { data: workspaceFiles = [] } = useWorkspaceFiles(
    isWorkspaceChat ? (workspaceId || "") : ""
  );
  const uploadWorkspaceFiles = useUploadWorkspaceFiles(workspaceId || "");
  const uploadProjectChatFiles = useUploadChatFiles(selectedProject?.id || "");
  const createProjectMessage = useCreateMessage();
  const createWorkspaceChatMessage = useCreateWorkspaceMessage();
  const deleteProjectMessage = useDeleteMessage();
  const deleteWorkspaceChatMessage = useDeleteWorkspaceMessage();
  const updateWorkspaceMessage = useUpdateWorkspaceMessage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch workspace projects for header dropdown when in workspace mode
  const { data: workspaceProjects = [] } = useProjects(workspaceId || "");

  // Track last viewed message counts to determine if there are unread messages
  const getLastViewedKey = (projectId: string | null, workspaceIdParam: string | null) => {
    if (projectId) return `last_viewed_project_${projectId}`;
    if (workspaceIdParam) return `last_viewed_workspace_${workspaceIdParam}`;
    return null;
  };

  // Mark chat as viewed when messages are loaded - use database instead of localStorage
  useEffect(() => {
    if (selectedProject?.id && rawProjectMessages.length > 0 && user?.id) {
      const latestMessage = rawProjectMessages[rawProjectMessages.length - 1];
      // Only mark as read if message is from another user
      if (latestMessage.userId !== user.id) {
        markProjectChatAsRead.mutate({
          projectId: selectedProject.id,
          userId: user.id,
          lastMessageId: latestMessage.id,
        });
      }
    }
  }, [selectedProject?.id, rawProjectMessages.length, user?.id]);

  useEffect(() => {
    if (isWorkspaceChat && workspaceId && rawWorkspaceMessages.length > 0 && user?.id) {
      const latestMessage = rawWorkspaceMessages[rawWorkspaceMessages.length - 1];
      // Only mark as read if message is from another user
      if (latestMessage.userId !== user.id) {
        markWorkspaceChatAsRead.mutate({
          workspaceId,
          userId: user.id,
          lastMessageId: latestMessage.id,
        });
      }
    }
  }, [isWorkspaceChat, workspaceId, rawWorkspaceMessages.length, user?.id]);

  // Check if workspace has unread messages
  const hasWorkspaceMessages = useMemo(() => {
    if (!workspaceId || rawWorkspaceMessages.length === 0) return false;
    const key = getLastViewedKey(null, workspaceId);
    if (!key) return false;
    const lastViewed = parseInt(localStorage.getItem(key) || '0', 10);
    return rawWorkspaceMessages.length > lastViewed;
  }, [workspaceId, rawWorkspaceMessages.length]);

  // Check if a project has unread messages
  const hasUnreadProjectMessages = (projectId: string, messageCount: number) => {
    if (messageCount === 0) return false;
    const key = getLastViewedKey(projectId, null);
    if (!key) return false;
    const lastViewed = parseInt(localStorage.getItem(key) || '0', 10);
    return messageCount > lastViewed;
  };

  // Fetch latest message timestamp for each project
  const { data: projectLatestMessages = [] } = useQuery({
    queryKey: ['project-latest-messages', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      
      const { data: projectsData } = await supabase
        .from('projects')
        .select('id')
        .eq('workspace_id', workspaceId)
        .is('deleted_at', null);
      
      if (!projectsData) return [];
      
      const messagesPromises = projectsData.map(async (project) => {
        const { data: latestMsg } = await supabase
          .from('project_chat_messages')
          .select('created_at')
          .eq('project_id', project.id)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        return {
          projectId: project.id,
          latestMessageAt: latestMsg?.created_at || null,
        };
      });
      
      return Promise.all(messagesPromises);
    },
    enabled: !!workspaceId,
  });

  // Set up realtime subscription for instant notification updates
  useEffect(() => {
    if (!workspaceId) return;

    const channel = supabase
      .channel('all-project-messages-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_chat_messages',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['project-latest-messages', workspaceId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workspaceId, queryClient]);

  // Filter and sort projects with chat messages, limit to 5
  const recentProjectsWithChats = useMemo(() => {
    const projectsWithMessages = projects
      .map((project) => {
        const latestData = projectLatestMessages.find((p) => p.projectId === project.id);
        return {
          ...project,
          latestMessageAt: latestData?.latestMessageAt,
        };
      })
      .filter((p) => p.latestMessageAt !== null && p.latestMessageAt !== undefined)
      .sort((a, b) => {
        if (!a.latestMessageAt || !b.latestMessageAt) return 0;
        return new Date(b.latestMessageAt).getTime() - new Date(a.latestMessageAt).getTime();
      })
      .slice(0, 5);
    
    return projectsWithMessages;
  }, [projects, projectLatestMessages]);

  // Use appropriate messages based on mode
  const rawMessages = isWorkspaceChat ? rawWorkspaceMessages : rawProjectMessages;
  const createMessage = isWorkspaceChat ? createWorkspaceChatMessage : createProjectMessage;
  const deleteMessage = isWorkspaceChat ? deleteWorkspaceChatMessage : deleteProjectMessage;

  // Transform messages to include file data
  const messages = useMemo(() => {
    return rawMessages.map((msg) => {
      const replyToMsg = msg.replyToMessageId
        ? rawMessages.find((m) => m.id === msg.replyToMessageId)
        : null;

      return {
        id: msg.id,
        userId: msg.userId,
        user: msg.user,
        content: msg.content,
        createdAt: msg.createdAt,
        fileDetails: msg.fileDetails,
        tag: undefined,
        replyTo: replyToMsg
          ? {
              messageId: replyToMsg.id,
              userName: replyToMsg.user?.name || "User",
            }
          : undefined,
      };
    });
  }, [rawMessages]);

  // Get unread message IDs for highlighting
  const unreadMessageIds = useUnreadMessageIds(
    rawMessages.map(m => ({
      id: m.id,
      created_at: m.createdAt,
      user_id: m.userId,
    })),
    currentLastReadAt,
    user?.id || ''
  );

  const handleSend = () => {
    const body = text.trim();
    if (!body && attachedFiles.length === 0) return;
    if (!user) return;
    
    if (isWorkspaceChat) {
      if (!workspaceId) return;
      createWorkspaceChatMessage.mutate({
        workspace_id: workspaceId,
        content: body,
        reply_to_message_id: replyingTo?.messageId,
        referenced_files: attachedFiles.map(f => f.id),
      });
    } else {
      if (!selectedProject) return;
      createProjectMessage.mutate({
        projectId: selectedProject.id,
        content: body,
        replyToMessageId: replyingTo?.messageId,
        referencedFiles: attachedFiles.map(f => f.id),
      });
    }

    setText("");
    setAttachedFiles([]);
    setUploads([]);
    setReplyingTo(null);
    
    requestAnimationFrame(() => {
      const textarea = document.querySelector("textarea");
      if (textarea) {
        textarea.style.height = "auto";
      }
      setTimeout(() => {
        const viewport = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
        if (viewport) {
          viewport.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" });
        }
      }, 50);
    });
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddFile = () => {
    fileInputRef.current?.click();
  };

  const processFiles = (files: File[]) => {
    if (!files.length) return;

    const now = Date.now();
    const newUploads = files.map((f, i) => ({
      id: `${now}-${i}-${Math.random().toString(36).slice(2, 8)}`,
      file: f,
      progress: 0,
      status: 'uploading' as UploadStatus,
    }));
    setUploads((prev) => [...prev, ...newUploads]);

    // Upload files and track real progress
    newUploads.forEach(async (item) => {
      const fileId = item.id;
      
      try {
        // Simulate progress while uploading
        let simulatedProgress = 0;
        const progressInterval = setInterval(() => {
          simulatedProgress = Math.min(90, simulatedProgress + 10);
          setUploads((files) =>
            files.map((f) => 
              f.id === fileId 
                ? { ...f, progress: simulatedProgress } 
                : f
            )
          );
        }, 200);

        // Actually upload the file
        let uploadedFiles;
        if (isWorkspaceChat && workspaceId) {
          uploadedFiles = await uploadWorkspaceFiles.mutateAsync({
            files: [item.file],
          });
        } else if (selectedProject) {
          uploadedFiles = await uploadProjectChatFiles.mutateAsync([item.file]);
        }

        // Clear interval and complete progress
        clearInterval(progressInterval);
        
        if (uploadedFiles && uploadedFiles.length > 0) {
          setUploads((files) =>
            files.map((f) => 
              f.id === fileId 
                ? { ...f, progress: 100, status: 'done' as UploadStatus } 
                : f
            )
          );
          
          setAttachedFiles(prev => [...prev, {
            id: uploadedFiles[0].id,
            name: uploadedFiles[0].filename
          }]);
        } else {
          throw new Error('Upload failed');
        }
      } catch (error) {
        console.error('Error uploading file:', error);
        setUploads((files) =>
          files.map((f) => 
            f.id === fileId 
              ? { ...f, status: 'error' as UploadStatus } 
              : f
          )
        );
      }
    });
  };

  const handleFileInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    processFiles(fileArray);

    // Reset the input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveUpload = (fileId: string) => {
    setUploads((prev) => prev.filter((u) => u.id !== fileId));
  };

  const handleRemoveFile = (fileId: string) => {
    setAttachedFiles((files) => files.filter((f) => f.id !== fileId));
  };

  const hasUploading = uploads.some((f) => f.status === 'uploading');

  const handleTagClick = () => {
    setShowTagSelector(!showTagSelector);
  };

  const handleReply = (messageId: string, userName: string) => {
    setReplyingTo({ messageId, userName });
    setShowMobilePopover(false);
    const textarea = document.querySelector("textarea");
    if (textarea) {
      textarea.focus();
    }
  };

  const handleScrollToMessage = (messageId: string) => {
    const messageElement = document.getElementById(`message-${messageId}`);
    const viewport = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (messageElement && viewport) {
      messageElement.scrollIntoView({ behavior: "smooth", block: "center" });
      messageElement.style.transition = "background 0.3s";
      messageElement.style.background = THEME.highlight;
      setTimeout(() => {
        messageElement.style.background = "";
      }, 1000);
    }
  };

  const handleDeleteMessage = (messageId: string) => {
    // Show confirmation for permanent delete
    if (!confirm("Are you sure you want to permanently delete this message? This action cannot be undone.")) {
      return;
    }

    if (isWorkspaceChat) {
      if (!workspaceId) return;
      deleteWorkspaceChatMessage.mutate({ id: messageId, workspace_id: workspaceId });
    } else {
      if (!selectedProject) return;
      deleteProjectMessage.mutate({ id: messageId, projectId: selectedProject.id });
    }
    setShowMobilePopover(false);
  };

  const handleEditMessage = (messageId: string, content: string) => {
    if (isWorkspaceChat && workspaceId) {
      updateWorkspaceMessage.mutate({
        id: messageId,
        workspace_id: workspaceId,
        content: content,
      });
    }
  };

  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content).then(() => {
      toast({
        title: "Copied",
        description: "Message copied to clipboard",
      });
    }).catch(() => {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = content;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      toast({
        title: "Copied",
        description: "Message copied to clipboard",
      });
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if ((e.target as HTMLElement).classList.contains("team-app")) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const dt = e.dataTransfer;
    const files = dt?.files ? Array.from(dt.files) : [];
    processFiles(files);
  };

  const headerTitle = useMemo(
    () => ({ name: selectedProject?.name || "Workspace" }),
    [selectedProject]
  );

  useEffect(() => {
    const handleShowPopover = (e: any) => {
      const { messageId, x, y } = e.detail;
      setPopoverMessageId(messageId);
      setPopoverPosition({ x, y });
      setShowMobilePopover(true);
    };

    window.addEventListener("showMobilePopover", handleShowPopover);
    return () => window.removeEventListener("showMobilePopover", handleShowPopover);
  }, []);

  // Reset file select mode when changing pages or projects
  useEffect(() => {
    if (page === 'chat' || !selectedProject) {
      setFileSelectMode(false);
      setSelectedFiles(new Set());
    }
  }, [page, selectedProject]);

  // If showing files view, render that instead
  if (page === 'files' && (selectedProject || isWorkspaceChat)) {
    return (
      <div className="flex h-full w-full">
        {/* Side Panel */}
        {showSidePanel && (
          <div
            className="transition-all duration-300 ease-out overflow-hidden"
            style={{
              width: isSidePanelCollapsed ? 0 : "256px",
              opacity: isSidePanelCollapsed ? 0 : 1,
            }}
          >
            <ChatSidePanel
              projects={projects}
              selectedProject={selectedProject}
              onProjectSelect={(project) => {
                onProjectSelect(project as any);
                setIsWorkspaceChat(false);
              }}
              workspaceId={workspaceId}
              isWorkspaceChat={isWorkspaceChat}
              onWorkspaceChatSelect={() => {
                onProjectSelect(null);
                setIsWorkspaceChat(true);
              }}
            />
          </div>
        )}

        {/* Main Files Area - Full Width */}
        <div className="flex-1 min-h-screen flex flex-col relative" style={{ background: THEME.background }}>
          {/* Collapse/Expand Button - Top Left */}
          {showSidePanel && (
            <button
              onClick={() => setIsSidePanelCollapsed(!isSidePanelCollapsed)}
              className="absolute top-4 left-4 z-20 p-2 rounded-lg transition-colors border"
              style={{
                color: THEME.textSecondary,
                borderColor: THEME.border,
                background: THEME.card,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = THEME.hover)}
              onMouseLeave={(e) => (e.currentTarget.style.background = THEME.card)}
              title={isSidePanelCollapsed ? "Expand panel" : "Collapse panel"}
            >
              {isSidePanelCollapsed ? (
                <PanelLeft className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </button>
          )}

          <ChatHeader
            selectedProject={isWorkspaceChat ? { id: '', name: 'Workspace chat' } : selectedProject}
            projects={isWorkspaceChat ? workspaceProjects : projects}
            showChatSelector={showChatSelector}
            onToggleSidebar={onToggleSidebar}
            onToggleFiles={onToggleFiles}
            onProjectSelect={(project) => {
              onProjectSelect(project as any);
              setIsWorkspaceChat(false);
            }}
            onToggleChatSelector={() => setShowChatSelector(!showChatSelector)}
            onCloseChatSelector={() => setShowChatSelector(false)}
            showFilesControls={true}
            viewMode={fileViewMode}
            onViewModeChange={setFileViewMode}
            selectMode={fileSelectMode}
            onSelectModeChange={setFileSelectMode}
            selectedFilesCount={selectedFiles.size}
            onShareToChat={() => {
              // Share selected files to chat
              const filesToShare = isWorkspaceChat 
                ? workspaceFiles.filter(f => selectedFiles.has(f.id))
                : projectFiles.filter(f => selectedFiles.has(f.id));
              
              const attachments = filesToShare.map(f => ({
                id: f.id,
                name: f.filename
              }));
              
              setAttachedFiles(prev => [...prev, ...attachments]);
              setSelectedFiles(new Set());
              setFileSelectMode(false);
              
              if (onPageChange) {
                onPageChange('chat');
              }
            }}
            showSidePanelToggle={showSidePanel}
            isSidePanelCollapsed={isSidePanelCollapsed}
            onToggleSidePanel={() => setIsSidePanelCollapsed(!isSidePanelCollapsed)}
          />

          {isWorkspaceChat ? (
            <WorkspaceFilesView
              workspaceId={workspaceId || ''}
              viewMode={fileViewMode}
              onViewModeChange={setFileViewMode}
              selectMode={fileSelectMode}
              onSelectModeChange={setFileSelectMode}
              selectedFiles={selectedFiles}
              onSelectedFilesChange={setSelectedFiles}
              onShareToChat={() => {
                const filesToShare = workspaceFiles.filter(f => selectedFiles.has(f.id));
                const attachments = filesToShare.map(f => ({
                  id: f.id,
                  name: f.filename
                }));
                setAttachedFiles(prev => [...prev, ...attachments]);
                setSelectedFiles(new Set());
                setFileSelectMode(false);
                if (onPageChange) {
                  onPageChange('chat');
                }
              }}
            />
          ) : (
            <TeamFilesView
              projectId={selectedProject?.id || ''}
              onFileSelect={(fileId) => {
                if (onFileSelect) onFileSelect(fileId);
                if (onPageChange) onPageChange('chat');
              }}
              viewMode={fileViewMode}
              onViewModeChange={setFileViewMode}
              selectMode={fileSelectMode}
              onSelectModeChange={setFileSelectMode}
              selectedFiles={selectedFiles}
              onSelectedFilesChange={setSelectedFiles}
              onShareToChat={() => {
                const filesToShare = projectFiles.filter(f => selectedFiles.has(f.id));
                const attachments = filesToShare.map(f => ({
                  id: f.id,
                  name: f.filename
                }));
                setAttachedFiles(prev => [...prev, ...attachments]);
                setSelectedFiles(new Set());
                setFileSelectMode(false);
                if (onPageChange) {
                  onPageChange('chat');
                }
              }}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Side Panel */}
      {showSidePanel && (
        <div
          className="transition-all duration-300 ease-out overflow-hidden"
          style={{
            width: isSidePanelCollapsed ? 0 : "256px",
            opacity: isSidePanelCollapsed ? 0 : 1,
          }}
        >
          <ChatSidePanel
            projects={projects}
            selectedProject={selectedProject}
            onProjectSelect={(project) => {
              onProjectSelect(project as any);
              setIsWorkspaceChat(false);
            }}
            workspaceId={workspaceId}
            isWorkspaceChat={isWorkspaceChat}
            onWorkspaceChatSelect={() => {
              onProjectSelect(null);
              setIsWorkspaceChat(true);
            }}
          />
        </div>
      )}

      {/* Main Chat Area */}
      <div
        className="team-app flex h-full flex-col relative flex-1"
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={(e) => {
          const chatSelector = document.querySelector(".chat-selector-dropdown");
          const tagSelector = document.querySelector(".tag-selector-dropdown");
          const chatButton = (e.target as HTMLElement).closest(".chat-selector-trigger");
          const tagButton = (e.target as HTMLElement).closest("button");

          if (
            showChatSelector &&
            chatSelector &&
            !chatSelector.contains(e.target as Node) &&
            !chatButton
          ) {
            setShowChatSelector(false);
          }

          if (
            showTagSelector &&
            tagSelector &&
            !tagSelector.contains(e.target as Node) &&
            (!tagButton || !availableTags.some((tag) => tagButton.textContent?.includes(tag)))
          ) {
            setShowTagSelector(false);
          }
        }}
        style={{
          background: THEME.background,
          color: THEME.text,
        }}
      >
        {/* Collapse/Expand Button - Top Left */}
        {showSidePanel && !selectedProject && !isWorkspaceChat && (
          <button
            onClick={() => setIsSidePanelCollapsed(!isSidePanelCollapsed)}
            className="absolute top-4 left-4 z-20 p-2 rounded-lg transition-colors border"
            style={{
              color: THEME.textSecondary,
              borderColor: THEME.border,
              background: THEME.card,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = THEME.hover)}
            onMouseLeave={(e) => (e.currentTarget.style.background = THEME.card)}
            title={isSidePanelCollapsed ? "Expand panel" : "Collapse panel"}
          >
            {isSidePanelCollapsed ? (
              <PanelLeft className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>
        )}
      {isDragging && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none"
          style={{ background: THEME.highlight }}
        >
          <div
            className="rounded-2xl border-2 border-dashed p-8 text-center"
            style={{ borderColor: THEME.border }}
          >
            <svg
              className="h-16 w-16 mx-auto mb-4 opacity-60"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <div className="text-xl font-medium">Drop files to attach</div>
          </div>
        </div>
      )}

      {showMobilePopover && (
        <MobileActionPopover
          isMe={messages.find((m) => m.id === popoverMessageId)?.userId === user?.id}
          messageInfo={messages.find((m) => m.id === popoverMessageId)}
          position={popoverPosition}
          onClose={() => setShowMobilePopover(false)}
          onReply={handleReply}
          onDelete={handleDeleteMessage}
        />
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-in-out;
        }
        @keyframes unreadHighlight {
          0% {
            background-color: rgba(76, 117, 209, 0.08);
            box-shadow: inset 3px 0 0 0 #4C75D1;
          }
          100% {
            background-color: transparent;
            box-shadow: none;
          }
        }
        .unread-message-highlight {
          animation: unreadHighlight 2.5s ease-out forwards;
        }
        @media (max-width: 767px) {
          .message-content {
            -webkit-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
            user-select: none;
            -webkit-touch-callout: none;
          }
        }
      `}</style>

      {/* Chat Header */}
      {(selectedProject || isWorkspaceChat) && (
        <ChatHeader
          selectedProject={isWorkspaceChat ? { id: '', name: 'Workspace chat' } : selectedProject}
          projects={isWorkspaceChat ? workspaceProjects : projects}
          showChatSelector={showChatSelector}
          onToggleSidebar={onToggleSidebar}
          onToggleFiles={onToggleFiles}
          onProjectSelect={(project) => {
            onProjectSelect(project as any);
            setIsWorkspaceChat(false);
          }}
          onToggleChatSelector={() => setShowChatSelector(!showChatSelector)}
          onCloseChatSelector={() => setShowChatSelector(false)}
          showSidePanelToggle={showSidePanel}
          isSidePanelCollapsed={isSidePanelCollapsed}
          onToggleSidePanel={() => setIsSidePanelCollapsed(!isSidePanelCollapsed)}
        />
      )}

      {/* Messages or Empty State */}
      <ScrollArea className="flex-1 h-0" ref={scrollAreaRef}>
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-2 md:gap-3 px-4 pt-3 pb-32">
          {!selectedProject && !isWorkspaceChat ? (
            <div className="flex flex-col items-center justify-start pt-32">
              <div className="text-center max-w-md">
                <h2 className="text-2xl font-semibold mb-3" style={{ color: THEME.text }}>
                  Welcome to Chat
                </h2>
                <p className="text-lg mb-6" style={{ color: THEME.textSecondary }}>
                  Pick a project to chat, or use Workspace chat for everyone.
                </p>

                <div className="flex flex-col gap-2 mt-8">
                  {/* Workspace Chat Button */}
                  <button
                    onClick={() => {
                      onProjectSelect(null);
                      setIsWorkspaceChat(true);
                    }}
                    className="w-full text-left px-4 py-3 rounded-xl border transition-colors mb-4 relative"
                    style={{
                      borderColor: THEME.border,
                      background: THEME.card,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = THEME.hover)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = THEME.card)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <svg className="h-5 w-5 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                          />
                        </svg>
                        <div>
                          <div className="font-medium text-base">Workspace chat</div>
                          <div className="text-xs mt-0.5" style={{ color: THEME.textSecondary }}>
                            Chat with your team
                          </div>
                        </div>
                      </div>
                      {hasWorkspaceMessages && (
                        <div 
                          className="w-2 h-2 rounded-full flex-shrink-0 self-center"
                          style={{ backgroundColor: '#e93d82' }}
                        />
                      )}
                    </div>
                  </button>

                  {recentProjectsWithChats.length > 0 && (
                    <>
                      <div className="text-xs font-semibold opacity-60 mb-2 text-left">
                        RECENT PROJECTS
                      </div>
                      {recentProjectsWithChats.map((project) => {
                        const hasUnread = hasUnreadProjectMessages(project.id, project.unreadChatCount || 0);
                        return (
                          <button
                            key={project.id}
                            onClick={() => onProjectSelect(project)}
                            className="w-full text-left px-4 py-3 rounded-xl border transition-colors relative"
                            style={{
                              borderColor: THEME.border,
                              background: THEME.card,
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = THEME.hover)}
                            onMouseLeave={(e) => (e.currentTarget.style.background = THEME.card)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="font-medium text-base">{project.name}</div>
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
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : (
            groupMessagesByDate(messages).map((group, groupIndex) => (
              <React.Fragment key={group.date}>
                <DateDivider date={group.date} />
                {group.messages.map((msg: any) => {
                  if (isWorkspaceChat) {
                    return (
                      <WorkspaceChatMessage
                        key={msg.id}
                        message={{
                          id: msg.id,
                          workspaceId: workspaceId || '',
                          userId: msg.userId,
                          content: msg.content,
                          replyToMessageId: msg.replyTo?.messageId,
                          referencedFiles: msg.fileDetails?.map((f: any) => f.id) || [],
                          referencedTasks: [],
                          createdAt: msg.createdAt,
                          updatedAt: msg.createdAt,
                          user: msg.user,
                          fileDetails: msg.fileDetails,
                          replyTo: msg.replyTo ? {
                            id: msg.replyTo.messageId,
                            content: '',
                            user: {
                              id: '',
                              name: msg.replyTo.userName
                            }
                          } : null
                        }}
                        onDelete={handleDeleteMessage}
                        onReply={handleReply}
                        onEdit={handleEditMessage}
                        onCopy={handleCopyMessage}
                        currentUserId={user?.id}
                        isUnread={unreadMessageIds.includes(msg.id)}
                      />
                    );
                  } else {
                    return (
                      <MessageBlock
                        key={msg.id}
                        msg={msg}
                        currentUserId={user?.id}
                        onReply={handleReply}
                        onScrollToMessage={handleScrollToMessage}
                      />
                    );
                  }
                })}
              </React.Fragment>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Composer */}
      <div
        className="sticky bottom-0 z-10 w-full backdrop-blur-md"
        style={{ background: THEME.backdrop }}
      >
        <div className="mx-auto max-w-3xl px-4 py-2">
          <div
            className="flex flex-col gap-3 rounded-2xl border px-3 py-4 shadow-sm"
            style={{ borderColor: THEME.border, background: THEME.card }}
          >
            {replyingTo && (
              <div
                className="flex items-center justify-between px-2 py-1.5 rounded-lg"
                style={{ background: "rgba(76, 117, 209, 0.08)" }}
              >
                <div className="flex items-center gap-2 text-sm">
                  <svg
                    className="h-4 w-4"
                    style={{ color: "#4C75D1" }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                    />
                  </svg>
                  <span style={{ color: THEME.textSecondary }}>
                    Replying to{" "}
                    <span style={{ color: "#4C75D1", fontWeight: 500 }}>
                      {replyingTo.userName}
                    </span>
                  </span>
                </div>
                <button
                  onClick={() => setReplyingTo(null)}
                  className="grid h-5 w-5 shrink-0 place-items-center rounded-full transition-colors hover:opacity-70"
                  title="Cancel reply"
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            )}
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileInputChange}
              accept="*/*"
            />
            {uploads.length > 0 && (
              <div className="flex max-h-28 flex-wrap gap-2 overflow-y-auto">
                {uploads.map((u) => (
                  <FileUploadChip
                    key={u.id}
                    id={u.id}
                    filename={u.file.name}
                    projectName={isWorkspaceChat ? 'Workspace' : selectedProject?.name}
                    size={u.file.size}
                    status={u.status}
                    progress={u.progress}
                    onRemove={handleRemoveUpload}
                  />
                ))}
              </div>
            )}
            <textarea
              value={text}
              rows={1}
              placeholder="Reply..."
              onChange={(e) => setText(e.target.value)}
              onInput={(e) => autoGrow(e.currentTarget as HTMLTextAreaElement)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              className="w-full max-h-40 resize-none bg-transparent text-[15px] leading-[1.5] outline-none px-2 my-1"
              style={{ fontFamily: THEME.fontFamily, color: THEME.text }}
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleAddFile}
                  title="Add attachment"
                  className="relative grid h-8 w-8 shrink-0 place-items-center rounded-md border transition-colors"
                  style={{ borderColor: THEME.border }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = THEME.hover)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  aria-busy={hasUploading}
                >
                  {hasUploading ? (
                    <div className="spinner" aria-hidden style={{
                      width: '14px',
                      height: '14px',
                      border: '2px solid rgba(0,0,0,.15)',
                      borderTopColor: 'currentColor',
                      borderRadius: '9999px',
                    }} />
                  ) : (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                  )}
                </button>
                <div className="relative">
                  <button
                    onClick={() => !isWorkspaceChat && !selectedProject && setShowChatSelector(true)}
                    className="chat-selector-trigger flex h-8 items-center gap-1.5 rounded-md border px-2.5 transition-colors text-sm whitespace-nowrap"
                    style={{
                      borderColor: THEME.border,
                      cursor: isWorkspaceChat || selectedProject ? "default" : "pointer",
                      opacity: isWorkspaceChat ? 0.7 : 1,
                    }}
                    onMouseEnter={(e) =>
                      !isWorkspaceChat && !selectedProject && (e.currentTarget.style.background = THEME.hover)
                    }
                    onMouseLeave={(e) =>
                      !isWorkspaceChat && !selectedProject && (e.currentTarget.style.background = "transparent")
                    }
                    disabled={isWorkspaceChat || !!selectedProject}
                  >
                    <span>{isWorkspaceChat ? "Workspace chat" : (selectedProject?.name || "Select project...")}</span>
                    {!isWorkspaceChat && !selectedProject && <ChevronDown className="h-3.5 w-3.5 opacity-60" />}
                  </button>

                  {!isWorkspaceChat && !selectedProject && showChatSelector && (
                    <div
                      className="chat-selector-dropdown absolute bottom-full left-0 mb-2 w-80 rounded-2xl border shadow-lg z-30 max-h-96 overflow-y-auto"
                      style={{
                        borderColor: THEME.border,
                        background: THEME.card,
                      }}
                    >
                      <div className="p-3">
                        <div className="text-xs font-semibold opacity-60 mb-2 px-2">
                          SELECT PROJECT
                        </div>
                        {projects.map((project) => (
                          <button
                            key={project.id}
                            onClick={() => {
                              onProjectSelect(project);
                              setShowChatSelector(false);
                            }}
                            className="w-full text-left px-3 py-2 rounded-lg transition-colors"
                            onMouseEnter={(e) => (e.currentTarget.style.background = THEME.hover)}
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.background = "transparent")
                            }
                          >
                            <div className="font-medium text-sm">{project.name}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <button
                    onClick={handleTagClick}
                    className="flex h-8 items-center gap-1.5 rounded-md px-2.5 hover:opacity-80 transition-opacity text-sm whitespace-nowrap border"
                    style={{
                      background:
                        selectedTag === "General" ? "transparent" : "rgba(76, 117, 209, 0.1)",
                      borderColor:
                        selectedTag === "General" ? THEME.border : "rgba(76, 117, 209, 0.3)",
                      color: selectedTag === "General" ? THEME.text : "#4C75D1",
                    }}
                    title="Select tag"
                  >
                    <span>{selectedTag}</span>
                    <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                  </button>

                  {showTagSelector && (
                    <div
                      className="tag-selector-dropdown absolute bottom-full right-0 mb-2 w-40 rounded-xl border shadow-lg z-30"
                      style={{
                        borderColor: THEME.border,
                        background: THEME.card,
                      }}
                    >
                      <div className="p-1.5">
                        {availableTags.map((tag) => (
                          <button
                            key={tag}
                            onClick={() => {
                              setSelectedTag(tag);
                              setShowTagSelector(false);
                            }}
                            className="w-full text-left px-3 py-2 rounded-lg transition-colors text-sm"
                            style={{
                              background:
                                tag === selectedTag ? "rgba(76, 117, 209, 0.1)" : "transparent",
                              color: tag === selectedTag ? "#4C75D1" : THEME.text,
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background =
                                tag === selectedTag ? "rgba(76, 117, 209, 0.15)" : THEME.hover;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background =
                                tag === selectedTag ? "rgba(76, 117, 209, 0.1)" : "transparent";
                              e.currentTarget.style.color =
                                tag === selectedTag ? "#4C75D1" : THEME.text;
                            }}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <button
                  onClick={handleSend}
                  disabled={!text.trim() && attachedFiles.length === 0}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-md transition-colors disabled:opacity-40"
                  style={{
                    background:
                      text.trim() || attachedFiles.length > 0 ? "#4C75D1" : "#cbd5e1",
                    color: "#ffffff",
                  }}
                  onMouseEnter={(e) => {
                    if (text.trim() || attachedFiles.length > 0)
                      e.currentTarget.style.background = "#3d5fbd";
                  }}
                  onMouseLeave={(e) => {
                    if (text.trim() || attachedFiles.length > 0)
                      e.currentTarget.style.background = "#4C75D1";
                  }}
                  title="Send"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 10l7-7m0 0l7 7m-7-7v18"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

/* Message Components */

function FileChip({ file, onRemove }: { file: any; onRemove: (id: string) => void }) {
  const truncateFilename = (filename: string, maxLength = 25) => {
    if (filename.length <= maxLength) return filename;
    const ext = filename.split(".").pop();
    const nameWithoutExt = filename.slice(0, filename.length - (ext?.length || 0) - 1);
    const truncated = nameWithoutExt.slice(0, maxLength - (ext?.length || 0) - 4);
    return `${truncated}...${ext}`;
  };

  return (
    <div
      className="flex h-9 items-center gap-2 rounded-md border px-2.5 text-sm"
      style={{
        borderColor: THEME.border,
        background: THEME.card,
        minWidth: "100px",
        maxWidth: "250px",
      }}
      title={file.name}
    >
      <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
      <span className="truncate flex-1">{truncateFilename(file.name)}</span>
      <button
        onClick={() => onRemove(file.id)}
        className="grid h-4 w-4 shrink-0 place-items-center rounded-full transition-colors"
        title="Remove"
        onMouseEnter={(e) => (e.currentTarget.style.background = THEME.hover)}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      >
        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  );
}

function MessageFileButton({ file }: { file: any }) {
  const truncateFilename = (filename: string, maxLength = 30) => {
    if (filename.length <= maxLength) return filename;
    const ext = filename.split(".").pop();
    const nameWithoutExt = filename.slice(0, filename.length - (ext?.length || 0) - 1);
    const truncated = nameWithoutExt.slice(0, maxLength - (ext?.length || 0) - 4);
    return `${truncated}...${ext}`;
  };

  const handleDownload = () => {
    if (file.storage_path) {
      const { data } = supabase.storage.from('project-files').getPublicUrl(file.storage_path);
      if (data?.publicUrl) {
        window.open(data.publicUrl, '_blank');
      }
    }
  };

  return (
    <button
      onClick={handleDownload}
      className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors"
      style={{
        borderColor: THEME.border,
        maxWidth: "300px",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = THEME.hover)}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      title={file.filename || file.name}
    >
      <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
      <span className="truncate">{truncateFilename(file.filename || file.name)}</span>
    </button>
  );
}

function MobileActionPopover({ isMe, messageInfo, position, onClose, onReply, onDelete }: any) {
  const { toast } = useToast();
  
  const handleClose = () => {
    window.dispatchEvent(new CustomEvent("closeMobilePopover"));
    onClose();
  };

  const handleReplyClick = () => {
    if (messageInfo && !isMe) {
      onReply(messageInfo.id, messageInfo.user?.name || "User");
      handleClose();
    }
  };

  const handleDeleteClick = () => {
    if (messageInfo) {
      onDelete(messageInfo.id);
      handleClose();
    }
  };

  const handleCopyClick = () => {
    if (messageInfo?.content) {
      navigator.clipboard.writeText(messageInfo.content).then(() => {
        toast({
          title: "Copied",
          description: "Message copied to clipboard",
        });
      }).catch(() => {
        const textArea = document.createElement("textarea");
        textArea.value = messageInfo.content;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        toast({
          title: "Copied",
          description: "Message copied to clipboard",
        });
      });
    }
    handleClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={handleClose} />

      <div
        className="fixed z-50 rounded-xl border shadow-xl p-1.5 min-w-[160px]"
        style={{
          borderColor: THEME.border,
          background: THEME.card,
          left: `${position.x}px`,
          top: `${position.y}px`,
          transform: "translate(-50%, -50%)",
        }}
      >
        {isMe ? (
          <div className="flex flex-col gap-0.5">
            <button
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors text-left whitespace-nowrap"
              onClick={handleCopyClick}
              onMouseEnter={(e) => (e.currentTarget.style.background = THEME.hover)}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <svg
                className="h-4 w-4 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              <span className="text-sm">Copy</span>
            </button>
            <button
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors text-left whitespace-nowrap"
              onClick={handleDeleteClick}
              onMouseEnter={(e) => (e.currentTarget.style.background = THEME.hover)}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <svg
                className="h-4 w-4 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              <span className="text-sm">Delete</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            <button
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors text-left whitespace-nowrap"
              onClick={handleCopyClick}
              onMouseEnter={(e) => (e.currentTarget.style.background = THEME.hover)}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <svg
                className="h-4 w-4 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              <span className="text-sm">Copy</span>
            </button>
            <button
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors text-left whitespace-nowrap"
              onClick={handleReplyClick}
              onMouseEnter={(e) => (e.currentTarget.style.background = THEME.hover)}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <svg
                className="h-4 w-4 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                />
              </svg>
              <span className="text-sm">Reply</span>
            </button>
          </div>
        )}
      </div>
    </>
  );
}

function MessageBlock({ msg, currentUserId, onReply, onScrollToMessage }: any) {
  const isMe = msg.userId === currentUserId;
  const name = msg.user?.name ?? "";
  const [isLongPressing, setIsLongPressing] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const touchStart = useRef({ x: 0, y: 0 });
  const [hasPopoverOpen, setHasPopoverOpen] = useState(false);

  useEffect(() => {
    const handlePopoverOpen = (e: any) => {
      if (e.detail.messageId === msg.id) {
        setHasPopoverOpen(true);
      }
    };

    const handlePopoverClose = () => {
      setHasPopoverOpen(false);
    };

    window.addEventListener("showMobilePopover", handlePopoverOpen);
    window.addEventListener("closeMobilePopover", handlePopoverClose);

    return () => {
      window.removeEventListener("showMobilePopover", handlePopoverOpen);
      window.removeEventListener("closeMobilePopover", handlePopoverClose);
    };
  }, [msg.id]);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
    setIsLongPressing(true);

    const touchX = touch.clientX;
    const touchY = touch.clientY;

    longPressTimer.current = setTimeout(() => {
      if (window.innerWidth < 768) {
        const event = new CustomEvent("showMobilePopover", {
          detail: {
            messageId: msg.id,
            isMe: isMe,
            x: touchX,
            y: touchY,
          },
        });
        window.dispatchEvent(event);
      }
      setIsLongPressing(false);
    }, 500);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const moveX = Math.abs(touch.clientX - touchStart.current.x);
    const moveY = Math.abs(touch.clientY - touchStart.current.y);

    if (moveX > 10 || moveY > 10) {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
      setIsLongPressing(false);
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    setIsLongPressing(false);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (window.innerWidth >= 768) {
      const event = new CustomEvent("showMobilePopover", {
        detail: {
          messageId: msg.id,
          isMe: isMe,
          x: e.clientX,
          y: e.clientY,
        },
      });
      window.dispatchEvent(event);
    }
  };

  const isHighlighted = isLongPressing || hasPopoverOpen;

  if (isMe) {
    return (
      <div className="group pr-7 transition-all duration-200">
        <article
          id={`message-${msg.id}`}
          onContextMenu={handleContextMenu}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="rounded-2xl border p-4 shadow-[0_1px_0_rgba(0,0,0,0.03)] cursor-pointer transition-colors flex items-start gap-3"
          style={{
            borderColor: THEME.border,
            background: isHighlighted ? THEME.highlight : THEME.card,
            marginLeft: "28px",
          }}
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2 mb-0.5 flex-wrap">
              <span className="font-medium text-[14px]" style={{ color: THEME.text }}>
                {name || "You"}
              </span>
              <span className="text-xs opacity-50">{formatTime(msg.createdAt)}</span>
              {msg.replyTo && (
                <button
                  onClick={() => onScrollToMessage(msg.replyTo.messageId)}
                  className="text-xs px-2 py-0.5 rounded-md hover:opacity-80 transition-opacity cursor-pointer"
                  style={{
                    background: "rgba(76, 117, 209, 0.1)",
                    color: "#4C75D1",
                  }}
                  title="Jump to message"
                >
                  Reply to {msg.replyTo.userName}
                </button>
              )}
              {msg.tag && (
                <span
                  className="text-xs px-2 py-0.5 rounded-md"
                  style={{
                    background:
                      msg.tag === "Complete"
                        ? "#30a46c"
                        : msg.tag === "Progress"
                        ? "#4C75D1"
                        : "rgba(76, 117, 209, 0.1)",
                    color:
                      msg.tag === "Complete" || msg.tag === "Progress" ? "#ffffff" : "#4C75D1",
                  }}
                >
                  {msg.tag}
                </span>
              )}
            </div>

            {msg.content && (
              <div
                className="message-content whitespace-pre-wrap text-[16px] leading-6 md:leading-7"
                style={{ fontFamily: THEME.fontFamily, color: THEME.text }}
              >
                {msg.content}
              </div>
            )}
            {msg.fileDetails && msg.fileDetails.length > 0 && (
              <div className={`flex flex-wrap gap-2 ${msg.content ? "mt-2" : ""}`}>
                {msg.fileDetails.map((file: any) => (
                  <MessageFileButton key={file.id} file={file} />
                ))}
              </div>
            )}
          </div>
        </article>
      </div>
    );
  }

  return (
    <div className="group pr-7 transition-all duration-200">
      <div
        id={`message-${msg.id}`}
        onContextMenu={handleContextMenu}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="flex items-start gap-3 justify-start cursor-pointer rounded-2xl py-1.5 px-2 -mx-2 transition-colors"
        style={{
          background: isHighlighted ? THEME.highlight : "transparent",
        }}
      >
        <AvatarCircle name={name} user={msg.user} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2 mb-0.5 flex-wrap">
            <span className="font-medium text-[14px]" style={{ color: THEME.text }}>
              {name}
            </span>
            <span className="text-xs opacity-50">{formatTime(msg.createdAt)}</span>
            {msg.replyTo && (
              <button
                onClick={() => onScrollToMessage(msg.replyTo.messageId)}
                className="text-xs px-2 py-0.5 rounded-md hover:opacity-80 transition-opacity cursor-pointer"
                style={{
                  background: "rgba(76, 117, 209, 0.1)",
                  color: "#4C75D1",
                }}
                title="Jump to message"
              >
                Reply to {msg.replyTo.userName}
              </button>
            )}
            {msg.tag && (
              <span
                className="text-xs px-2 py-0.5 rounded-md"
                style={{
                  background:
                    msg.tag === "Complete"
                      ? "#30a46c"
                      : msg.tag === "Progress"
                      ? "#4C75D1"
                      : "rgba(76, 117, 209, 0.1)",
                  color: msg.tag === "Complete" || msg.tag === "Progress" ? "#ffffff" : "#4C75D1",
                }}
              >
                {msg.tag}
              </span>
            )}
          </div>

          {msg.content && (
            <div
              className="message-content whitespace-pre-wrap text-[16px] leading-6 md:leading-7"
              style={{ fontFamily: THEME.fontFamily, color: THEME.text }}
            >
              {msg.content}
            </div>
          )}
          
          {msg.fileDetails && msg.fileDetails.length > 0 && (
            <div className={`flex flex-wrap gap-2 ${msg.content ? "mt-2" : ""}`}>
              {msg.fileDetails.map((file: any) => (
                <MessageFileButton key={file.id} file={file} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AvatarCircle({ name, user }: { name: string; user?: { id: string; name: string; avatarUrl?: string | null } | null }) {
  if (!user) {
    // Fallback for when user data is not available
    const initials = getInitials(name);
    return (
      <div
        title={name}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full border text-[12px] font-semibold opacity-80"
        style={{
          borderColor: THEME.avatarBorder,
          background: THEME.avatarBackground,
          color: THEME.avatarText,
        }}
      >
        {initials}
      </div>
    );
  }
  
  return (
    <TeamAvatar 
      user={{ ...user, avatar_url: user.avatarUrl, name }} 
      size="md" 
      className="opacity-80"
    />
  );
}

/* Utils */

function autoGrow(el: HTMLTextAreaElement) {
  el.style.height = "auto";
  const lineHeight = 22.5;
  const maxLines = 6;
  const newHeight = Math.min(el.scrollHeight, lineHeight * maxLines);
  el.style.height = newHeight + "px";
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function getInitials(name: string) {
  const clean = (name || "").trim().replace(/\s+/g, " ");
  if (!clean) return "YY";
  const parts = clean.split(" ");
  const f = parts[0] || "";
  const l = parts.length > 1 ? parts[parts.length - 1] : "";
  const pick = (s: string) => (s.match(/[A-Za-z\p{L}]/u)?.[0] || "").toUpperCase();
  const a = pick(f);
  const b = l ? pick(l) : f.length > 1 ? f[1].toUpperCase() : "";
  const res = (a + b).slice(0, 2) || "YY";
  return res;
}

function uid() {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  } catch {}
  return "id-" + Math.random().toString(36).slice(2);
}
