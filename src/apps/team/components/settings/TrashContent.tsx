import { useState, useMemo } from 'react';
import { Search as SearchIcon, Filter, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { SETTINGS_CONSTANTS } from '../../lib/settings-constants';
import { useTrashItems } from '@/hooks/useTrashItems';
import { useWorkspaces } from '@/hooks/useWorkspaces';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { TrashItem } from '@/hooks/useTrashItems';

export function TrashContent() {
  const { currentWorkspace } = useWorkspaces();
  const { items, isLoading, restore, deleteForever, isRestoring, isDeleting } = useTrashItems(currentWorkspace?.id);
  const [searchQuery, setSearchQuery] = useState('');
  const [itemToDelete, setItemToDelete] = useState<TrashItem | null>(null);

  const filteredRows = useMemo(() => {
    if (!searchQuery) return items;
    const query = searchQuery.toLowerCase();
    return items.filter(item => 
      item.name.toLowerCase().includes(query) ||
      item.typeLabel.toLowerCase().includes(query) ||
      item.location.toLowerCase().includes(query)
    );
  }, [items, searchQuery]);

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch {
      return dateString;
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4 text-[var(--muted)]" data-testid="trash-content">
      <div className="flex items-center justify-between">
        <h2 className="text-[var(--text)] text-lg font-medium">Trash</h2>
        <div />
      </div>
      
      <p className="text-[var(--muted)] text-sm">
        Items shown below will be automatically deleted forever after 30 days.
      </p>

      {/* Search Bar */}
      <div className="flex items-center gap-2 max-w-[520px]">
        <div className="relative flex-1">
          <input
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 rounded-md border border-slate-300 pl-8 pr-2 text-sm"
          />
          <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted)]" />
        </div>
        <button className="h-9 w-10 rounded-md border border-slate-300 grid place-items-center">
          <Filter className="h-4 w-4 text-[var(--muted)]" />
        </button>
      </div>

      {/* Unified Table */}
      <div className="rounded-lg border border-slate-200 overflow-hidden">
        {/* Table Header */}
        <div
          data-testid="trash-header"
          className="items-center gap-2 px-3 h-10 text-[12px] text-[var(--muted)] bg-slate-50 border-b border-slate-200 grid"
          style={{ gridTemplateColumns: SETTINGS_CONSTANTS.TRASH_COLS }}
        >
          <div>NAME</div>
          <div>TYPE</div>
          <div>PROJECT</div>
          <div>LOCATION</div>
          <div>DELETED ON</div>
          <div>DELETED BY</div>
          <div>ACTIONS</div>
        </div>

        {/* Table Rows */}
        {isLoading ? (
          <div className="px-3 py-6 text-sm text-[var(--muted)] text-center">Loading deleted items...</div>
        ) : filteredRows.length ? (
          filteredRows.map((row, i) => (
            <div
              key={`${row.type}:${row.id}`}
              data-testid={i === 0 ? 'trash-row' : undefined}
              className={`items-center gap-2 px-3 h-11 text-[13px] text-[var(--text)] grid ${
                i ? 'border-t border-slate-200' : ''
              }`}
              style={{ gridTemplateColumns: SETTINGS_CONSTANTS.TRASH_COLS }}
            >
              <div className="truncate">{row.name}</div>
              <div className="truncate">{row.typeLabel}</div>
              <div className="truncate">{row.projectName}</div>
              <div className="truncate">{row.location}</div>
              <div>{formatDate(row.deleted_at)}</div>
              <div>{row.deleted_by_name}</div>
              <div className="flex items-center gap-2">
                {/* Restore Button */}
                <button
                  onClick={() => restore(row)}
                  disabled={isRestoring || isDeleting}
                  aria-label="Restore"
                  className="h-7 w-7 grid place-items-center rounded-md bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="14"
                    height="14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M3 12a9 9 0 1 0 3-6.7" />
                    <path d="M3 3v6h6" />
                  </svg>
                </button>

                {/* Delete Forever Button */}
                <button
                  onClick={() => setItemToDelete(row)}
                  disabled={isRestoring || isDeleting}
                  aria-label="Delete forever"
                  className="h-7 w-7 grid place-items-center rounded-md bg-red-500 hover:bg-red-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="px-3 py-6 text-sm text-[var(--muted)]">
            {searchQuery ? 'No items match your search.' : 'No deleted items.'}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!itemToDelete} onOpenChange={() => setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete "{itemToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (itemToDelete) {
                  deleteForever(itemToDelete);
                  setItemToDelete(null);
                }
              }}
              className="bg-red-500 hover:bg-red-600"
            >
              Delete Forever
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
