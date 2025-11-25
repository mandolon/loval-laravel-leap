import React, { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";

// ===== Types =====
export interface RequestEventDetails {
  id?: string | number;
  title: string;
  date: string;
  time?: string;
  project?: string | null;
  anyTime?: boolean;
  eventType?: string;
  description?: string;
}

interface RequestEventDetailsPopoverProps {
  event: RequestEventDetails;
  workspaceId: string;
  children: React.ReactNode;
}

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

// ===== Sub-Components =====
interface IconProps {
  name: "list" | "clock" | "tag";
  className?: string;
}

const Icon: React.FC<IconProps> = ({ name, className = "" }) => {
  const icons = {
    list: (
      <>
        <path d="M8 6h12" />
        <path d="M4 12h16" />
        <path d="M10 18h10" />
      </>
    ),
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
      strokeWidth="1.8"
      className={className}
    >
      {icons[name]}
    </svg>
  );
};

// ===== Main Component =====
export const RequestEventDetailsPopover: React.FC<RequestEventDetailsPopoverProps> = ({
  event,
  children,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Debug effect
  useEffect(() => {
    console.log('RequestEventDetailsPopover isOpen state changed:', isOpen);
  }, [isOpen]);

  const closePopover = useCallback(() => {
    console.log('RequestEventDetailsPopover closePopover called');
    setIsOpen(false);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      console.log('RequestEventDetailsPopover handleClick', {
        hasPopoverRef: !!popoverRef.current,
        hasTriggerRef: !!triggerRef.current,
        target: target
      });
      if (
        (popoverRef.current && popoverRef.current.contains(target)) ||
        (triggerRef.current && triggerRef.current.contains(target))
      ) {
        console.log('Click inside popover or trigger, not closing');
        return;
      }
      console.log('Click outside detected, closing popover');
      closePopover();
    };

    const timeoutId = setTimeout(() => {
      console.log('RequestEventDetailsPopover adding click listener');
      document.addEventListener('click', handleClick, true);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('click', handleClick, true);
    };
  }, [isOpen, closePopover]);

  const inputBase =
    "w-full h-7 rounded border border-transparent bg-neutral-50 px-2 text-[12px] outline-none text-[#202020] cursor-default";
  const formatDisplayDate = (value?: string) => {
    if (!value) return "No date";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

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
          console.log('RequestEventDetailsPopover clicked', { isOpen, willBeOpen: !isOpen });
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
          <div className="p-3 space-y-2">
            {/* Header with kind tag */}
            <div className="flex items-center justify-between mb-2 text-[13px] leading-tight">
              <div className="flex items-center gap-1.5">
                <Icon name="tag" className="text-[#9ca3af]" />
                <span className="text-[13px] font-semibold text-[#202020]">
                  Request
                </span>
              </div>
              <span className="w-2 h-2 rounded-full bg-amber-500" />
            </div>

            {/* Title */}
            <input
              type="text"
              value={event.title}
              readOnly
              className={`${inputBase} font-medium`}
            />

            {/* Event Type */}
            <button
              type="button"
              disabled
              className={`${inputBase} flex items-center justify-between`}
            >
              <span className="flex items-center gap-1.5">
                <Icon name="tag" className="text-[#9ca3af]" />
                <span className="text-[#202020]">{event.eventType || "Request"}</span>
              </span>
            </button>

            {/* Project */}
            <button
              type="button"
              disabled
              className={`${inputBase} flex items-center justify-between`}
            >
              <span className="flex items-center gap-1.5 min-w-0">
                <Icon name="list" className="text-[#9ca3af]" />
                <span className="truncate text-[#202020]">
                  {event.project || "No project"}
                </span>
              </span>
            </button>

            {/* Date */}
            <div className={`${inputBase} flex items-center justify-between`}>
              <span className="text-[#202020]">{formatDisplayDate(event.date)}</span>
            </div>

            {/* Time */}
            <div className="flex gap-1">
              <input
                type="text"
                value={event.time || "Any time"}
                readOnly
                disabled
                className="flex-1 h-7 rounded border border-transparent bg-neutral-50 px-2 text-[12px] text-[#202020] cursor-default"
              />
              {event.anyTime && (
                <button
                  type="button"
                  disabled
                  className="h-7 rounded px-2 text-[12px] font-medium bg-neutral-200 text-[#505050] border border-neutral-200 flex items-center gap-1 whitespace-nowrap cursor-default"
                >
                  <Icon name="clock" />
                  <span>Any</span>
                </button>
              )}
            </div>

            {/* Description */}
            {event.description && (
              <textarea
                value={event.description}
                readOnly
                rows={3}
                className="w-full rounded border border-transparent bg-neutral-50 px-2 py-1 text-[12px] text-[#202020] cursor-default resize-none"
              />
            )}

            {/* Actions */}
            <div className="pt-1.5 mt-1.5 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-full h-7 rounded text-[12px] font-medium text-[#202020] bg-neutral-100 hover:bg-neutral-200 active:bg-neutral-300 transition-all touch-manipulation"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default RequestEventDetailsPopover;
