import React, { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { ChevronDown } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { 
  useProjectMessages, 
  useCreateMessage, 
  useDeleteMessage 
} from "@/lib/api/hooks/useProjectChat";
import { useProjectFiles } from "@/lib/api/hooks/useProjectFiles";
import type { Project } from "@/lib/api/types";
import TeamFilesView from "./TeamFilesView";

// Theme Configuration - Exact from uploaded file
const THEME = {
  background: "#fcfcfc",
  card: "#ffffff",
  border: "#e2e8f0",
  text: "#0f172a",
  textSecondary: "#475569",
  accent: "#4C75D1",
  hover: "#f1f5f9",
  highlight: "#f1f5f9",
  backdrop: "#ffffff",
  avatarBackground: "#000000",
  avatarBorder: "#000000",
  avatarText: "#ffffff",
  fontFamily: "'Segoe UI', 'Roboto', 'Helvetica Neue', -apple-system, BlinkMacSystemFont, Arial, sans-serif",
  borderRadius: "12px",
};

// Available tags
const availableTags = ["General", "Markup", "Progress", "Complete"];

interface TeamChatSlimProps {
  projects: Project[];
  selectedProject: Project | null;
  onProjectSelect: (project: Project | null) => void;
  onToggleSidebar: () => void;
  onToggleFiles: () => void;
  onFileSelect?: (fileId: string) => void;
  page?: 'chat' | 'files';
  onPageChange?: (page: 'chat' | 'files') => void;
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
}: TeamChatSlimProps) {
  const { user } = useUser();
  const [text, setText] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedTag, setSelectedTag] = useState("General");
  const [showChatSelector, setShowChatSelector] = useState(false);
  const [showTagSelector, setShowTagSelector] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showMobilePopover, setShowMobilePopover] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState({ x: 0, y: 0 });
  const [popoverMessageId, setPopoverMessageId] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<{ messageId: string; userName: string } | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Fetch messages and files for selected project
  const { data: rawMessages = [], isLoading: messagesLoading } = useProjectMessages(selectedProject?.id || "");
  const { data: projectFiles = [] } = useProjectFiles(selectedProject?.id || "");
  const createMessage = useCreateMessage();
  const deleteMessage = useDeleteMessage();

  // Transform messages to include file data
  const messages = useMemo(() => {
    return rawMessages.map((msg) => {
      const attachedFiles = msg.referencedFiles
        ?.map((fileId) => {
          const file = projectFiles.find((f) => f.id === fileId);
          return file ? { id: file.id, name: file.filename } : null;
        })
        .filter(Boolean) as Array<{ id: string; name: string }>;

      const replyToMsg = msg.replyToMessageId
        ? rawMessages.find((m) => m.id === msg.replyToMessageId)
        : null;

      return {
        id: msg.id,
        userId: msg.userId,
        user: msg.user,
        content: msg.content,
        createdAt: msg.createdAt,
        attachedFiles: attachedFiles.length > 0 ? attachedFiles : undefined,
        tag: undefined, // TODO: Add tag support to schema if needed
        replyTo: replyToMsg
          ? {
              messageId: replyToMsg.id,
              userName: replyToMsg.user?.name || "User",
            }
          : undefined,
      };
    });
  }, [rawMessages, projectFiles]);

  const handleSend = useCallback(() => {
    const body = text.trim();
    if (!body && attachedFiles.length === 0) return;
    if (!selectedProject || !user) return;

    createMessage.mutate({
      projectId: selectedProject.id,
      content: body,
      replyToMessageId: replyingTo?.messageId,
    });

    setText("");
    setAttachedFiles([]);
    setReplyingTo(null);
    
    // Reset textarea height
    requestAnimationFrame(() => {
      const textarea = document.querySelector("textarea");
      if (textarea) {
        textarea.style.height = "auto";
      }
      setTimeout(() => {
        listRef.current?.scrollTo({ top: 999999, behavior: "smooth" });
      }, 50);
    });
  }, [text, attachedFiles, selectedProject, user, replyingTo, createMessage]);

  const handleAddFile = () => {
    // For now, just add a demo file - replace with actual file picker
    const demoFile = { id: uid(), name: "demo-file.pdf" };
    setAttachedFiles((files) => [...files, demoFile]);
  };

  const handleRemoveFile = (fileId: string) => {
    setAttachedFiles((files) => files.filter((f) => f.id !== fileId));
  };

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
    if (messageElement && listRef.current) {
      messageElement.scrollIntoView({ behavior: "smooth", block: "center" });
      messageElement.style.transition = "background 0.3s";
      messageElement.style.background = THEME.highlight;
      setTimeout(() => {
        messageElement.style.background = "";
      }, 1000);
    }
  };

  const handleDeleteMessage = (messageId: string) => {
    if (!selectedProject) return;
    deleteMessage.mutate({ id: messageId, projectId: selectedProject.id });
    setShowMobilePopover(false);
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

    const files = Array.from(e.dataTransfer.files);
    const newFiles = files.map((file) => ({
      id: uid(),
      name: file.name,
    }));

    setAttachedFiles((prev) => [...prev, ...newFiles]);
  };

  const headerTitle = useMemo(
    () => ({ name: selectedProject?.name || "Workspace" }),
    [selectedProject]
  );

  // Handle mobile popover events
  useEffect(() => {
    const handleShowPopover = (e: any) => {
      const { messageId, isMe, x, y } = e.detail;
      setPopoverMessageId(messageId);
      setPopoverPosition({ x, y });
      setShowMobilePopover(true);
    };

    window.addEventListener("showMobilePopover", handleShowPopover);
    return () => window.removeEventListener("showMobilePopover", handleShowPopover);
  }, []);

  // Recent projects for empty state
  const recentProjects = projects.slice(0, 4);

  const autoGrow = (element: HTMLTextAreaElement) => {
    element.style.height = "auto";
    element.style.height = Math.min(element.scrollHeight, 200) + "px";
  };

  return (
    <div
      className="team-app flex h-full flex-col relative"
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={(e) => {
        const chatSelector = document.querySelector(".chat-selector-dropdown");
        const tagSelector = document.querySelector(".tag-selector-dropdown");
        const chatButton = (e.target as HTMLElement).closest("button");

        if (
          showChatSelector &&
          chatSelector &&
          !chatSelector.contains(e.target as Node) &&
          (!chatButton || !chatButton.textContent?.includes(headerTitle.name))
        ) {
          setShowChatSelector(false);
        }

        if (
          showTagSelector &&
          tagSelector &&
          !tagSelector.contains(e.target as Node) &&
          (!chatButton || !availableTags.some((tag) => chatButton.textContent?.includes(tag)))
        ) {
          setShowTagSelector(false);
        }
      }}
      style={{
        background: THEME.background,
        color: THEME.text,
      }}
    >
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

      {/* Header - only show when project is selected */}
      {selectedProject && (
        <header
          className="sticky top-0 z-20 w-full"
          style={{ background: THEME.backdrop }}
        >
          <div className="flex h-16 w-full items-center justify-between px-4">
            {/* Left: Collapse panel icon */}
            <div className="flex items-center">
              <button
                onClick={onToggleSidebar}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-md border transition-colors"
                style={{ borderColor: THEME.border, background: THEME.card }}
                onMouseEnter={(e) => (e.currentTarget.style.background = THEME.hover)}
                onMouseLeave={(e) => (e.currentTarget.style.background = THEME.card)}
                title="Toggle sidebar"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>
            </div>

            {/* Center: Project selector or Files title */}
            <div className="absolute left-1/2 -translate-x-1/2 flex items-center">
              {page === 'chat' ? (
                <>
                  <button
                    onClick={() => setShowChatSelector(!showChatSelector)}
                    className="flex items-center gap-2 transition-all text-[16px] px-3 py-1.5 rounded-lg"
                    onMouseEnter={(e) => (e.currentTarget.style.background = THEME.hover)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <span className="font-medium">{headerTitle.name}</span>
                    <ChevronDown className="h-4 w-4 opacity-60" />
                  </button>

                  {showChatSelector && (
                    <div
                      className="chat-selector-dropdown absolute top-full left-1/2 -translate-x-1/2 mt-2 w-80 rounded-2xl border shadow-lg z-30 max-h-96 overflow-y-auto"
                      style={{
                        borderColor: THEME.border,
                        background: THEME.card,
                      }}
                    >
                      <div className="p-3">
                        <div className="text-xs font-semibold opacity-60 mb-2 px-2">
                          RECENT PROJECTS
                        </div>
                        {projects.map((project) => (
                          <button
                            key={project.id}
                            onClick={() => {
                              onProjectSelect(project);
                              setShowChatSelector(false);
                            }}
                            className="w-full text-left px-3 py-2 rounded-lg transition-colors"
                            style={{
                              background:
                                project.id === selectedProject?.id
                                  ? "rgba(76, 117, 209, 0.1)"
                                  : "transparent",
                            }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.background =
                                project.id === selectedProject?.id
                                  ? "rgba(76, 117, 209, 0.15)"
                                  : THEME.hover)
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.background =
                                project.id === selectedProject?.id
                                  ? "rgba(76, 117, 209, 0.1)"
                                  : "transparent")
                            }
                          >
                            <div
                              className="font-medium text-sm"
                              style={{
                                color:
                                  project.id === selectedProject?.id ? "#4C75D1" : THEME.text,
                              }}
                            >
                              {project.name}
                            </div>
                            <div className="text-xs opacity-60 truncate">
                              {project.description || "No description"}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <span className="font-medium text-[16px]">Files</span>
              )}
            </div>

            {/* Right: Files icon */}
            <div className="flex items-center gap-2">
              <button
                className="grid h-8 w-8 shrink-0 place-items-center rounded-md border transition-colors"
                style={{ 
                  borderColor: page === 'files' ? THEME.accent : THEME.border, 
                  background: page === 'files' ? 'rgba(76, 117, 209, 0.1)' : THEME.card 
                }}
                onMouseEnter={(e) => {
                  if (page !== 'files') {
                    e.currentTarget.style.background = THEME.hover;
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = page === 'files' ? 'rgba(76, 117, 209, 0.1)' : THEME.card;
                }}
                onClick={onToggleFiles}
                title="Files"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </button>
            </div>
          </div>
        </header>
      )}

      {/* Main Content - Chat or Files */}
      {page === 'files' && selectedProject ? (
        <TeamFilesView
          projectId={selectedProject.id}
          onFileSelect={(fileId) => {
            if (onFileSelect) onFileSelect(fileId);
            if (onPageChange) onPageChange('chat');
          }}
        />
      ) : (
        <>
          <div
            ref={listRef}
            className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-2 md:gap-3 px-4 pt-8 pb-0 overflow-y-auto"
          >
            {!selectedProject ? (
              // Empty state
              <div className="flex flex-col items-center justify-center h-full py-16">
                <div className="text-center max-w-md">
                  <h2 className="text-2xl font-semibold mb-3" style={{ color: THEME.text }}>
                    Welcome to your workspace
                  </h2>
                  <p className="text-base mb-6" style={{ color: THEME.textSecondary }}>
                    Select a project to start chatting, or begin typing to message the workspace.
                  </p>

                  {/* Project selector buttons */}
                  <div className="flex flex-col gap-2 mt-8">
                    <div className="text-xs font-semibold opacity-60 mb-2 text-left">
                      RECENT PROJECTS
                    </div>
                    {recentProjects.map((project) => (
                      <button
                        key={project.id}
                        onClick={() => onProjectSelect(project)}
                        className="w-full text-left px-4 py-3 rounded-xl border transition-colors"
                        style={{
                          borderColor: THEME.border,
                          background: THEME.card,
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = THEME.hover)}
                        onMouseLeave={(e) => (e.currentTarget.style.background = THEME.card)}
                      >
                        <div className="font-medium text-base">{project.name}</div>
                        <div className="text-sm opacity-60 truncate mt-0.5">
                          {project.description || "No description"}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : messagesLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-base" style={{ color: THEME.textSecondary }}>
                  Loading messages...
                </div>
              </div>
            ) : (
              // Messages
              messages.map((msg) => (
                <MessageBlock
                  key={msg.id}
                  msg={msg}
                  currentUserId={user?.id || ""}
                  onReply={handleReply}
                  onScrollToMessage={handleScrollToMessage}
                  onFileClick={onFileSelect}
                />
              ))
            )}
          </div>

          {/* Composer - only show in chat mode */}
          {selectedProject && page === 'chat' && (
            <div
              className="sticky bottom-0 z-10 w-full"
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
                  {attachedFiles.length > 0 && (
                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                      {attachedFiles.map((file) => (
                        <FileChip key={file.id} file={file} onRemove={handleRemoveFile} />
                      ))}
                    </div>
                  )}
                  <textarea
                    value={text}
                    rows={1}
                    placeholder="Reply..."
                    onChange={(e) => setText(e.target.value)}
                    onInput={(e) => autoGrow(e.currentTarget)}
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
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-md border transition-colors"
                        style={{ borderColor: THEME.border }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = THEME.hover)}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 4v16m8-8H4"
                          />
                        </svg>
                      </button>
                      <div className="relative">
                        <button
                          onClick={() => !selectedProject && setShowChatSelector(true)}
                          className="flex h-8 items-center gap-1.5 rounded-md border px-2.5 transition-colors text-sm whitespace-nowrap"
                          style={{
                            borderColor: THEME.border,
                            cursor: !selectedProject ? "pointer" : "default",
                          }}
                          onMouseEnter={(e) =>
                            !selectedProject && (e.currentTarget.style.background = THEME.hover)
                          }
                          onMouseLeave={(e) =>
                            !selectedProject && (e.currentTarget.style.background = "transparent")
                          }
                        >
                          <span>{selectedProject?.name || "Select project..."}</span>
                          {!selectedProject && <ChevronDown className="h-3.5 w-3.5 opacity-60" />}
                        </button>

                        {/* Dropdown for empty state */}
                        {!selectedProject && showChatSelector && (
                          <div
                            className="absolute bottom-full left-0 mb-2 w-80 rounded-2xl border shadow-lg z-30 max-h-96 overflow-y-auto"
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
                                  <div className="text-xs opacity-60 truncate">
                                    {project.description || "No description"}
                                  </div>
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

                        {/* Tag selector dropdown */}
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
          )}
        </>
      )}
    </div>
  );
}

/* ——— Message Components ———————————————————————————————————————— */

function FileChip({
  file,
  onRemove,
}: {
  file: { id: string; name: string };
  onRemove: (id: string) => void;
}) {
  const truncateFilename = (filename: string, maxLength = 25) => {
    if (filename.length <= maxLength) return filename;
    const ext = filename.split(".").pop() || "";
    const nameWithoutExt = filename.slice(0, filename.length - ext.length - 1);
    const truncated = nameWithoutExt.slice(0, maxLength - ext.length - 4);
    return `${truncated}...${ext}`;
  };

  return (
    <div
      className="inline-flex h-7 items-center rounded-md border px-2 text-[11px] font-medium shadow-sm"
      style={{
        borderColor: THEME.border,
        background: THEME.card,
        color: THEME.text,
      }}
      title={file.name}
    >
      <span className="truncate max-w-[120px]">{truncateFilename(file.name)}</span>
      <button
        onClick={() => onRemove(file.id)}
        className="ml-2 text-xs opacity-60 hover:opacity-100"
      >
        ✕
      </button>
    </div>
  );
}

interface MessageBlockProps {
  msg: {
    id: string;
    userId: string;
    user?: { id: string; name?: string };
    content: string;
    createdAt: string;
    attachedFiles?: Array<{ id: string; name: string }>;
    replyTo?: { messageId: string; userName: string };
  };
  currentUserId: string;
  onReply: (messageId: string, userName: string) => void;
  onScrollToMessage: (messageId: string) => void;
  onFileClick?: (fileId: string) => void;
}

function MessageBlock({
  msg,
  currentUserId,
  onReply,
  onScrollToMessage,
  onFileClick,
}: MessageBlockProps) {
  const isMe = msg.userId === currentUserId;
  const [showActions, setShowActions] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleLongPressStart = (e: React.TouchEvent) => {
    longPressTimer.current = setTimeout(() => {
      const touch = e.touches[0];
      window.dispatchEvent(
        new CustomEvent("showMobilePopover", {
          detail: {
            messageId: msg.id,
            isMe,
            x: touch.clientX,
            y: touch.clientY,
          },
        })
      );
    }, 500);
  };

  const handleLongPressEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  return (
    <div
      id={`message-${msg.id}`}
      className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      onTouchStart={handleLongPressStart}
      onTouchEnd={handleLongPressEnd}
      onTouchCancel={handleLongPressEnd}
    >
      <div
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-medium"
        style={{
          background: THEME.avatarBackground,
          color: THEME.avatarText,
          border: `1px solid ${THEME.avatarBorder}`,
        }}
      >
        {initials(msg.user?.name || "User")}
      </div>

      <div className={`flex min-w-0 max-w-[72ch] flex-col ${isMe ? "items-end" : "items-start"}`}>
        <div
          className="message-content w-full rounded-2xl px-3 py-2 shadow-sm transition-colors"
          style={{
            background: isMe ? THEME.card : "#f8f9fa",
            color: THEME.text,
          }}
        >
          <div className={`mb-1 flex items-center gap-2 ${isMe ? "justify-end" : ""}`}>
            <div
              className={`text-xs font-medium ${isMe ? "order-2 text-right" : ""}`}
              style={{ color: THEME.text }}
            >
              {msg.user?.name || "User"}
            </div>
            <div className={`text-[11px] ${isMe ? "order-1" : ""}`} style={{ color: THEME.textSecondary }}>
              {timeAgo(msg.createdAt)}
            </div>
          </div>

          {msg.replyTo && (
            <div
              className="mb-2 cursor-pointer rounded-lg px-2 py-1.5 text-xs"
              style={{ background: "rgba(76, 117, 209, 0.08)", color: THEME.textSecondary }}
              onClick={() => onScrollToMessage(msg.replyTo!.messageId)}
            >
              <span style={{ color: "#4C75D1", fontWeight: 500 }}>
                {msg.replyTo.userName}
              </span>
            </div>
          )}

          <div className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</div>

          {msg.attachedFiles && msg.attachedFiles.length > 0 && (
            <div className="mt-2 grid grid-cols-3 gap-2">
              {msg.attachedFiles.map((file) => (
                <div
                  key={file.id}
                  onClick={() => onFileClick && onFileClick(file.id)}
                  className="cursor-pointer rounded-lg border p-2 hover:shadow-sm transition-shadow"
                  style={{ borderColor: THEME.border }}
                >
                  <div className="text-xs truncate">{file.name}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Desktop actions - hover only */}
        {showActions && (
          <div className="hidden md:flex mt-1 gap-1 items-center">
            <button
              onClick={() => onReply(msg.id, msg.user?.name || "User")}
              className="px-2 py-1 text-xs rounded-md transition-colors hover:bg-gray-100"
              title="Reply"
            >
              Reply
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

interface MobileActionPopoverProps {
  isMe: boolean;
  messageInfo?: {
    id: string;
    user?: { name?: string };
  };
  position: { x: number; y: number };
  onClose: () => void;
  onReply: (messageId: string, userName: string) => void;
  onDelete: (messageId: string) => void;
}

function MobileActionPopover({
  isMe,
  messageInfo,
  position,
  onClose,
  onReply,
  onDelete,
}: MobileActionPopoverProps) {
  if (!messageInfo) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 md:hidden"
        onClick={onClose}
        style={{ background: "rgba(0, 0, 0, 0.2)" }}
      />
      <div
        className="fixed z-50 rounded-xl border shadow-xl p-2 md:hidden animate-fadeIn"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          borderColor: THEME.border,
          background: THEME.card,
          transform: "translate(-50%, -100%) translateY(-8px)",
        }}
      >
        <div className="flex gap-2">
          <button
            onClick={() => {
              onReply(messageInfo.id, messageInfo.user?.name || "User");
              onClose();
            }}
            className="p-2 rounded-md hover:bg-gray-100"
            title="Reply"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
              />
            </svg>
          </button>
          {isMe && (
            <button
              onClick={() => {
                onDelete(messageInfo.id);
                onClose();
              }}
              className="p-2 rounded-md hover:bg-red-50"
              title="Delete"
            >
              <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          )}
        </div>
      </div>
    </>
  );
}

/* ——— Helper Functions ——————————————————————————————————————————— */

function initials(name: string): string {
  return (name?.match(/\b\w/g) || [])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";
}

function timeAgo(iso: string): string {
  const d = Date.now() - new Date(iso).getTime();
  const m = Math.round(d / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h}h ago` : `${Math.round(h / 24)}d ago`;
}

function uid(): string {
  return "id-" + Math.random().toString(36).slice(2);
}
