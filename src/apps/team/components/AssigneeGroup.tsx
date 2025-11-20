import React, { useState, useEffect, useRef, useLayoutEffect } from "react";
import { createPortal } from 'react-dom';
import { getAvatarColor, getAvatarInitials } from '@/utils/avatarUtils';

// --- Minimal helpers -------------------------------------------------------
const cn = (...a: (string | undefined | false)[]) => a.filter(Boolean).join(" ");

// --- Exact token classes from your snippet --------------------------------
const TOKENS = {
  taskRow: {
    assigneeCell: 'hidden md:flex justify-center text-[10px]',
    avatar: 'w-7 h-7 rounded-full border-2 border-card dark:border-muted flex-shrink-0 flex items-center justify-center text-[11px] font-medium text-white',
    assigneeAvatar: 'w-7 h-7 rounded-full border-2 border-card dark:border-muted -ml-1.5 first:ml-0 flex-shrink-0 cursor-pointer hover:z-10 relative group/assignee',
    assigneeRemoveButton: 'absolute -top-1 -right-1 w-3 h-3 rounded-full flex items-center justify-center text-white bg-red-500 opacity-0 group-hover/assignee:opacity-100 transition-opacity shadow-sm text-[10px] leading-none border border-card dark:border-muted hover:bg-red-600 cursor-pointer',
    assigneeCount: 'w-7 h-7 rounded-full border-2 border-card dark:border-muted -ml-1.5 bg-gray-200 dark:bg-muted flex-shrink-0 flex items-center justify-center text-[11px] font-medium text-gray-600 dark:text-muted-foreground cursor-pointer hover:bg-gray-300 dark:hover:bg-accent transition-colors',
    addAssigneeButton: 'w-6 h-6 flex-shrink-0 flex items-center justify-center text-gray-400 dark:text-muted-foreground hover:text-gray-600 dark:hover:text-foreground transition-colors cursor-pointer',
    popoverItem: 'flex w-full text-left items-center gap-1.5 px-2 py-1 hover:bg-gray-50 dark:hover:bg-muted rounded cursor-pointer transition-colors',
    popoverItemSelected: 'bg-gray-100 dark:bg-muted',
  }
} as const;

// --- Types -----------------------------------------------------------------
export type User = {
  id: string;
  name: string;
  email?: string;
  avatar_url?: string | null;
  avatarUrl?: string | null;
};

export type AssigneeGroupProps = {
  value: string[]; // array of user IDs
  usersById: Record<string, User>;
  onChange?: (next: string[]) => void;
  className?: string;
};

// Small pure helper so we can unit-test the toggle logic easily
export function toggleId(list: string[], id: string) {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

// Toggle membership in the priority list (independent from assignment list)
export function togglePriorityList(list: string[], id: string) {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

// Keep only existing priority that are still assigned (no autofill)
export function syncPriority(current: string[], assigned: string[], max = 2) {
  return current.filter((id) => assigned.includes(id)).slice(0, max);
}

// --- JUST the avatar grouping + popover -----------------------------------
export const AssigneeGroup: React.FC<AssigneeGroupProps> = ({ value, usersById, onChange, className }) => {
  const [open, setOpen] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const assignees = value.map((id) => usersById[id]).filter(Boolean);
  // Track which assignees are "priority" (shown on the row). Others are TEAM.
  const [priority, setPriority] = useState<string[]>(() => assignees.slice(0, 2).map((u) => u.id));

  // Calculate popover position
  useLayoutEffect(() => {
    if (open && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setPopoverPosition({
        top: rect.bottom + 4, // 4px gap below the trigger
        left: rect.left,
      });
    }
  }, [open]);

  // Close popover when clicking outside
  useEffect(() => {
    if (!open) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Check if click is outside both the container and the popover
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        !target.closest('[data-assignee-popover="true"]')
      ) {
        setOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // Helpers to avoid accidental side-effects
  const assign = (userId: string) => {
    if (!value.includes(userId)) onChange?.([...value, userId]);
  };
  const unassign = (userId: string) => {
    if (value.includes(userId)) {
      const next = value.filter((x) => x !== userId);
      setPriority((p) => p.filter((id) => id !== userId));
      onChange?.(next);
    }
  };
  const togglePriority = (userId: string) => {
    if (!value.includes(userId)) return; // must be assigned first
    setPriority((p) => (p.includes(userId) ? p.filter((id) => id !== userId) : [...p, userId]));
  };

  // Keep priority in sync when `value` changes externally
  useEffect(() => {
    setPriority((p) => {
      // Ensure priority list only contains currently assigned users
      const validPriority = p.filter(id => value.includes(id));
      // If we have room and assigned users aren't in priority, add them up to max 2
      const needed = Math.min(2 - validPriority.length, value.length);
      const toAdd = value
        .filter(id => !validPriority.includes(id))
        .slice(0, needed);
      const result = [...validPriority, ...toAdd].slice(0, 2);
      
      // Only update if actually different
      const prevSorted = [...p].sort().join(',');
      const resultSorted = [...result].sort().join(',');
      return prevSorted !== resultSorted ? result : p;
    });
  }, [value]);

  // Reserve a stable width so selecting/unselecting doesn't cause layout shift
  const GROUP_WIDTH_PX = 90; // ~3 avatars width incl. overlap space

  // Build the lists for the popover (stable ordering)
  const assignedInOrder = value.map((id) => usersById[id]).filter(Boolean);
  const selectedPriority = priority
    .filter((id) => value.includes(id))
    .map((id) => usersById[id])
    .filter(Boolean);
  const selectedNonPriority = assignedInOrder.filter((u) => !priority.includes(u.id));
  const unselected = Object.keys(usersById)
    .filter((id) => !value.includes(id))
    .map((id) => usersById[id])
    .filter(Boolean);

  // What shows in-row vs count in "+N"
  const visiblePriority = selectedPriority.slice(0, 2);
  const hiddenCount = selectedNonPriority.length; // TEAM count only

  return (
    <div ref={containerRef} className={cn("relative flex items-center", className)} onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center">
        {visiblePriority.length === 0 ? (
          // Keep size identical to avatar to avoid layout shift
          <div
            className={cn(TOKENS.taskRow.assigneeAvatar, 'first:ml-0')}
            onClick={() => setOpen((v) => !v)}
            title="Add assignee"
          >
            <div className="w-full h-full rounded-full border-2 border-card flex items-center justify-center bg-gray-100 text-gray-500">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </div>
          </div>
        ) : (
          <>
            {visiblePriority.map((user) => {
              const avatarColor = getAvatarColor(user);
              const initials = getAvatarInitials(user.name);
              return (
                <div
                  key={user.id}
                  className={cn(TOKENS.taskRow.assigneeAvatar, 'transition-transform ease-out duration-150 hover:-translate-y-[1px] will-change-transform')}
                  onClick={() => setOpen(true)}
                >
                  <div
                    className="w-full h-full rounded-full flex items-center justify-center text-[11px] font-medium text-white"
                    style={{ background: avatarColor }}
                  >
                    {initials}
                  </div>
                  <button
                    className={TOKENS.taskRow.assigneeRemoveButton}
                    onClick={(e) => { e.stopPropagation(); unassign(user.id); }}
                    title="Remove assignee"
                  >
                    −
                  </button>
                </div>
              );
            })}
            {hiddenCount > 0 && (
              <div
                className={cn(TOKENS.taskRow.assigneeCount, 'transition-transform ease-out duration-150 hover:-translate-y-[1px] will-change-transform')}
                onClick={() => setOpen(true)}
                title={`${hiddenCount} TEAM`}
              >
                +{hiddenCount}
              </div>
            )}
          </>
        )}
      </div>

      {open && createPortal(
        <div 
          className="fixed z-[99999] pointer-events-auto" 
          data-assignee-popover="true"
          style={{ top: `${popoverPosition.top}px`, left: `${popoverPosition.left}px` }}
        >
          <div className="p-1 bg-white border shadow-md rounded-md w-[220px] max-h-[400px] overflow-y-auto transition-all duration-150 ease-out transform pointer-events-auto">
            {/* ASSIGNED TO (priority) */}
            <div className="px-2 py-1 text-left text-[10px] uppercase tracking-wide text-gray-500">ASSIGNED TO</div>
            <div className="flex flex-col gap-1 text-[11px] select-none">
              {selectedPriority.length === 0 && <div className="px-2 py-1 text-left text-gray-400">No ASSIGNED TO users</div>}
              {selectedPriority.map((user) => {
                const avatarColor = getAvatarColor(user);
                const initials = getAvatarInitials(user.name);
                return (
                  <div key={user.id} className="group/pri flex items-center gap-1.5 px-2 py-1 rounded hover:bg-gray-50">
                    <div className={TOKENS.taskRow.avatar} style={{ background: avatarColor }}>{initials}</div>
                    {/* Name click demotes to TEAM */}
                    <span
                      className="flex-1 text-left text-[11px] text-gray-800 cursor-pointer"
                      onClick={() => togglePriority(user.id)}
                      onKeyDown={(e) => (e.key === 'Enter' ? togglePriority(user.id) : null)}
                      role="button"
                      tabIndex={0}
                    >
                      {user.name}
                    </span>
                    {/* Demote to TEAM (down arrow) */}
                    <button
                      className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-gray-700 opacity-0 group-hover/pri:opacity-100 transition-opacity cursor-pointer"
                      title="Move to TEAM"
                      onClick={() => togglePriority(user.id)}
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Separator line labeled TEAM */}
            <div className="my-2 relative">
              <div className="border-t" />
              <div className="absolute -top-2 left-2 bg-white px-1 text-[10px] text-gray-500">TEAM</div>
            </div>

            {/* TEAM (non-priority assigned) */}
            <div className="flex flex-col gap-1 text-[11px] select-none">
              {selectedNonPriority.length === 0 && <div className="px-2 py-1 text-left text-gray-400">No TEAM</div>}
              {selectedNonPriority.map((user) => {
                const avatarColor = getAvatarColor(user);
                const initials = getAvatarInitials(user.name);
                return (
                  <div key={user.id} className="group/team flex items-center gap-1.5 px-2 py-1 rounded hover:bg-gray-50">
                    <div className={TOKENS.taskRow.avatar} style={{ background: avatarColor }}>{initials}</div>
                    {/* Name click promotes to ASSIGNED TO */}
                    <span
                      className="flex-1 text-left text-[11px] text-gray-800 cursor-pointer"
                      onClick={() => togglePriority(user.id)}
                      onKeyDown={(e) => (e.key === 'Enter' ? togglePriority(user.id) : null)}
                      role="button"
                      tabIndex={0}
                    >
                      {user.name}
                    </span>
                    {/* Chevron to move back down to Available */}
                    <button
                      className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-gray-700 opacity-0 group-hover/team:opacity-100 transition-opacity cursor-pointer"
                      title="Move to Available"
                      onClick={() => unassign(user.id)}
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Available (unassigned) */}
            {unselected.length > 0 && (
              <>
                <div className="px-2 pt-2 text-left text-[10px] uppercase tracking-wide text-gray-500">Available</div>
                <div className="flex flex-col gap-1 text-[11px] select-none">
                  {unselected.map((user) => {
                    const avatarColor = getAvatarColor(user);
                    const initials = getAvatarInitials(user.name);
                    return (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => assign(user.id)}
                        className={TOKENS.taskRow.popoverItem}
                      >
                        <div className={TOKENS.taskRow.avatar} style={{ background: avatarColor }}>{initials}</div>
                        <span className="flex-1 text-left text-[11px] text-gray-800">{user.name}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
