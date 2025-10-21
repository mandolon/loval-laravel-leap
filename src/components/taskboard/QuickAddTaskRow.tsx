import { useState, useEffect, useRef } from "react";
import { Plus, X, UserPlus } from "lucide-react";
import { UserAvatar } from "@/components/UserAvatar";
import { useProjectMembers } from "@/lib/api/hooks/useProjectMembers";
import type { CreateTaskInput, Project, Task } from "@/lib/api/types";

interface QuickAddTaskRowProps {
  status: Task["status"];
  projects: Project[];
  onSave: (input: CreateTaskInput) => void;
  onCancel: () => void;
}

export function QuickAddTaskRow({ status, projects, onSave, onCancel }: QuickAddTaskRowProps) {
  const [taskName, setTaskName] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [assignees, setAssignees] = useState<string[]>([]);
  const [showAssigneePopover, setShowAssigneePopover] = useState(false);
  const [showProjectPopover, setShowProjectPopover] = useState(false);
  const rowRef = useRef<HTMLTableRowElement>(null);

  // Get project members for selected project
  const { data: projectMembers = [] } = useProjectMembers(selectedProjectId);

  const canSave = taskName.trim() && selectedProjectId && assignees.length > 0;

  const handleSave = () => {
    if (canSave) {
      onSave({
        title: taskName,
        projectId: selectedProjectId,
        status,
        assignees,
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (canSave) handleSave();
    } else if (e.key === "Escape") {
      onCancel();
    }
  };

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (rowRef.current && !rowRef.current.contains(event.target as Node)) {
        onCancel();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onCancel]);

  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const projectAddress = selectedProject?.address as { streetNumber?: string; streetName?: string } | undefined;
  const projectDisplay = projectAddress?.streetNumber && projectAddress?.streetName
    ? `${projectAddress.streetNumber} ${projectAddress.streetName}`
    : selectedProject?.name || "Select project...";

  return (
    <tr ref={rowRef} className="border-t border-b border-gray-200 hover:bg-gray-50 transition-colors">
      {/* Status dot placeholder */}
      <td className="px-3 py-2 text-center">
        <div className="w-4 h-4 rounded-full border-2 border-gray-400 bg-transparent" />
      </td>

      {/* Name input with project selector and assignees */}
      <td colSpan={5} className="px-3 py-2">
        {/* Project name display - clickable to show project selector */}
        <div 
          className="text-xs text-gray-600 font-semibold mb-0.5 cursor-pointer hover:text-gray-900 relative"
          onClick={() => setShowProjectPopover(!showProjectPopover)}
        >
          {projectDisplay}
        </div>

        {/* Project selector popover */}
        {showProjectPopover && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowProjectPopover(false)} />
            <div className="absolute left-0 mt-1 bg-white border border-gray-200 rounded shadow-lg z-50 p-2 min-w-[240px] max-h-64 overflow-y-auto">
              {projects.map((project) => {
                const addr = project.address as { streetNumber?: string; streetName?: string } | undefined;
                const display = addr?.streetNumber && addr?.streetName
                  ? `${addr.streetNumber} ${addr.streetName}`
                  : project.name;
                return (
                  <button
                    key={project.id}
                    onClick={() => {
                      setSelectedProjectId(project.id);
                      setShowProjectPopover(false);
                      setAssignees([]); // Reset assignees when project changes
                    }}
                    className="w-full text-left px-2 py-1.5 hover:bg-gray-100 rounded text-xs transition-colors"
                  >
                    {display}
                  </button>
                );
              })}
            </div>
          </>
        )}

        <div className="flex items-center gap-2">
          {/* Task title input */}
          <input
            type="text"
            placeholder="Enter task title..."
            value={taskName}
            onChange={(e) => setTaskName(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 text-sm font-medium bg-transparent border-0 outline-none focus:ring-0 p-0"
            autoFocus
          />
          
          {/* Assignee avatars */}
          <div className="flex items-center flex-shrink-0 mr-2 gap-1 relative">
            {assignees.length === 0 ? (
              <button
                className="text-gray-400 hover:text-gray-600 flex-shrink-0"
                onClick={() => setShowAssigneePopover(true)}
              >
                <UserPlus size={16} />
              </button>
            ) : (
              <>
                {assignees.slice(0, 2).map((userId, idx) => {
                  const member = projectMembers.find(m => m.userId === userId);
                  if (!member) return null;
                  
                  return (
                    <div key={idx} className="relative group">
                      <UserAvatar 
                        user={{
                          name: member.userName,
                          avatar_url: member.userAvatarUrl,
                        }} 
                        size="xs" 
                      />
                      <button
                        onClick={() => setAssignees(assignees.filter((_, i) => i !== idx))}
                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
                {assignees.length > 2 && (
                  <div 
                    className="w-6 h-6 rounded-full bg-gray-400 border-2 border-white flex items-center justify-center text-white font-semibold cursor-pointer ml-0.5 text-[9px]"
                    onClick={() => setShowAssigneePopover(true)}
                  >
                    +{assignees.length - 2}
                  </div>
                )}
                <button
                  className="text-gray-400 hover:text-gray-600 flex-shrink-0 ml-1"
                  onClick={() => setShowAssigneePopover(true)}
                >
                  <UserPlus size={16} />
                </button>
              </>
            )}
          </div>

          {/* Assignee popover */}
          {showAssigneePopover && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowAssigneePopover(false)} />
              <div className="absolute right-0 mt-1 bg-white border border-gray-200 rounded shadow-lg z-50 p-2 min-w-fit max-h-64 overflow-y-auto">
                {projectMembers.length > 0 ? (
                  projectMembers.map((member) => {
                    const isAssigned = assignees.includes(member.userId);
                    return (
                      <button
                        key={member.userId}
                        onClick={() => {
                          setAssignees(
                            isAssigned 
                              ? assignees.filter(id => id !== member.userId)
                              : [...assignees, member.userId]
                          );
                        }}
                        className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-gray-100 rounded text-xs transition-colors"
                      >
                        <UserAvatar 
                          user={{
                            name: member.userName,
                            avatar_url: member.userAvatarUrl,
                          }} 
                          size="xs" 
                        />
                        <span className="flex-1 text-left text-gray-700">{member.userName}</span>
                        {isAssigned && <span className="text-green-600">✓</span>}
                      </button>
                    );
                  })
                ) : (
                  <div className="px-2 py-1.5 text-xs text-gray-500">
                    {selectedProjectId ? "No team members in this project" : "Select a project first"}
                  </div>
                )}
              </div>
            </>
          )}
          
          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={!canSave}
            className={`text-xs px-2 py-1 rounded border text-[9px] flex-shrink-0 ${
              canSave
                ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
                : "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
            }`}
          >
            Save
          </button>

          {/* Cancel button */}
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 flex-shrink-0"
          >
            <X size={14} />
          </button>
        </div>
      </td>

      {/* Empty spacer */}
      <td className="w-32 pr-8"></td>
    </tr>
  );
}
