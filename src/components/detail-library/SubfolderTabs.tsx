import { useState } from 'react';
import { Folder, Plus, Trash } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DetailLibrarySubfolder } from '@/lib/api/types';
import { useDeleteDetailLibrarySubfolder } from '@/lib/api/hooks/useDetailLibrary';
import CreateSubfolderDialog from './CreateSubfolderDialog';

interface SubfolderTabsProps {
  subfolders: DetailLibrarySubfolder[];
  selectedSubfolderId: string | null | 'all';
  onSelectSubfolder: (subfolderId: string | null | 'all') => void;
  workspaceId: string;
  categoryId: string;
}

export default function SubfolderTabs({
  subfolders,
  selectedSubfolderId,
  onSelectSubfolder,
  workspaceId,
  categoryId,
}: SubfolderTabsProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const deleteMutation = useDeleteDetailLibrarySubfolder();

  const handleDelete = async (subfolderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this subfolder? (Must be empty)')) {
      await deleteMutation.mutateAsync({ subfolderId });
      if (selectedSubfolderId === subfolderId) {
        onSelectSubfolder('all');
      }
    }
  };

  return (
    <>
      <div className="flex flex-wrap gap-2 mb-6">
        {/* All tab */}
        <button
          onClick={() => onSelectSubfolder('all')}
          className={cn(
            "inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm transition-all",
            selectedSubfolderId === 'all'
              ? "border-black/10 bg-white shadow-sm dark:bg-neutral-900"
              : "border-black/10 bg-neutral-50 hover:bg-white dark:bg-neutral-800/50 dark:hover:bg-neutral-800"
          )}
        >
          <Folder className="h-4 w-4 opacity-70" />
          <span>All</span>
        </button>

        {/* Root files tab (no subfolder) */}
        <button
          onClick={() => onSelectSubfolder(null)}
          className={cn(
            "inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm transition-all",
            selectedSubfolderId === null
              ? "border-black/10 bg-white shadow-sm dark:bg-neutral-900"
              : "border-black/10 bg-neutral-50 hover:bg-white dark:bg-neutral-800/50 dark:hover:bg-neutral-800"
          )}
        >
          <Folder className="h-4 w-4 opacity-70" />
          <span>Root</span>
        </button>

        {/* Subfolder tabs */}
        {subfolders.map((subfolder) => (
          <button
            key={subfolder.id}
            onClick={() => onSelectSubfolder(subfolder.id)}
            className={cn(
              "group inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm transition-all relative",
              selectedSubfolderId === subfolder.id
                ? "border-black/10 bg-white shadow-sm dark:bg-neutral-900"
                : "border-black/10 bg-neutral-50 hover:bg-white dark:bg-neutral-800/50 dark:hover:bg-neutral-800"
            )}
          >
            <Folder className="h-4 w-4 opacity-70" />
            <span>{subfolder.name}</span>
            <button
              onClick={(e) => handleDelete(subfolder.id, e)}
              className="ml-1 p-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/20 transition-opacity"
              aria-label="Delete subfolder"
            >
              <Trash className="h-3 w-3 text-red-600 dark:text-red-400" />
            </button>
          </button>
        ))}

        {/* Create new subfolder button */}
        <button
          onClick={() => setCreateDialogOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl border border-dashed border-black/20 px-4 py-2 text-sm transition-all hover:border-black/40 hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
        >
          <Plus className="h-4 w-4 opacity-70" />
          <span>New Subfolder</span>
        </button>
      </div>

      <CreateSubfolderDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        workspaceId={workspaceId}
        categoryId={categoryId}
      />
    </>
  );
}
