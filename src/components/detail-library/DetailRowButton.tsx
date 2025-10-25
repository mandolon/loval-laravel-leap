import React from 'react';
import { FileText, Image as ImageIcon, Trash } from 'lucide-react';
import { DetailItem, avatarInitials, clsx } from '@/lib/detail-library-utils';

interface DetailRowButtonProps {
  detail: DetailItem;
  active: boolean;
  onClick: () => void;
  onDelete?: () => void;
}

const DetailRowButton: React.FC<DetailRowButtonProps> = ({ 
  detail, 
  active, 
  onClick, 
  onDelete 
}) => {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { 
        if (e.key === "Enter" || e.key === " ") { 
          e.preventDefault(); 
          onClick(); 
        } 
      }}
      className={clsx(
        "group relative w-full flex items-center gap-3 rounded-xl border px-2.5 py-2 text-left transition-colors",
        active
          ? "bg-neutral-50 dark:bg-neutral-800/60 border-black/10"
          : "hover:bg-neutral-50 dark:hover:bg-neutral-800/40 border-black/10"
      )}
    >
      <div className="h-10 w-8 rounded-md border border-dashed border-black/10 bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center shrink-0">
        {detail.type === "pdf" ? (
          <FileText className="h-4 w-4 opacity-70" />
        ) : (
          <ImageIcon className="h-4 w-4 opacity-70" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{detail.title}</div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div
            className="h-5 w-5 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-[10px] font-medium text-neutral-700 dark:text-neutral-200"
            title={detail.author}
            aria-label={`Author ${detail.author}`}
          >
            {avatarInitials(detail.author)}
          </div>
          <span className="truncate">{detail.type.toUpperCase()} • {detail.size} • {detail.updated}</span>
        </div>
      </div>
      {/* Hover delete */}
      <button
        aria-label="Delete"
        onClick={(e) => { 
          e.stopPropagation(); 
          onDelete?.(); 
        }}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md opacity-0 group-hover:opacity-100 transition border border-black/10 bg-white/80 hover:bg-white dark:bg-neutral-900/70"
      >
        <Trash className="h-4 w-4 opacity-70" />
      </button>
    </div>
  );
};

export default DetailRowButton;
