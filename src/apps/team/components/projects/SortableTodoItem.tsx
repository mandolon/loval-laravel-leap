import React, { useEffect, useRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ProjectTodo } from './types';

interface SortableTodoItemProps {
  todo: ProjectTodo;
  onToggle: (todoId: string) => void;
  onDelete: (todoId: string) => void;
  onUpdate: (todoId: string, newText: string) => void;
}

const MAX_TODO_LENGTH = 25;

export const SortableTodoItem: React.FC<SortableTodoItemProps> = ({
  todo,
  onToggle,
  onDelete,
  onUpdate,
}) => {
  const [isEditing, setIsEditing] = React.useState(todo.isEditing || false);
  const [editText, setEditText] = React.useState(todo.text);
  const [showMaxLengthTooltip, setShowMaxLengthTooltip] = React.useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const tooltipTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    return () => {
      if (tooltipTimeoutRef.current) {
        window.clearTimeout(tooltipTimeoutRef.current);
      }
    };
  }, []);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: todo.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const showMaxTooltip = () => {
    if (tooltipTimeoutRef.current) {
      window.clearTimeout(tooltipTimeoutRef.current);
    }
    setShowMaxLengthTooltip(true);
    tooltipTimeoutRef.current = window.setTimeout(() => setShowMaxLengthTooltip(false), 1600);
  };

  const handleEditChange = (value: string) => {
    if (value.length >= MAX_TODO_LENGTH) {
      setEditText(value.slice(0, MAX_TODO_LENGTH));
      showMaxTooltip();
      return;
    }
    setShowMaxLengthTooltip(false);
    setEditText(value);
  };

  const handleSave = () => {
    const trimmed = editText.trim().slice(0, MAX_TODO_LENGTH);
    setShowMaxLengthTooltip(false);
    if (trimmed) {
      onUpdate(todo.id, trimmed);
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      // If this is a new unsaved todo, delete it instead of reverting
      if (todo.text === 'New to-do' && editText === 'New to-do') {
        onDelete(todo.id);
      } else {
        setEditText(todo.text);
        setIsEditing(false);
      }
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group flex items-center gap-2 px-3 py-2 hover:bg-neutral-50 transition-colors bg-white"
    >
      <div
        className="flex-shrink-0 cursor-grab active:cursor-grabbing text-neutral-300 hover:text-neutral-400 transition-colors"
        {...listeners}
        {...attributes}
      >
        <svg width="8" height="12" viewBox="0 0 8 12" fill="currentColor">
          <circle cx="2" cy="2" r="1" />
          <circle cx="6" cy="2" r="1" />
          <circle cx="2" cy="6" r="1" />
          <circle cx="6" cy="6" r="1" />
          <circle cx="2" cy="10" r="1" />
          <circle cx="6" cy="10" r="1" />
        </svg>
      </div>
      <button
        type="button"
        onClick={() => onToggle(todo.id)}
        className="flex-shrink-0 w-3.5 h-3.5 rounded border border-neutral-300 hover:border-neutral-400 transition-colors flex items-center justify-center"
      >
        {todo.completed && (
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
            <path
              d="M1 4l2 2 4-5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>
      {isEditing ? (
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={editText}
            maxLength={MAX_TODO_LENGTH}
            onChange={(e) => handleEditChange(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className="text-xs w-full bg-transparent border-none outline-none focus:outline-none text-neutral-900"
          />
          {showMaxLengthTooltip && (
            <div className="absolute right-0 -top-2 -translate-y-full flex flex-col items-end">
              <div className="px-2 py-1 rounded bg-neutral-800 text-white text-[10px] leading-tight shadow-md whitespace-nowrap">
                Max 25 characters reached
              </div>
              <div className="h-0 w-0 border-x-4 border-x-transparent border-t-4 border-t-neutral-800" />
            </div>
          )}
        </div>
      ) : (
        <p
          className={`text-xs flex-1 ${
            todo.completed ? 'text-neutral-400 line-through' : 'text-neutral-700'
          }`}
          onDoubleClick={() => setIsEditing(true)}
        >
          {todo.text}
        </p>
      )}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(todo.id);
        }}
        className="flex-shrink-0 w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-neutral-600 transition-all cursor-pointer"
        title="Delete task"
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M1 1l8 8M9 1L1 9" />
        </svg>
      </button>
    </div>
  );
};
