import React, { useState, useRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Project } from './types';

interface SortableProjectRowProps {
  project: Project;
  allowDrag: boolean;
  index: number;
  onOpenFocusList: (project: Project, anchorRef: React.RefObject<HTMLElement>) => void;
  onUpdateStatus: (projectId: string, newStatus: Project['stage']) => void;
}

export const SortableProjectRow: React.FC<SortableProjectRowProps> = ({
  project,
  allowDrag,
  index,
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
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="group relative mb-2 last:mb-0">
      <ProjectRowContent
        project={project}
        allowDrag={allowDrag}
        listeners={allowDrag ? listeners : {}}
        attributes={allowDrag ? attributes : {}}
        isDragging={isDragging}
        index={index}
        onOpenFocusList={onOpenFocusList}
        onUpdateStatus={onUpdateStatus}
      />
    </div>
  );
};

interface ProjectRowContentProps {
  project: Project;
  allowDrag: boolean;
  listeners: any;
  attributes: any;
  isDragging: boolean;
  index: number;
  onOpenFocusList: (project: Project, anchorRef: React.RefObject<HTMLElement>) => void;
  onUpdateStatus: (projectId: string, newStatus: Project['stage']) => void;
}

const ProjectRowContent: React.FC<ProjectRowContentProps> = ({
  project,
  allowDrag,
  listeners,
  attributes,
  isDragging,
  index,
  onOpenFocusList,
  onUpdateStatus,
}) => {
  const [statusPopoverOpen, setStatusPopoverOpen] = useState(false);
  const statusButtonRef = useRef<HTMLButtonElement>(null);
  const nextMilestoneRef = useRef<HTMLDivElement>(null);

  return (
    <div
      className={`
        flex items-center gap-2 sm:gap-4 px-3 sm:px-4 py-2 sm:py-3
        bg-white border border-neutral-100 rounded-lg
        shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:shadow-[0_1px_3px_rgba(0,0,0,0.08)]
        hover:bg-neutral-50/50
        transition-all
        ${isDragging ? 'bg-neutral-100 shadow-[0_2px_8px_rgba(0,0,0,0.12)]' : ''}
        ${allowDrag ? 'cursor-grab active:cursor-grabbing select-none' : 'cursor-default'}
      `}
      {...listeners}
      {...attributes}
    >
      {/* Order number */}
      <div className="flex-shrink-0 w-5 sm:w-6 flex items-center justify-center">
        <span className="text-[10px] sm:text-xs text-neutral-400 font-medium">
          {index + 1}
        </span>
      </div>

      {/* Project name and status - flex to take available space */}
      <div className="flex-1 min-w-0 relative flex flex-col justify-center max-w-[50%]">
        <button
          ref={statusButtonRef}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setStatusPopoverOpen(!statusPopoverOpen);
          }}
          className="text-[10px] sm:text-xs text-neutral-500 hover:text-neutral-700 transition-colors hover:bg-neutral-100/50 rounded px-1 -mx-1 mb-0.5 text-left leading-tight cursor-pointer w-fit"
        >
          {project.stage}
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            console.log('Project clicked:', project.name);
          }}
          className="text-xs sm:text-sm font-medium text-neutral-900 truncate leading-tight text-left hover:text-neutral-700 transition-colors cursor-pointer w-fit max-w-full"
        >
          {project.name}
        </button>

        {/* Status Popover */}
        {statusPopoverOpen && (
          <>
            <div
              className="fixed inset-0 z-[30]"
              onClick={() => setStatusPopoverOpen(false)}
            />
            <div className="absolute left-0 bottom-full mb-1 z-[40]">
              <div className="w-max rounded-md border border-neutral-200 bg-white shadow-lg overflow-hidden py-1">
                {(['Pre-Design', 'Design', 'Permit', 'Build'] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdateStatus(project.id, status);
                      setStatusPopoverOpen(false);
                    }}
                    className={`
                      w-full text-left px-3 py-1.5 text-[10px] sm:text-xs whitespace-nowrap
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
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Next milestone - responsive width */}
      <div 
        ref={nextMilestoneRef}
        className="w-32 sm:w-40 md:w-48 flex-shrink-0 flex items-center"
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenFocusList(project, nextMilestoneRef);
          }}
          className="w-full text-right hover:bg-neutral-100/50 rounded-md px-1.5 sm:px-2 py-1 -mx-1.5 sm:-mx-2 -my-1 transition-colors cursor-pointer"
        >
          {project.nextLabel ? (
            <>
              <p className="text-[9px] sm:text-[11px] text-neutral-500 uppercase tracking-wide mb-0.5 leading-tight text-right">
                Next:
              </p>
              <p className="text-[10px] sm:text-xs text-neutral-900 font-medium truncate leading-tight text-right">
                {project.nextLabel}
              </p>
            </>
          ) : (
            <p className="text-[10px] sm:text-xs text-neutral-400 italic leading-tight text-right">
              Nothing to do
            </p>
          )}
        </button>
      </div>
    </div>
  );
};
