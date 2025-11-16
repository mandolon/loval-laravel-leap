import { useEffect, useRef, useState } from 'react';
import { Annotation } from '../types/annotation';
import { X } from 'lucide-react';

interface AnnotationInputProps {
  annotation: Annotation;
  onSave: (id: string, text: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  position: { x: number; y: number };
}

export const AnnotationInput = ({
  annotation,
  onSave,
  onDelete,
  onClose,
  position,
}: AnnotationInputProps) => {
  const [text, setText] = useState(annotation.text);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus input when component mounts
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, []);

  const handleSave = () => {
    if (text.trim()) {
      onSave(annotation.id, text.trim());
    } else {
      // If empty, delete the annotation
      onDelete(annotation.id);
    }
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const handleBlur = () => {
    // Small delay to allow click events to fire first
    setTimeout(() => {
      handleSave();
    }, 200);
  };

  return (
    <div
      className="fixed z-50 bg-card border border-border rounded-md shadow-lg p-2"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-50%, -100%)',
        marginTop: '-8px',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder="Enter note..."
          className="flex-1 px-2 py-1 text-[11px] bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary min-w-[200px]"
        />
        <button
          onClick={() => {
            onDelete(annotation.id);
            onClose();
          }}
          className="h-6 w-6 flex items-center justify-center rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
          title="Delete annotation"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
      <div className="text-[9px] text-muted-foreground mt-1 px-1">
        Press Enter to save, Esc to cancel
      </div>
    </div>
  );
};

