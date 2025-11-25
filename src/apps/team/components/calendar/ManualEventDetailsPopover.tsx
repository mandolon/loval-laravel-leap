import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { useUpdateCalendarEvent, useDeleteCalendarEvent } from "@/lib/api/hooks/useCalendarEvents";
import { useProjects } from "@/lib/api/hooks/useProjects";

// ===== Types =====
export interface ManualEventDetails {
  id?: string | number;
  title: string;
  date: string; // YYYY-MM-DD
  time?: string; // e.g. "3:00 PM" or "15:00"
  projectId?: string | null;
  project?: string | null; // For backwards compatibility
  anyTime?: boolean;
  eventType?: string;
  description?: string;
  workspaceId?: string;
}

interface ManualEventDetailsPopoverProps {
  event: ManualEventDetails;
  workspaceId: string;
  onSave?: (updated: ManualEventDetails) => void;
  onDelete?: (id: string | number) => void;
  anchorLabel?: string;
  children: React.ReactNode;
}

// ===== Constants =====
const DEFAULT_EVENT_TYPES = [
  "Reminder",
  "Meeting",
  "Deadline",
  "Site Visit",
  "Call",
  "Milestone",
  "Review",
] as const;

// ===== Utility Functions =====
const timeUtils = {
  toInput(displayTime?: string): string {
    if (!displayTime) return "09:00";
    const trimmed = displayTime.trim();

    // Already 24h format
    if (/^\d{2}:\d{2}$/.test(trimmed)) return trimmed;

    // Parse 12h format
    const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(trimmed);
    if (!match) return "09:00";

    let hours = parseInt(match[1], 10);
    const minutes = match[2];
    const period = match[3].toUpperCase();

    if (period === "PM" && hours < 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;

    return `${String(hours).padStart(2, "0")}:${minutes}`;
  },

  toDisplay(inputTime: string): string {
    if (!inputTime) return "";
    const [hoursStr, minutes] = inputTime.split(":");
    const hours = parseInt(hoursStr, 10);
    if (Number.isNaN(hours)) return "";

    const ampm = hours >= 12 ? "PM" : "AM";
    const h12 = hours % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  },
};

// ===== Custom Hooks =====
function useClickOutside(
  ref: React.RefObject<HTMLElement>,
  handler: () => void,
  enabled: boolean = true
) {
  useEffect(() => {
    if (!enabled) return;

    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        handler();
      }
    };

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [ref, handler, enabled]);
}

function useEventFormState(event: ManualEventDetails) {
  const [state, setState] = useState({
    title: event.title || "",
    date: event.date || "",
    time: timeUtils.toInput(event.time),
    projectId: event.projectId ?? null,
    eventType: event.eventType || "Meeting",
    anyTime: event.anyTime ?? !event.time,
    description: event.description || "",
  });

  // Sync with external event changes
  useEffect(() => {
    setState({
      title: event.title || "",
      date: event.date || "",
      time: timeUtils.toInput(event.time),
      projectId: event.projectId ?? null,
      eventType: event.eventType || "Meeting",
      anyTime: event.anyTime ?? !event.time,
      description: event.description || "",
    });
  }, [event]);

  return [state, setState] as const;
}

// ===== Sub-Components =====
interface DropdownProps {
  isOpen: boolean;
  onClose: () => void;
  trigger: React.ReactNode;
  children: React.ReactNode;
}

const Dropdown: React.FC<DropdownProps> = ({
  isOpen,
  onClose,
  trigger,
  children,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, onClose, isOpen);

  return (
    <div ref={ref} className="relative">
      {trigger}
      {isOpen && (
        <div className="absolute z-10 mt-0.5 w-full rounded border border-neutral-200 bg-white shadow-lg overflow-hidden">
          <div className="max-h-32 overflow-y-auto scrollbar-thin">{children}</div>
        </div>
      )}
    </div>
  );
};

interface IconProps {
  name: "list" | "chevron" | "clock" | "tag";
  className?: string;
  rotate?: boolean;
}

const Icon: React.FC<IconProps> = ({ name, className = "", rotate = false }) => {
  const icons = {
    list: (
      <>
        <path d="M8 6h12" />
        <path d="M4 12h16" />
        <path d="M10 18h10" />
      </>
    ),
    chevron: <path d="m6 9 6 6 6-6" />,
    clock: (
      <>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </>
    ),
    tag: (
      <>
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
        <line x1="7" y1="7" x2="7.01" y2="7" />
      </>
    ),
  };

  return (
    <svg
      viewBox="0 0 24 24"
      width="11"
      height="11"
      fill="none"
      stroke="currentColor"
      strokeWidth={name === "chevron" ? "2.5" : "1.8"}
      className={`${className} ${rotate ? "rotate-180" : ""} transition-transform`}
    >
      {icons[name]}
    </svg>
  );
};

// ===== Main Component =====
export const ManualEventDetailsPopover: React.FC<ManualEventDetailsPopoverProps> = ({
  event,
  workspaceId,
  onSave,
  onDelete,
  children,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [formState, setFormState] = useEventFormState(event);
  const [eventTypeOpen, setEventTypeOpen] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // API hooks
  const updateCalendarEvent = useUpdateCalendarEvent();
  const deleteCalendarEvent = useDeleteCalendarEvent();
  const { data: projects = [], isLoading: projectsLoading } = useProjects(workspaceId);

  const eventTypes = DEFAULT_EVENT_TYPES;

  // Close main popover on outside click
  const closePopover = useCallback(() => {
    setIsOpen(false);
    setEventTypeOpen(false);
    setProjectOpen(false);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      // Don't close if clicking inside the popover or the trigger
      if (
        (popoverRef.current && popoverRef.current.contains(target)) ||
        (triggerRef.current && triggerRef.current.contains(target))
      ) {
        return;
      }
      closePopover();
    };

    // Use setTimeout to delay adding the listener to avoid immediate closure
    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleClick, true);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('click', handleClick, true);
    };
  }, [isOpen, closePopover]);

  const handleSave = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!formState.title.trim() || !formState.date.trim() || !event.id) return;

      try {
        await updateCalendarEvent.mutateAsync({
          id: event.id as string,
          data: {
            title: formState.title.trim(),
            eventType: formState.eventType as any,
            projectId: formState.projectId || undefined,
            eventDate: formState.date.trim(),
            eventTime: formState.anyTime ? undefined : formState.time,
            description: formState.description.trim() || undefined,
          },
        });

        // Call optional callback for backwards compatibility
        if (onSave) {
          const project = projects.find(p => p.id === formState.projectId);
          const updated: ManualEventDetails = {
            ...event,
            title: formState.title.trim(),
            date: formState.date.trim(),
            projectId: formState.projectId,
            project: project?.name || null,
            eventType: formState.eventType,
            anyTime: formState.anyTime,
            description: formState.description.trim(),
            time: formState.anyTime ? undefined : timeUtils.toDisplay(formState.time),
          };
          onSave(updated);
        }

        setIsOpen(false);
      } catch (error) {
        console.error("Failed to update calendar event:", error);
        // Error toast is handled by the mutation hook
      }
    },
    [formState, event, onSave, updateCalendarEvent, projects]
  );

  const handleDelete = useCallback(
    async () => {
      if (!event.id) return;

      try {
        await deleteCalendarEvent.mutateAsync(event.id as string);

        // Call optional callback for backwards compatibility
        if (onDelete) {
          onDelete(event.id);
        }

        setIsOpen(false);
      } catch (error) {
        console.error("Failed to delete calendar event:", error);
        // Error toast is handled by the mutation hook
      }
    },
    [event.id, onDelete, deleteCalendarEvent]
  );

  const updateField = useCallback(
    <K extends keyof typeof formState>(field: K, value: (typeof formState)[K]) => {
      setFormState((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  // Style classes
  const inputBase =
    "w-full h-7 rounded border border-neutral-200 px-2 text-[12px] outline-none transition-all";
  const editableClasses =
    "bg-white text-[#202020] placeholder:text-[#909090] focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981]/20";

  return (
    <div ref={containerRef} className="relative">
      <style>{`
        @keyframes popoverSlideIn {
          0% {
            opacity: 0;
            transform: translateY(-50%) scale(0.96);
          }
          100% {
            opacity: 1;
            transform: translateY(-50%) scale(1);
          }
        }
        .popover-enter {
          animation: popoverSlideIn 180ms cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>
      {/* Trigger */}
      <div
        ref={triggerRef}
        onClick={(e) => {
        e.stopPropagation();
        setIsOpen(!isOpen);
      }}
      className="cursor-pointer"
    >
        {children}
      </div>

      {/* Popover - use portal to render outside parent containers */}
      {isOpen && createPortal(
        <div 
          ref={popoverRef} 
          className="popover-enter fixed w-64 rounded-lg bg-white border border-neutral-200 shadow-xl z-[9999]"
          style={{
            top: `${(triggerRef.current?.getBoundingClientRect().top || 0) + window.scrollY}px`,
            left: `${(triggerRef.current?.getBoundingClientRect().left || 0) - 270}px`,
            transform: 'translateY(-50%)'
          }}
        >
          <form onSubmit={handleSave} className="p-3 space-y-2">
            {/* Header with kind tag */}
            <div className="flex items-center justify-between mb-2 text-[13px] leading-tight">
              <div className="flex items-center gap-1.5">
                <Icon name="tag" className="text-[#9ca3af]" />
                <span className="text-[13px] font-semibold text-[#202020]">
                  Event
                </span>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            </div>

            {/* Title */}
            <input
              type="text"
              value={formState.title}
              onChange={(e) => updateField("title", e.target.value)}
              placeholder="Event title"
              className={`${inputBase} font-medium ${editableClasses}`}
            />

            {/* Event Type Dropdown */}
            <Dropdown
              isOpen={eventTypeOpen}
              onClose={() => setEventTypeOpen(false)}
              trigger={
                <button
                  type="button"
                  onClick={() => setEventTypeOpen(!eventTypeOpen)}
                  className={`${inputBase} flex items-center justify-between ${editableClasses} hover:border-[#10b981] hover:bg-[#10b981]/5`}
                >
                  <span className="flex items-center gap-1.5">
                    <Icon name="tag" className="text-[#9ca3af]" />
                    <span className="text-[#202020]">{formState.eventType}</span>
                  </span>
                  <Icon
                    name="chevron"
                    className="text-[#606060]"
                    rotate={eventTypeOpen}
                  />
                </button>
              }
            >
              {eventTypes.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    updateField("eventType", type);
                    setEventTypeOpen(false);
                  }}
                  className="w-full px-2 py-1 text-[12px] text-left hover:bg-neutral-50 active:bg-neutral-100 text-[#202020] transition-colors flex items-center gap-1.5"
                >
                  <Icon name="tag" className="text-[#9ca3af]" />
                  <span>{type}</span>
                </button>
              ))}
            </Dropdown>

            {/* Project Dropdown */}
            <Dropdown
              isOpen={projectOpen}
              onClose={() => setProjectOpen(false)}
              trigger={
                <button
                  type="button"
                  onClick={() => setProjectOpen(!projectOpen)}
                  className={`${inputBase} flex items-center justify-between ${editableClasses} hover:border-[#10b981] hover:bg-[#10b981]/5`}
                >
                  <span className="flex items-center gap-1.5 min-w-0">
                    <Icon name="list" className="text-[#9ca3af]" />
                    <span className="truncate text-[#202020]">
                      {formState.projectId ? projects.find(p => p.id === formState.projectId)?.name : "Select project"}
                    </span>
                  </span>
                  <Icon
                    name="chevron"
                    className="text-[#606060]"
                    rotate={projectOpen}
                  />
                </button>
              }
            >
              <button
                type="button"
                onClick={() => {
                  updateField("projectId", null);
                  setProjectOpen(false);
                }}
                className="w-full px-2 py-1 text-[12px] text-left hover:bg-neutral-50 text-[#606060] transition-colors flex items-center gap-1.5"
              >
                <Icon name="list" className="text-[#9ca3af]" />
                <span className="truncate">Select project</span>
              </button>
              {projects.length > 0 && <div className="h-px bg-neutral-100 my-0.5" />}
              {projectsLoading ? (
                <div className="px-2 py-1 text-[12px] text-[#909090]">Loading projects...</div>
              ) : projects.length === 0 ? (
                <div className="px-2 py-1 text-[12px] text-[#909090]">No projects available</div>
              ) : (
                projects.map((project) => (
                  <button
                    key={project.id}
                    type="button"
                    onClick={() => {
                      updateField("projectId", project.id);
                      setProjectOpen(false);
                    }}
                    className="w-full px-2 py-1 text-[12px] text-left hover:bg-neutral-50 active:bg-neutral-100 text-[#202020] transition-colors flex items-center gap-1.5"
                  >
                    <Icon name="list" className="text-[#9ca3af]" />
                    <span className="truncate">{project.name}</span>
                  </button>
                ))
              )}
            </Dropdown>

            {/* Date */}
            <input
              type="date"
              value={formState.date}
              onChange={(e) => updateField("date", e.target.value)}
              className={`${inputBase} ${editableClasses}`}
            />

            {/* Time + Any Time Toggle */}
            <div className="flex gap-1">
              <input
                type="time"
                value={formState.time}
                onChange={(e) => updateField("time", e.target.value)}
                disabled={formState.anyTime}
                className={`flex-1 h-7 rounded border px-2 text-[12px] outline-none transition-all ${
                  formState.anyTime
                    ? "border-transparent bg-neutral-50 text-[#202020] cursor-not-allowed"
                    : "border-neutral-200 bg-white text-[#202020] focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981]/20"
                }`}
              />
              <button
                type="button"
                onClick={() => updateField("anyTime", !formState.anyTime)}
                className={`h-7 rounded px-2 text-[12px] font-medium transition-all touch-manipulation flex items-center gap-1 whitespace-nowrap ${
                  formState.anyTime
                    ? "bg-[#10b981] text-white border border-[#10b981]"
                    : "bg-white text-[#505050] border border-neutral-200 hover:border-[#10b981] hover:bg-[#10b981]/5"
                }`}
              >
                <Icon name="clock" />
                <span>Any</span>
              </button>
            </div>

            {/* Description */}
            <textarea
              value={formState.description}
              onChange={(e) => updateField("description", e.target.value)}
              placeholder="Add a description"
              rows={3}
              className={`w-full rounded border border-neutral-200 px-2 py-1 text-[12px] outline-none transition-all resize-none bg-white placeholder:text-[#909090] focus:border-[#10b981] focus:ring-1 focus:ring-[#10b981]/20`}
            />

            {/* Actions */}
            <div className="pt-1.5 mt-1.5 border-t border-neutral-100 space-y-1.5">
              <button
                type="submit"
                disabled={!formState.title.trim() || !formState.date.trim()}
                className="w-full h-7 rounded text-[12px] font-medium text-white bg-[#10b981] hover:bg-[#059669] active:bg-[#047857] disabled:bg-neutral-300 disabled:text-[#808080] disabled:cursor-not-allowed transition-all touch-manipulation"
              >
                Save changes
              </button>
              {showDeleteConfirm ? (
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="flex-1 h-7 rounded text-[12px] font-medium text-white bg-red-600 hover:bg-red-700 active:bg-red-800 transition-all touch-manipulation"
                  >
                    Confirm Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 h-7 rounded text-[12px] font-medium text-[#505050] bg-white border border-neutral-200 hover:bg-neutral-50 transition-all touch-manipulation"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full h-7 rounded text-[12px] font-medium text-red-600 bg-white border border-red-200 hover:bg-red-50 hover:border-red-300 transition-all touch-manipulation"
                >
                  Delete Event
                </button>
              )}
            </div>
          </form>
        </div>,
        document.body
      )}
    </div>
  );
};

export default ManualEventDetailsPopover;
