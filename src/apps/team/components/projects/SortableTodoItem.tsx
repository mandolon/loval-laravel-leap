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

export const SortableTodoItem: React.FC<SortableTodoItemProps> = ({
  todo,
  onToggle,
  onDelete,
  onUpdate,
}) => {
  const [isEditing, setIsEditing] = React.useState(todo.isEditing || false);
  const [editText, setEditText] = React.useState(todo.text);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

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

  const handleSave = () => {
    if (editText.trim()) {
      onUpdate(todo.id, editText.trim());
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditText(todo.text);
      setIsEditing(false);
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
        <input
          ref={inputRef}
          type="text"
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className="text-xs flex-1 bg-transparent border-none outline-none focus:outline-none text-neutral-900"
        />
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
        onClick={() => onDelete(todo.id)}
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
