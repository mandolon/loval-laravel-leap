import React from 'react';
import { FileText, Image as ImageIcon, MoreHorizontal } from 'lucide-react';
import { FileItem, cardBadgeLabel, footerMeta, clsx, colorMap } from '@/lib/detail-library-utils';

interface CardButtonProps {
  file: FileItem;
  parentFolderId: string;
  onClick: () => void;
  onOpenEdit: (file: FileItem, folderId: string) => void;
  folderCount: number;
}

const CardButton: React.FC<CardButtonProps> = ({
  file,
  parentFolderId,
  onClick,
  onOpenEdit,
  folderCount,
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
        "group relative h-full flex flex-col text-left rounded-3xl p-3 md:p-4 transition-shadow border border-black/5 shadow-sm",
        colorMap[file.color]
      )}
    >
      {/* Hover 3-dot menu -> opens modal */}
      <div className="absolute top-2 right-2 transition opacity-0 group-hover:opacity-100">
        <button
          aria-label="Card menu"
          className="p-1.5 rounded-md hover:bg-white/60 transition-all duration-200 flex items-center justify-center"
          onClick={(e) => {
            e.stopPropagation();
            onOpenEdit(file, parentFolderId);
          }}
        >
          <MoreHorizontal className="h-4 w-4 rotate-90 pointer-events-none" />
        </button>
      </div>

      <div className="flex items-center gap-2 text-xs opacity-80 min-h-[20px]">
        {file.type === "pdf" ? (
          <FileText className="h-4 w-4" />
        ) : (
          <ImageIcon className="h-4 w-4" />
        )}
        <span>{cardBadgeLabel(file.type)}</span>
      </div>

      <div className="mt-auto leading-[1.1] min-h-[2.5rem] md:min-h-[3rem] flex flex-col justify-end">
        <h3 className="text-lg md:text-xl font-semibold tracking-tight text-neutral-800 dark:text-neutral-200">
          {file.title.split(" ").slice(0, 2).join(" ")}
        </h3>
        <p className="text-lg md:text-xl font-semibold tracking-tight text-neutral-800 dark:text-neutral-200 min-h-[1.25rem] md:min-h-[1.5rem]">
          {file.title.split(" ").slice(2).join(" ")}
        </p>
      </div>

      <div className="mt-2 flex items-center justify-between text-xs opacity-80">
        <span>{footerMeta(file)}</span>
        <span className="opacity-80">{folderCount} files</span>
      </div>
    </div>
  );
};

export default CardButton;
