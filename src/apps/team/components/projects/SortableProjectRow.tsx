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
  cardColor?: 'default' | 'red' | 'yellow';
  onOpenFocusList: (project: Project, anchorRef: React.RefObject<HTMLElement>) => void;
  onUpdateStatus: (projectId: string, newStatus: Project['stage']) => void;
  onChangeColor?: (projectId: string, color: 'default' | 'red' | 'yellow') => void;
}

export const SortableProjectRow: React.FC<SortableProjectRowProps> = ({
  project,
  allowDrag,
  index,
  isPriorityView,
  workspaceId,
  cardColor = 'default',
  onOpenFocusList,
  onUpdateStatus,
  onChangeColor,
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
        cardColor={cardColor}
        onOpenFocusList={onOpenFocusList}
        onUpdateStatus={onUpdateStatus}
        onChangeColor={onChangeColor}
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
  cardColor?: 'default' | 'red' | 'yellow';
  onOpenFocusList: (project: Project, anchorRef: React.RefObject<HTMLElement>) => void;
  onUpdateStatus: (projectId: string, newStatus: Project['stage']) => void;
  onChangeColor?: (projectId: string, color: 'default' | 'red' | 'yellow') => void;
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
  cardColor = 'default',
  onOpenFocusList,
  onUpdateStatus,
  onChangeColor,
}) => {
  const { navigateToWorkspace } = useRoleAwareNavigation(workspaceId);
  const [statusPopoverOpen, setStatusPopoverOpen] = useState(false);
  const [colorPopoverOpen, setColorPopoverOpen] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState<{ top: number; left: number } | null>(null);
  const [colorPopoverPosition, setColorPopoverPosition] = useState<{ top: number; left: number } | null>(null);
  const statusButtonRef = useRef<HTMLButtonElement>(null);
  const colorButtonRef = useRef<HTMLButtonElement>(null);
  const nextMilestoneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updatePosition = () => {
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
    };

    updatePosition();

    if (statusPopoverOpen) {
      // Update position on scroll to keep popover aligned
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [statusPopoverOpen]);

  useEffect(() => {
    const updateColorPosition = () => {
      if (colorPopoverOpen && colorButtonRef.current) {
        const rect = colorButtonRef.current.getBoundingClientRect();
        setColorPopoverPosition({
          top: rect.bottom,
          left: rect.left,
        });
      } else {
        setColorPopoverPosition(null);
      }
    };

    updateColorPosition();

    if (colorPopoverOpen) {
      window.addEventListener('scroll', updateColorPosition, true);
      window.addEventListener('resize', updateColorPosition);
      return () => {
        window.removeEventListener('scroll', updateColorPosition, true);
        window.removeEventListener('resize', updateColorPosition);
      };
    }
  }, [colorPopoverOpen]);

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

  const colorClasses =
    cardColor === 'red'
      ? 'bg-rose-50 border-rose-200 hover:bg-rose-100/50'
      : cardColor === 'yellow'
      ? 'bg-amber-50 border-amber-200 hover:bg-amber-100/50'
      : 'bg-white border-neutral-100 hover:bg-neutral-50/50';

  return (
    <div
      className={`
        flex items-center gap-2 px-3 py-2.5
        rounded-lg
        shadow-sm ${isPriorityView ? 'hover:shadow-md' : ''}
        transition-all
        min-w-0 w-full
        ${colorClasses}
        ${allowDrag ? 'cursor-grab active:cursor-grabbing' : ''}
      `}
      {...(allowDrag ? { ...attributes, ...listeners, onPointerDown: handlePointerDown } : {})}
    >
      {/* Order number with color popover trigger */}
      <div className="flex-shrink-0 w-5 flex items-center justify-center relative">
        <button
          ref={colorButtonRef}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setColorPopoverOpen(!colorPopoverOpen);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="inline-flex items-center justify-center w-6 h-6 text-xs text-neutral-500 font-medium rounded-full hover:bg-neutral-100 transition-colors cursor-pointer"
        >
          {index + 1}
        </button>

        {/* Color Popover */}
        {colorPopoverOpen && colorPopoverPosition && createPortal(
          <>
            <div
              className="fixed inset-0 z-[30]"
              onClick={() => setColorPopoverOpen(false)}
            />
            <div
              className="fixed z-[40]"
              style={{
                top: `${colorPopoverPosition.top}px`,
                left: `${colorPopoverPosition.left}px`,
                transform: 'translateY(4px)',
              }}
            >
              <div className="w-44 rounded-md border border-neutral-200 bg-white shadow-lg overflow-hidden py-1">
                {[
                  { key: 'default', label: 'Default' },
                  { key: 'red', label: 'Red' },
                  { key: 'yellow', label: 'Yellow' },
                ].map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onChangeColor && onChangeColor(project.id, option.key as 'default' | 'red' | 'yellow');
                      setColorPopoverOpen(false);
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    className={`
                      w-full text-left px-3 py-1.5 text-xs flex items-center gap-2
                      hover:bg-neutral-50 transition-colors
                      ${
                        cardColor === option.key
                          ? 'bg-neutral-100 text-neutral-900 font-medium'
                          : 'text-neutral-700'
                      }
                    `}
                  >
                    <span
                      className={`
                        w-3 h-3 rounded-full border border-neutral-200 flex-shrink-0
                        ${
                          option.key === 'red'
                            ? 'bg-rose-400 border-rose-500'
                            : ''
                        }
                        ${
                          option.key === 'yellow'
                            ? 'bg-amber-300 border-amber-400'
                            : ''
                        }
                      `}
                    />
                    <span>{option.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </>,
          document.body
        )}
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
