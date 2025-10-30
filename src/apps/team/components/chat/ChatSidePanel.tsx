import { ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const THEME = {
  background: "#fcfcfc",
  card: "#ffffff",
  border: "#e2e8f0",
  text: "#0f172a",
  textSecondary: "#475569",
  hover: "#f1f5f9",
};

interface Project {
  id: string;
  name: string;
  description?: string;
  updated_at?: string;
  created_at?: string;
}

interface ChatSidePanelProps {
  projects: Project[];
  selectedProject: Project | null;
  onProjectSelect: (project: Project) => void;
  workspaceId?: string;
}

export function ChatSidePanel({
  projects,
  selectedProject,
  onProjectSelect,
  workspaceId,
}: ChatSidePanelProps) {
  // Sort projects by most recent activity
  const sortedProjects = [...projects].sort((a, b) => {
    const aTime = new Date(a.updated_at || a.created_at || 0).getTime();
    const bTime = new Date(b.updated_at || b.created_at || 0).getTime();
    return bTime - aTime;
  });

  const recentProjects = sortedProjects.slice(0, 3);
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
      className="w-64 h-full flex flex-col border-r"
      style={{
        background: THEME.background,
        borderColor: THEME.border,
      }}
    >
      {/* Header */}
      <div className="p-4 border-b" style={{ borderColor: THEME.border }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <div>
              <div className="text-sm font-medium" style={{ color: THEME.text }}>
                Workspace chat
              </div>
              <div className="text-xs" style={{ color: THEME.textSecondary }}>
                {recentProjects.length > 0 && formatAccessTime(recentProjects[0].updated_at)}
              </div>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 opacity-40" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Recent Projects */}
        {recentProjects.length > 0 && (
          <div className="p-4">
            <div
              className="text-xs font-semibold mb-3 px-2"
              style={{ color: THEME.textSecondary }}
            >
              RECENT PROJECTS
            </div>
            <div className="space-y-1">
              {recentProjects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => onProjectSelect(project)}
                  className="w-full text-left px-3 py-2 rounded-lg transition-colors"
                  style={{
                    background:
                      project.id === selectedProject?.id
                        ? THEME.hover
                        : "transparent",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = THEME.hover)
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background =
                      project.id === selectedProject?.id
                        ? THEME.hover
                        : "transparent")
                  }
                >
                  <div className="text-sm font-medium" style={{ color: THEME.text }}>
                    {project.name}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: THEME.textSecondary }}>
                    Accessed {formatAccessTime(project.updated_at)}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* All Projects */}
        <div className="p-4 pt-2">
          <div
            className="text-xs font-semibold mb-3 px-2"
            style={{ color: THEME.textSecondary }}
          >
            ALL PROJECTS
          </div>
          <div className="space-y-1">
            {allProjects.map((project) => (
              <button
                key={project.id}
                onClick={() => onProjectSelect(project)}
                className="w-full text-left px-3 py-2 rounded-lg transition-colors"
                style={{
                  background:
                    project.id === selectedProject?.id
                      ? THEME.hover
                      : "transparent",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = THEME.hover)
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background =
                    project.id === selectedProject?.id
                      ? THEME.hover
                      : "transparent")
                }
              >
                <div className="text-sm font-medium" style={{ color: THEME.text }}>
                  {project.name}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
