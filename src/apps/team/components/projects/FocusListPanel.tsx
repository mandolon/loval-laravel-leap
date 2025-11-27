import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { restrictToVerticalAxis, restrictToParentElement } from '@dnd-kit/modifiers';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { SortableTodoItem } from './SortableTodoItem';
import { Project, ProjectTodo } from './types';

interface FocusListPanelProps {
  project: Project;
  todos: ProjectTodo[];
  onClose: () => void;
  onAddTodo: () => void;
  onToggleTodo: (todoId: string) => void;
  onDeleteTodo: (todoId: string) => void;
  onUpdateTodo: (todoId: string, newText: string) => void;
  onReorderTodos: (todos: ProjectTodo[]) => void;
  anchorRef: React.RefObject<HTMLElement>;
}

const POPOVER_WIDTH = 280;
const POPOVER_GAP = 12;

export const FocusListPanel: React.FC<FocusListPanelProps> = ({
  project,
  todos,
  onClose,
  onAddTodo,
  onToggleTodo,
  onDeleteTodo,
  onUpdateTodo,
  onReorderTodos,
  anchorRef,
}) => {
  const [popoverPosition, setPopoverPosition] = React.useState<{ top: number; left: number } | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  // Calculate popover position
  useEffect(() => {
    if (anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      const leftPos = rect.right + window.scrollX + POPOVER_GAP;
      const topPos = rect.top + window.scrollY + rect.height / 2;
      setPopoverPosition({
        top: topPos,
        left: leftPos,
      });
    }
  }, [anchorRef]);

  // Close on outside click
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        anchorRef.current && !anchorRef.current.contains(target) &&
        popoverRef.current && !popoverRef.current.contains(target)
      ) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [anchorRef, onClose]);

  const handleTodoDragEnd = (event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = todos.findIndex((t) => t.id === active.id);
    const newIndex = todos.findIndex((t) => t.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reorderedTodos = arrayMove(todos, oldIndex, newIndex);
    onReorderTodos(reorderedTodos);
  };

  if (!popoverPosition) return null;

  return createPortal(
    <>
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
        .focus-popover-enter {
          animation: popoverSlideIn 180ms cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>

      <div
        ref={popoverRef}
        className="focus-popover-enter fixed rounded-lg border border-neutral-200 bg-white shadow-lg overflow-visible"
        style={{
          top: `${popoverPosition.top}px`,
          left: `${popoverPosition.left}px`,
          width: `${POPOVER_WIDTH}px`,
          transform: 'translateY(-50%)',
          zIndex: 9999,
        }}
      >
        {/* Pointer arrow - left middle pointing left to project */}
        <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-white border border-neutral-200 border-r-transparent border-t-transparent rotate-45" />

        {/* Focus List Header */}
        <div className="flex items-center justify-between gap-3 px-3 py-2 border-b border-neutral-100 bg-white rounded-t-lg">
          <h3 className="text-xs font-semibold text-neutral-700">Focus List</h3>
          <button
            type="button"
            onClick={onAddTodo}
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-neutral-100 text-neutral-500 hover:text-neutral-700 transition-colors"
            title="Add task"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M6 1v10M1 6h10" />
            </svg>
          </button>
        </div>

        {/* Todo List */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleTodoDragEnd}
          modifiers={[restrictToVerticalAxis, restrictToParentElement]}
        >
          <SortableContext items={todos.map((t) => t.id)} strategy={verticalListSortingStrategy}>
            <div className="divide-y divide-neutral-50 max-h-[400px] overflow-y-auto">
              {todos.length === 0 ? (
                <div className="px-3 py-6 text-center">
                  <p className="text-xs text-neutral-400">No to-do's yet</p>
                </div>
              ) : (
                todos.map((todo) => (
                  <SortableTodoItem
                    key={todo.id}
                    todo={todo}
                    onToggle={onToggleTodo}
                    onDelete={onDeleteTodo}
                    onUpdate={onUpdateTodo}
                  />
                ))
              )}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </>,
    document.body
  );
};
