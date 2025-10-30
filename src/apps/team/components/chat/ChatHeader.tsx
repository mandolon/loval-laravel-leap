import { ChevronDown, Grid3x3, List } from "lucide-react";

// Theme Configuration
const THEME = {
  background: "#fcfcfc",
  card: "#ffffff",
  border: "#e2e8f0",
  text: "#0f172a",
  textSecondary: "#475569",
  accent: "#4C75D1",
  hover: "#f1f5f9",
  backdrop: "rgba(252, 252, 252, 0.8)",
};

interface ChatHeaderProps {
  selectedProject: { id: string; name: string; description?: string } | null;
  projects: Array<{ id: string; name: string; description?: string }>;
  showChatSelector: boolean;
  onToggleSidebar: () => void;
  onToggleFiles: () => void;
  onProjectSelect: (project: { id: string; name: string; description?: string }) => void;
  onToggleChatSelector: () => void;
  onCloseChatSelector: () => void;
  // Files view controls
  showFilesControls?: boolean;
  viewMode?: 'grid' | 'list';
  onViewModeChange?: (mode: 'grid' | 'list') => void;
  selectMode?: boolean;
  onSelectModeChange?: (mode: boolean) => void;
  selectedFilesCount?: number;
  onShareToChat?: () => void;
}

export function ChatHeader({
  selectedProject,
  projects,
  showChatSelector,
  onToggleSidebar,
  onToggleFiles,
  onProjectSelect,
  onToggleChatSelector,
  onCloseChatSelector,
  showFilesControls = false,
  viewMode = 'grid',
  onViewModeChange,
  selectMode = false,
  onSelectModeChange,
  selectedFilesCount = 0,
  onShareToChat,
}: ChatHeaderProps) {
  const headerTitle = selectedProject?.name || "Workspace";

  return (
    <header
      className="sticky top-0 z-20 w-full backdrop-blur-md"
      style={{ background: THEME.backdrop }}
    >
      <div className="flex h-16 w-full items-center justify-between px-4">
        {/* Left: Sidebar toggle */}
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

        {/* Center: Project selector (or left-aligned on files page) */}
        <div className={showFilesControls ? "flex items-center" : "absolute left-1/2 -translate-x-1/2 flex items-center"}>
          <button
            onClick={onToggleChatSelector}
            className="flex items-center gap-2 transition-all px-3 py-1.5 rounded-lg"
            onMouseEnter={(e) => (e.currentTarget.style.background = THEME.hover)}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <span className="chat-header-project-name text-[16px] font-semibold">{headerTitle}</span>
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
                      onCloseChatSelector();
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
                        color: project.id === selectedProject?.id ? "#4C75D1" : THEME.text,
                      }}
                    >
                      {project.name}
                    </div>
                    <div className="text-xs opacity-60 truncate">
                      {project.description || ""}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Files controls or Files button */}
        <div className="flex items-center gap-2">
          {showFilesControls ? (
            <>
              {/* View Mode Toggle */}
              <div className="flex items-center gap-1 border rounded-md" style={{ borderColor: THEME.border }}>
                <button
                  onClick={() => onViewModeChange?.('grid')}
                  className="p-2 rounded-l-md transition-colors"
                  style={{
                    background: viewMode === 'grid' ? THEME.hover : 'transparent',
                    color: viewMode === 'grid' ? THEME.accent : THEME.textSecondary,
                  }}
                  title="Grid view"
                >
                  <Grid3x3 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onViewModeChange?.('list')}
                  className="p-2 rounded-r-md transition-colors"
                  style={{
                    background: viewMode === 'list' ? THEME.hover : 'transparent',
                    color: viewMode === 'list' ? THEME.accent : THEME.textSecondary,
                  }}
                  title="List view"
                >
                  <List className="h-4 w-4" />
                </button>
              </div>

              {/* Select Button */}
              <button
                onClick={() => onSelectModeChange?.(!selectMode)}
                className="px-3 py-1.5 rounded-md text-sm font-medium transition-colors border"
                style={{
                  borderColor: selectMode ? 'rgba(76, 117, 209, 0.3)' : THEME.border,
                  background: selectMode ? 'rgba(76, 117, 209, 0.1)' : THEME.card,
                  color: selectMode ? THEME.accent : THEME.text,
                }}
              >
                {selectMode ? 'Cancel' : 'Select'}
              </button>

              {/* Share to Chat Button */}
              {selectMode && selectedFilesCount > 0 && (
                <button
                  onClick={onShareToChat}
                  className="px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
                  style={{
                    background: THEME.accent,
                    color: '#ffffff',
                  }}
                >
                  Share ({selectedFilesCount})
                </button>
              )}

              {/* Files Button - Switch back to chat */}
              <button
                className="grid h-8 w-8 shrink-0 place-items-center rounded-md border transition-colors"
                style={{ borderColor: THEME.border, background: THEME.card }}
                onMouseEnter={(e) => (e.currentTarget.style.background = THEME.hover)}
                onMouseLeave={(e) => (e.currentTarget.style.background = THEME.card)}
                onClick={onToggleFiles}
                title="Back to chat"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </button>
            </>
          ) : (
            <button
              className="grid h-8 w-8 shrink-0 place-items-center rounded-md border transition-colors"
              style={{ borderColor: THEME.border, background: THEME.card }}
              onMouseEnter={(e) => (e.currentTarget.style.background = THEME.hover)}
              onMouseLeave={(e) => (e.currentTarget.style.background = THEME.card)}
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
          )}
        </div>
      </div>
    </header>
  );
}
