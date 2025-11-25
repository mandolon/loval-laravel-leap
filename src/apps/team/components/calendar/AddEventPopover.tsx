import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useCreateCalendarEvent } from "@/lib/api/hooks/useCalendarEvents";
import { useProjects } from "@/lib/api/hooks/useProjects";

interface AddEventFormValues {
  title: string;
  date: string;
  time: string;
  project: string | null;
  anyTime: boolean;
  eventType: string;
}

interface AddEventPopoverProps {
  workspaceId: string;
  onAddEvent?: (event: AddEventFormValues) => void;
  buttonClassName?: string;
  defaultDate?: string; // Pre-fill date (e.g., from selected calendar day)
}

const EVENT_TYPES = [
  "Reminder",
  "Meeting",
  "Deadline",
  "Site Visit",
  "Call",
  "Milestone",
  "Review",
] as const;

export default function AddEventPopover({
  workspaceId,
  onAddEvent,
  buttonClassName,
  defaultDate,
}: AddEventPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(defaultDate || "");
  const [time, setTime] = useState("09:00"); // 24-hour format for native input
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectOpen, setProjectOpen] = useState(false);
  const [eventType, setEventType] = useState<typeof EVENT_TYPES[number]>("Meeting");
  const [eventTypeOpen, setEventTypeOpen] = useState(false);
  const [anyTime, setAnyTime] = useState(true); // Default to "Any" time
  const [popoverPosition, setPopoverPosition] = useState<{ top: number; left: number } | null>(null);

  // API hooks
  const createCalendarEvent = useCreateCalendarEvent();
  const { data: projects = [], isLoading: projectsLoading } = useProjects(workspaceId);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const projectPopoverRef = useRef<HTMLDivElement | null>(null);
  const eventTypePopoverRef = useRef<HTMLDivElement | null>(null);

  // Update date if defaultDate changes
  useEffect(() => {
    if (defaultDate) {
      setDate(defaultDate);
    }
  }, [defaultDate]);

  // Calculate popover position when opened
  useEffect(() => {
    if (isOpen && buttonRef.current && !popoverPosition) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPopoverPosition({
        top: rect.top + rect.height / 2,
        left: rect.left,
      });
    } else if (!isOpen) {
      setPopoverPosition(null);
    }
  }, [isOpen, popoverPosition]);

  // Close main popover on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node;
      // Check if click is outside both button and popover
      if (
        buttonRef.current && !buttonRef.current.contains(target) &&
        popoverRef.current && !popoverRef.current.contains(target)
      ) {
        setIsOpen(false);
        setProjectOpen(false);
        setEventTypeOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  // Close project list on outside click
  useEffect(() => {
    if (!projectOpen) return;

    const handleClick = (event: MouseEvent) => {
      if (!projectPopoverRef.current) return;
      if (!projectPopoverRef.current.contains(event.target as Node)) {
        setProjectOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [projectOpen]);

  // Close event type list on outside click
  useEffect(() => {
    if (!eventTypeOpen) return;

    const handleClick = (event: MouseEvent) => {
      if (!eventTypePopoverRef.current) return;
      if (!eventTypePopoverRef.current.contains(event.target as Node)) {
        setEventTypeOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [eventTypeOpen]);

  const resetForm = () => {
    setTitle("");
    setDate(defaultDate || "");
    setTime("09:00");
    setProjectId(null);
    setEventType("Meeting");
    setAnyTime(true);
    setProjectOpen(false);
    setEventTypeOpen(false);
    setIsOpen(false);
  };

  const handleButtonClick = () => {
    if (!isOpen && buttonRef.current) {
      // Calculate position before opening
      const rect = buttonRef.current.getBoundingClientRect();
      setPopoverPosition({
        top: rect.top + rect.height / 2,
        left: rect.left,
      });
    }
    setIsOpen((open) => !open);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date.trim()) return;

    try {
      // Create event in database
      await createCalendarEvent.mutateAsync({
        title: title.trim(),
        eventType: eventType,
        projectId: projectId || undefined,
        workspaceId: workspaceId,
        eventDate: date.trim(),
        eventTime: anyTime ? undefined : time,
      });

      // Call optional callback for backwards compatibility
      if (onAddEvent) {
        // Convert 24h to 12h format for display
        let formattedTime = "";
        if (!anyTime && time) {
          const [hours, minutes] = time.split(":");
          const h = parseInt(hours, 10);
          const ampm = h >= 12 ? "PM" : "AM";
          const h12 = h % 12 || 12;
          formattedTime = `${h12}:${minutes} ${ampm}`;
        }

        const project = projects.find(p => p.id === projectId);
        const payload: AddEventFormValues = {
          title: title.trim(),
          date: date.trim(),
          time: formattedTime,
          project: project?.name || null,
          anyTime,
          eventType,
        };
        onAddEvent(payload);
      }

      resetForm();
    } catch (error) {
      console.error("Failed to create calendar event:", error);
      // Error toast is handled by the mutation hook
    }
  };

  const handleCancel = () => {
    resetForm();
  };

  return (
    <>
      <style>{`
        @keyframes popoverSlideIn {
          0% {
            opacity: 0;
            transform: translate(-100%, -50%) scale(0.96);
          }
          100% {
            opacity: 1;
            transform: translate(-100%, -50%) scale(1);
          }
        }
        .popover-enter {
          animation: popoverSlideIn 180ms cubic-bezier(0.16, 1, 0.3, 1);
        }
        /* Prevent layout shift on mount */
        .popover-container {
          position: fixed;
          transform: translate(-100%, -50%);
          margin-left: -0.5rem;
          z-index: 9999;
        }
      `}</style>

      <div ref={containerRef} className="relative inline-flex">
        {/* Trigger button */}
        <button
          ref={buttonRef}
          type="button"
          onClick={handleButtonClick}
          className={
            buttonClassName ||
            "inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-xs font-medium text-[#303030] hover:border-[#4c75d1]/70 hover:bg-[#4c75d1]/5 active:bg-[#4c75d1]/10 transition-colors touch-manipulation shadow-sm"
          }
        >
          <span className="text-sm leading-none">+</span>
          <span>Add event</span>
        </button>

        {/* Floating popover - positioned to the left on all screens */}
        {isOpen && popoverPosition && createPortal(
          <div 
            ref={popoverRef}
            className="popover-container popover-enter w-48 rounded-lg border border-neutral-200 bg-white shadow-lg"
            style={{
              top: `${popoverPosition.top}px`,
              left: `${popoverPosition.left}px`,
            }}
          >
            {/* Pointer arrow - right middle pointing right to button */}
            <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-white border border-neutral-200 border-l-transparent border-b-transparent rotate-45" />

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-2 space-y-1.5 relative">
              {/* Title */}
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Event title"
                autoFocus
                className="w-full h-6 rounded border border-neutral-200 bg-white px-2 text-[12px] outline-none placeholder:text-[#909090] focus:border-[#4c75d1] focus:ring-1 focus:ring-[#4c75d1]/20 transition-all"
              />

              {/* Event Type selector with subtle calendar icon */}
              <div className="relative" ref={eventTypePopoverRef}>
                <button
                  type="button"
                  onClick={() => setEventTypeOpen((open) => !open)}
                  className="w-full h-6 rounded border border-neutral-200 bg-white px-2 text-[12px] outline-none flex items-center justify-between text-left hover:border-[#4c75d1] hover:bg-[#4c75d1]/5 transition-all touch-manipulation"
                >
                  <span className="flex items-center gap-1.5 min-w-0">
                    <svg
                      viewBox="0 0 24 24"
                      width="11"
                      height="11"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      className="text-[#9ca3af] flex-shrink-0"
                    >
                      <rect x="4" y="5" width="16" height="15" rx="2" />
                      <path d="M9 3v4" />
                      <path d="M15 3v4" />
                      <path d="M4 10h16" />
                    </svg>
                    <span className="truncate text-[#202020]">{eventType}</span>
                  </span>
                  <svg
                    viewBox="0 0 24 24"
                    width="10"
                    height="10"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    className={`text-[#606060] transition-transform flex-shrink-0 ml-1 ${eventTypeOpen ? "rotate-180" : ""}`}
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>

                {eventTypeOpen && (
                  <div className="absolute z-10 mt-0.5 w-full rounded border border-neutral-200 bg-white shadow-lg overflow-hidden">
                    <div className="max-h-32 overflow-y-auto scrollbar-thin">
                      {EVENT_TYPES.map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => {
                            setEventType(type);
                            setEventTypeOpen(false);
                          }}
                          className="w-full px-2 py-1 text-[12px] text-left hover:bg-neutral-50 active:bg-neutral-100 text-[#202020] transition-colors flex items-center gap-1.5"
                        >
                          <svg
                            viewBox="0 0 24 24"
                            width="11"
                            height="11"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            className="text-[#9ca3af] flex-shrink-0"
                          >
                            <rect x="4" y="5" width="16" height="15" rx="2" />
                            <path d="M9 3v4" />
                            <path d="M15 3v4" />
                            <path d="M4 10h16" />
                          </svg>
                          <span className="truncate">{type}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Project selector with list icon */}
              <div className="relative" ref={projectPopoverRef}>
                <button
                  type="button"
                  onClick={() => setProjectOpen((open) => !open)}
                  className="w-full h-6 rounded border border-neutral-200 bg-white px-2 text-[12px] outline-none flex items-center justify-between text-left hover:border-[#4c75d1] hover:bg-[#4c75d1]/5 transition-all touch-manipulation"
                >
                  <span className={`truncate ${projectId ? "text-[#202020]" : "text-[#909090]"}`}>
                    {projectId ? projects.find(p => p.id === projectId)?.name : "Select project"}
                  </span>
                  <svg
                    viewBox="0 0 24 24"
                    width="10"
                    height="10"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    className={`text-[#606090] transition-transform flex-shrink-0 ml-1 ${projectOpen ? "rotate-180" : ""}`}
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>

                {projectOpen && (
                  <div className="absolute z-10 mt-0.5 w-full rounded border border-neutral-200 bg-white shadow-lg overflow-hidden">
                    <div className="max-h-32 overflow-y-auto scrollbar-thin">
                      <button
                        type="button"
                        onClick={() => {
                          setProjectId(null);
                          setProjectOpen(false);
                        }}
                        className="w-full px-2 py-1 text-[12px] text-left text-[#606060] hover:bg-neutral-50 transition-colors flex items-center gap-1.5"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          width="11"
                          height="11"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          className="text-[#9ca3af] flex-shrink-0"
                        >
                          <circle cx="4" cy="6" r="1.3" />
                          <circle cx="4" cy="12" r="1.3" />
                          <circle cx="4" cy="18" r="1.3" />
                          <path d="M8 6h12" />
                          <path d="M8 12h12" />
                          <path d="M8 18h12" />
                        </svg>
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
                              setProjectId(project.id);
                              setProjectOpen(false);
                            }}
                            className="w-full px-2 py-1 text-[12px] text-left hover:bg-neutral-50 active:bg-neutral-100 text-[#202020] transition-colors truncate flex items-center gap-1.5"
                          >
                            <svg
                              viewBox="0 0 24 24"
                              width="11"
                              height="11"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              className="text-[#9ca3af] flex-shrink-0"
                            >
                              <circle cx="4" cy="6" r="1.3" />
                              <circle cx="4" cy="12" r="1.3" />
                              <circle cx="4" cy="18" r="1.3" />
                              <path d="M8 6h12" />
                              <path d="M8 12h12" />
                              <path d="M8 18h12" />
                            </svg>
                            <span className="truncate">{project.name}</span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Date input */}
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full h-6 rounded border border-neutral-200 bg-white px-2 text-[12px] outline-none text-[#202020] focus:border-[#4c75d1] focus:ring-1 focus:ring-[#4c75d1]/20 transition-all"
              />

              {/* Time picker with Any button inline */}
              <div className="flex gap-1">
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  disabled={anyTime}
                  className={`flex-1 h-6 rounded border px-2 text-[12px] outline-none transition-all ${
                    anyTime
                      ? "border-neutral-200 bg-neutral-50 text-[#808080] cursor-not-allowed"
                      : "border-neutral-200 bg-white text-[#202020] focus:border-[#4c75d1] focus:ring-1 focus:ring-[#4c75d1]/20"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setAnyTime((prev) => !prev)}
                  className={`h-6 rounded px-2 text-[12px] font-medium transition-all touch-manipulation flex items-center gap-1 whitespace-nowrap ${
                    anyTime
                      ? "bg-[#4c75d1] text-white border border-[#4c75d1]"
                      : "bg-white text-[#505050] border border-neutral-200 hover:border-[#4c75d1] hover:bg-[#4c75d1]/5"
                  }`}
                >
                  <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6v6l4 2" />
                  </svg>
                  <span>Any</span>
                </button>
              </div>

              {/* Bottom action button with separator */}
              <div className="pt-1.5 mt-1.5 border-t border-neutral-100 flex items-center justify-end">
                <button
                  type="submit"
                  className="flex-1 h-6 rounded text-[12px] font-medium text-white bg-[#4c75d1] hover:bg-[#3b61b6] active:bg-[#2f4d94] disabled:bg-neutral-300 disabled:text-[#808080] disabled:cursor-not-allowed transition-all touch-manipulation"
                  disabled={!title.trim() || !date.trim()}
                >
                  Add to calendar
                </button>
              </div>
            </form>
          </div>,
          document.body
        )}
      </div>
    </>
  );
}
