import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Project } from './types';
import { useRoleAwareNavigation } from '@/hooks/useRoleAwareNavigation';

interface SortableProjectRowProps {
  project: Project;
  allowDrag: boolean;
  index: number;
  isPriorityView: boolean;
  workspaceId: string;
  onOpenFocusList: (project: Project, anchorRef: React.RefObject<HTMLElement>) => void;
  onUpdateStatus: (projectId: string, newStatus: Project['stage']) => void;
}

export const SortableProjectRow: React.FC<SortableProjectRowProps> = ({
  project,
  allowDrag,
  index,
  isPriorityView,
  workspaceId,
  onOpenFocusList,
  onUpdateStatus,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: project.id, disabled: !allowDrag });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="min-w-0" data-id={project.id}>
      <ProjectRowContent
        project={project}
        allowDrag={allowDrag}
        listeners={allowDrag ? listeners : {}}
        attributes={allowDrag ? attributes : {}}
        isDragging={isDragging}
        index={index}
        isPriorityView={isPriorityView}
        workspaceId={workspaceId}
        onOpenFocusList={onOpenFocusList}
        onUpdateStatus={onUpdateStatus}
      />
    </div>
  );
};

export interface ProjectRowContentProps {
  project: Project;
  allowDrag: boolean;
  listeners: any;
  attributes: any;
  isDragging: boolean;
  index: number;
  isPriorityView: boolean;
  workspaceId: string;
  onOpenFocusList: (project: Project, anchorRef: React.RefObject<HTMLElement>) => void;
  onUpdateStatus: (projectId: string, newStatus: Project['stage']) => void;
}

export const ProjectRowContent: React.FC<ProjectRowContentProps> = ({
  project,
  allowDrag,
  listeners,
  attributes,
  isDragging,
  index,
  isPriorityView,
  workspaceId,
  onOpenFocusList,
  onUpdateStatus,
}) => {
  const { navigateToWorkspace } = useRoleAwareNavigation(workspaceId);
  const [statusPopoverOpen, setStatusPopoverOpen] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState<{ top: number; left: number } | null>(null);
  const statusButtonRef = useRef<HTMLButtonElement>(null);
  const nextMilestoneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (statusPopoverOpen && statusButtonRef.current) {
      const rect = statusButtonRef.current.getBoundingClientRect();
      // Position above the button with margin
      setPopoverPosition({
        top: rect.top,
        left: rect.left,
      });
    } else {
      setPopoverPosition(null);
    }
  }, [statusPopoverOpen]);

  const handlePointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    const isButton = target.tagName === 'BUTTON' || target.closest('button');
    
    console.log('🖱️ Pointer Down:', {
      allowDrag,
      target: target.tagName,
      isButton,
      hasListeners: !!listeners?.onPointerDown,
      projectId: project.id,
    });
    
    // Don't start drag if clicking on a button
    if (isButton) {
      console.log('🚫 Blocked drag - clicked on button');
      e.stopPropagation();
      return;
    }
    
    // Allow drag to proceed by calling the original listener
    if (listeners?.onPointerDown) {
      console.log('✅ Allowing drag to proceed');
      listeners.onPointerDown(e as any);
    } else {
      console.warn('⚠️ No drag listeners available');
    }
  };

  return (
    <div
      className={`
        flex items-center gap-2 px-3 py-2.5
        bg-white border border-neutral-100 rounded-lg
        shadow-sm ${isPriorityView ? 'hover:shadow-md' : ''}
        hover:bg-neutral-50/50
        transition-shadow
        min-w-0 w-full
        ${allowDrag ? 'cursor-grab active:cursor-grabbing' : ''}
      `}
      {...(allowDrag ? { ...attributes, ...listeners, onPointerDown: handlePointerDown } : {})}
    >
      {/* Order number */}
      <div className="flex-shrink-0 w-5 flex items-center justify-center">
        <span className="text-xs text-neutral-400 font-medium">
          {index + 1}
        </span>
      </div>

      {/* Project name and status */}
      <div className="flex-1 min-w-0 relative flex flex-col justify-center">
        <button
          ref={statusButtonRef}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setStatusPopoverOpen(!statusPopoverOpen);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="text-xs text-neutral-500 hover:text-neutral-700 transition-colors hover:bg-neutral-100/50 rounded px-1 -mx-1 mb-0.5 text-left leading-tight cursor-pointer w-fit"
        >
          {project.stage}
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            // Disabled temporarily - routing needs reorganization
            console.log('Project navigation disabled:', project.name);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="text-sm font-medium text-neutral-900 truncate leading-tight text-left hover:text-neutral-700 transition-colors cursor-pointer w-fit"
        >
          {project.name}
        </button>

        {/* Status Popover */}
        {statusPopoverOpen && popoverPosition && createPortal(
          <>
            <div
              className="fixed inset-0 z-[30]"
              onClick={() => setStatusPopoverOpen(false)}
            />
            <div
              className="fixed z-[40]"
              style={{
                top: `${popoverPosition.top}px`,
                left: `${popoverPosition.left}px`,
                transform: 'translateY(calc(-100% - 4px))',
              }}
            >
              <div className="rounded-md border border-neutral-200 bg-white shadow-lg overflow-hidden py-1 flex flex-col">
                {(() => {
                  // Use the same order as database sorting: Pre-Design, Design, Permit, Build
                  const statusOrder: Record<'Pre-Design' | 'Design' | 'Permit' | 'Build', number> = {
                    'Pre-Design': 1,
                    'Design': 2,
                    'Permit': 3,
                    'Build': 4,
                  };
                  const statuses = [...(['Pre-Design', 'Design', 'Permit', 'Build'] as const)].sort(
                    (a, b) => statusOrder[a] - statusOrder[b]
                  );
                  return statuses.map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpdateStatus(project.id, status);
                        setStatusPopoverOpen(false);
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                      className={`
                        w-full text-left px-2.5 py-1.5 text-[10px] sm:text-xs whitespace-nowrap
                        transition-colors
                        ${
                          project.stage === status
                            ? 'bg-neutral-100 text-neutral-900 font-medium'
                            : 'text-neutral-700 hover:bg-neutral-50'
                        }
                      `}
                    >
                      {status}
                    </button>
                  ));
                })()}
              </div>
            </div>
          </>,
          document.body
        )}
      </div>

      {/* Next milestone */}
      <div 
        ref={nextMilestoneRef}
        className="w-40 flex-shrink-0 flex items-center min-w-0"
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenFocusList(project, nextMilestoneRef);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="w-full text-right hover:bg-neutral-100/50 rounded-md px-2 py-1 -mx-2 -my-1 transition-colors cursor-pointer"
        >
          {project.nextLabel ? (
            <>
              <p className="text-[11px] text-neutral-500 uppercase tracking-wide mb-0.5 leading-tight text-right">
                Next:
              </p>
              <p className="text-xs text-neutral-900 font-medium truncate leading-tight text-right">
                {project.nextLabel}
              </p>
            </>
          ) : (
            <p className="text-xs text-neutral-400 italic leading-tight text-right">
              Nothing to do
            </p>
          )}
        </button>
      </div>
    </div>
  );
};
