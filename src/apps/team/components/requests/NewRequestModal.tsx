/**
 * NewRequestModal Component
 * Modal for creating new requests
 */

import { useState, useEffect, useRef } from "react";
import type { User, Project } from "@/lib/api/types";

const TITLE_MAX_CHARS = 40;

interface NewRequestModalProps {
  users: User[];
  projects: Project[];
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    description: string;
    projectId: string | null;
    assignee: string;
    dueBy: string | null;
  }) => void;
}

function toISODate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(base: Date, days: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function formatShort(date: Date) {
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function NewRequestModal({ users, projects, onClose, onSubmit }: NewRequestModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState("");
  const [assignee, setAssignee] = useState("");
  const [dueBy, setDueBy] = useState("");
  const [projectOpen, setProjectOpen] = useState(false);
  const [assigneeOpen, setAssigneeOpen] = useState(false);
  const [dueOpen, setDueOpen] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  // Convert API data to dropdown options
  const projectOptions = projects.map(p => ({
    value: p.id,
    label: p.name,
  }));

  const assigneeOptions = users
    .filter(u => !u.deletedAt) // Only show active users
    .map(u => ({
      value: u.id,
      label: u.name,
    }));

  const projectLabel =
    projectOptions.find((p) => p.value === projectId)?.label || "Select project";
  const assigneeLabel =
    assigneeOptions.find((a) => a.value === assignee)?.label || "Send to";

  // Make title, description, and assignee required
  const isValid =
    title.trim().length > 0 &&
    description.trim().length > 0 &&
    assignee.trim().length > 0;

  const titleError = showErrors && title.trim().length === 0;
  const descriptionError = showErrors && description.trim().length === 0;
  const assigneeError = showErrors && assignee.trim().length === 0;

  const projectFieldRef = useRef<HTMLDivElement | null>(null);
  const assigneeFieldRef = useRef<HTMLDivElement | null>(null);
  const dueFieldRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!projectOpen && !assigneeOpen && !dueOpen) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;

      const inProject = projectFieldRef.current?.contains(target);
      const inAssignee = assigneeFieldRef.current?.contains(target);
      const inDue = dueFieldRef.current?.contains(target);

      if (!inProject && !inAssignee && !inDue) {
        setProjectOpen(false);
        setAssigneeOpen(false);
        setDueOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [projectOpen, assigneeOpen, dueOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValid) {
      setShowErrors(true);
      return;
    }

    setShowErrors(false);

    onSubmit({
      title,
      description,
      projectId: projectId || null,
      assignee,
      dueBy: dueBy || null,
    });
  };

  const handleCancel = () => {
    onClose();
  };

  const today = new Date();
  const todayISO = toISODate(today);
  const tomorrowDate = addDays(today, 1);
  const tomorrowISO = toISODate(tomorrowDate);
  const nextWeekDate = addDays(today, 7);
  const nextWeekISO = toISODate(nextWeekDate);

  let dueMainText = "Due by";
  let dueDateText = "";
  if (dueBy) {
    if (dueBy === todayISO) {
      dueMainText = "Today";
      dueDateText = formatShort(today);
    } else if (dueBy === tomorrowISO) {
      dueMainText = "Tomorrow";
      dueDateText = formatShort(tomorrowDate);
    } else if (dueBy === nextWeekISO) {
      dueMainText = "Next week";
      dueDateText = formatShort(nextWeekDate);
    } else {
      try {
        const d = new Date(dueBy);
        if (!isNaN(d.getTime())) {
          // Custom date: show just the date in the main label
          dueMainText = formatShort(d);
          dueDateText = "";
        } else {
          dueMainText = dueBy;
        }
      } catch {
        dueMainText = dueBy;
      }
    }
  }

  const handleQuickDue = (value: string) => {
    setDueBy(value);
    setDueOpen(false);
  };

  const handleCustomDueChange = (value: string) => {
    setDueBy(value);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6 sm:px-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        fontFamily:
          'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="relative z-10 flex w-full max-w-[560px] flex-col gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3.5 shadow-[0_18px_45px_rgba(15,15,15,0.16)] sm:px-5 sm:py-4"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2.5">
          <div className="space-y-px">
            <div className="text-[19px] font-semibold text-neutral-900">
              Make a request
            </div>
            <div className="text-[14px] text-neutral-500">
              Say what you need so the right person can move it forward.
            </div>
          </div>
          <button
            type="button"
            className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 bg-white text-[18px] text-neutral-500 cursor-pointer hover:border-neutral-300 hover:bg-neutral-50"
            onClick={handleCancel}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-3.5">
          {/* Title */}
          <div className="mt-3 flex flex-col gap-1">
            <div className="relative">
              <input
                type="text"
                placeholder="Write a short line about what you're asking for."
                value={title}
                maxLength={TITLE_MAX_CHARS}
                onChange={(e) =>
                  setTitle(e.target.value.slice(0, TITLE_MAX_CHARS))
                }
                className={
                  "h-9 w-full rounded-lg border border-neutral-200 bg-neutral-50 pl-3 pr-10 text-[14px] text-neutral-900 outline-none transition placeholder:text-[14px] placeholder:text-neutral-400 hover:border-neutral-300 focus:border-amber-700 focus:bg-white focus:ring-1 focus:ring-amber-200" +
                  (titleError ? " ring-1 ring-amber-200" : "")
                }
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[14px] text-neutral-400">
                {TITLE_MAX_CHARS - title.length}
              </span>
            </div>
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <textarea
              placeholder="Add context, details, or links to help them respond."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={
                "min-h-[160px] w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-[14px] leading-relaxed text-neutral-900 outline-none transition placeholder:text-[14px] placeholder:text-neutral-400 hover:border-neutral-300 focus:border-amber-700 focus:bg-white focus:ring-1 focus:ring-amber-200" +
                (descriptionError ? " ring-1 ring-amber-200" : "")
              }
            />
          </div>

          {/* Send to + Project + Due by row */}
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            {/* Send to (Assignee) */}
            <div className="flex flex-col gap-1.5">
              <div className="relative" ref={assigneeFieldRef}>
                <button
                  type="button"
                  onClick={() => {
                    setAssigneeOpen((open) => !open);
                    setProjectOpen(false);
                    setDueOpen(false);
                  }}
                  className={
                    "flex h-9 w-full items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 px-3 text-[14px] text-neutral-900 outline-none transition cursor-pointer hover:border-neutral-300 focus:border-amber-700 focus:bg-white focus:ring-1 focus:ring-amber-200" +
                    (assigneeError ? " ring-1 ring-amber-200" : "")
                  }
                >
                  <span className="flex-1 truncate text-left text-neutral-900">
                    {assigneeLabel}
                  </span>
                  <span className="ml-2 text-neutral-400" aria-hidden="true">
                    <svg className="h-3 w-3" viewBox="0 0 16 16" fill="none">
                      <path
                        d="M4.5 6l3.5 4 3.5-4"
                        stroke="currentColor"
                        strokeWidth="1.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </button>
                {assigneeOpen && (
                  <div className="absolute bottom-full left-0 z-20 mb-1 w-max min-w-full max-w-[320px] rounded-xl border border-neutral-200 bg-white py-1 shadow-lg">
                    <button
                      type="button"
                      className="flex w-full items-center px-3 py-1.5 text-left text-[14px] text-neutral-500 cursor-pointer hover:bg-neutral-50"
                      onClick={() => {
                        setAssignee("");
                        setAssigneeOpen(false);
                      }}
                    >
                      Send to
                    </button>
                    {assigneeOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className="flex w-full items-center px-3 py-1.5 text-left text-[14px] text-neutral-800 cursor-pointer hover:bg-neutral-50"
                        onClick={() => {
                          setAssignee(option.value);
                          setAssigneeOpen(false);
                        }}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Project selector */}
            <div className="flex flex-col gap-1.5">
              <div className="relative" ref={projectFieldRef}>
                <button
                  type="button"
                  onClick={() => {
                    setProjectOpen((open) => !open);
                    setAssigneeOpen(false);
                    setDueOpen(false);
                  }}
                  className="flex h-9 w-full items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 px-3 text-[14px] text-neutral-900 outline-none transition cursor-pointer hover:border-neutral-300 focus:border-amber-700 focus:bg-white focus:ring-1 focus:ring-amber-200"
                >
                  <span className="flex-1 truncate text-left text-neutral-900">
                    {projectLabel}
                  </span>
                  <span className="ml-2 text-neutral-400" aria-hidden="true">
                    <svg className="h-3 w-3" viewBox="0 0 16 16" fill="none">
                      <path
                        d="M4.5 6l3.5 4 3.5-4"
                        stroke="currentColor"
                        strokeWidth="1.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </button>
                {projectOpen && (
                  <div className="absolute bottom-full left-0 z-20 mb-1 w-max min-w-full max-w-[320px] rounded-xl border border-neutral-200 bg-white py-1 shadow-lg">
                    <button
                      type="button"
                      className="flex w-full items-center px-3 py-1.5 text-left text-[14px] text-neutral-500 cursor-pointer hover:bg-neutral-50"
                      onClick={() => {
                        setProjectId("");
                        setProjectOpen(false);
                      }}
                    >
                      Select project
                    </button>
                    {projectOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className="flex w-full items-center px-3 py-1.5 text-left text-[14px] text-neutral-800 cursor-pointer hover:bg-neutral-50"
                        onClick={() => {
                          setProjectId(option.value);
                          setProjectOpen(false);
                        }}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Due by popover */}
            <div className="flex flex-col gap-1.5">
              <div className="relative" ref={dueFieldRef}>
                <button
                  type="button"
                  onClick={() => {
                    setDueOpen((open) => !open);
                    setProjectOpen(false);
                    setAssigneeOpen(false);
                  }}
                  className="flex h-9 w-full items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 px-3 text-[14px] text-neutral-900 outline-none transition cursor-pointer hover:border-neutral-300 focus:border-amber-700 focus:bg-white focus:ring-1 focus:ring-amber-200"
                >
                  <span className="flex-1 truncate text-left text-neutral-900">
                    {dueMainText}
                    {dueDateText && (
                      <span className="ml-1.5 text-neutral-400">{dueDateText}</span>
                    )}
                  </span>
                  <span className="ml-2 text-neutral-400" aria-hidden="true">
                    <svg className="h-3 w-3" viewBox="0 0 16 16" fill="none">
                      <path
                        d="M4.5 6l3.5 4 3.5-4"
                        stroke="currentColor"
                        strokeWidth="1.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </button>
                {dueOpen && (
                  <div className="absolute bottom-full right-0 z-20 mb-1 w-max min-w-full max-w-[280px] rounded-xl border border-neutral-200 bg-white py-1 shadow-lg">
                    <div className="px-3 pb-1 pt-1.5 text-[11px] uppercase tracking-wide text-neutral-400">
                      Quick options
                    </div>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between px-3 py-1.5 text-left text-[14px] text-neutral-800 cursor-pointer hover:bg-neutral-50"
                      onClick={() => handleQuickDue(todayISO)}
                    >
                      <span>Today</span>
                      <span className="text-[12px] text-neutral-400">
                        {formatShort(today)}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between px-3 py-1.5 text-left text-[14px] text-neutral-800 cursor-pointer hover:bg-neutral-50"
                      onClick={() => handleQuickDue(tomorrowISO)}
                    >
                      <span>Tomorrow</span>
                      <span className="text-[12px] text-neutral-400">
                        {formatShort(tomorrowDate)}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between px-3 py-1.5 text-left text-[14px] text-neutral-800 cursor-pointer hover:bg-neutral-50"
                      onClick={() => handleQuickDue(nextWeekISO)}
                    >
                      <span>Next week</span>
                      <span className="text-[12px] text-neutral-400">
                        {formatShort(nextWeekDate)}
                      </span>
                    </button>
                    <div className="mt-1 border-t border-neutral-100 pt-1.5">
                      <div className="px-3 pb-0.5 text-[11px] uppercase tracking-wide text-neutral-400">
                        Or pick a date
                      </div>
                      <div className="px-3 pb-2">
                        <input
                          type="date"
                          value={dueBy}
                          onChange={(e) => handleCustomDueChange(e.target.value)}
                          className="h-8 w-full rounded-md border border-neutral-200 bg-neutral-50 px-2 text-[13px] text-neutral-900 outline-none transition hover:border-neutral-300 focus:border-amber-700 focus:bg-white focus:ring-1 focus:ring-amber-200"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-3 flex items-center justify-end gap-1.75">
          <button
            type="button"
            onClick={handleCancel}
            className="inline-flex h-9 items-center justify-center rounded-lg border border-neutral-200 bg-white px-3.5 text-[14px] font-medium text-neutral-700 cursor-pointer hover:border-neutral-300 hover:bg-neutral-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="inline-flex h-9 items-center justify-center rounded-lg bg-[#5b3a1a] px-4 text-[14px] font-semibold text-white cursor-pointer hover:bg-[#4a2f15]"
          >
            Send request
          </button>
        </div>
      </form>
    </div>
  );
}
