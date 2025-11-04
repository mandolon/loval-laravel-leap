import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
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

const STORAGE_KEY = 'trash-table-column-widths';
const DEFAULT_COLUMN_WIDTHS = [200, 80, 140, 110, 120, 140, 160]; // NAME, TYPE, PROJECT, LOCATION, DELETED ON, DELETED BY, ACTIONS
const MIN_COLUMN_WIDTH = 60;
const MAX_COLUMN_WIDTH = 500;

export function TrashContent() {
  const { currentWorkspace } = useWorkspaces();
  const { items, isLoading, restore, deleteForever, isRestoring, isDeleting } = useTrashItems(currentWorkspace?.id);
  const [searchQuery, setSearchQuery] = useState('');
  const [itemToDelete, setItemToDelete] = useState<TrashItem | null>(null);
  
  // Initialize column widths from localStorage or defaults
  const [columnWidths, setColumnWidths] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === DEFAULT_COLUMN_WIDTHS.length) {
          return parsed;
        }
      }
    } catch {
      // Ignore errors, use defaults
    }
    return DEFAULT_COLUMN_WIDTHS;
  });

  // Resize state
  const [resizingColumnIndex, setResizingColumnIndex] = useState<number | null>(null);
  const resizeStartX = useRef<number>(0);
  const resizeStartWidths = useRef<number[]>([]);

  // Save column widths to localStorage
  const saveColumnWidths = useCallback((widths: number[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(widths));
    } catch {
      // Ignore errors
    }
  }, []);

  // Update column widths when they change
  useEffect(() => {
    saveColumnWidths(columnWidths);
  }, [columnWidths, saveColumnWidths]);

  // Handle resize start
  const handleResizeStart = useCallback((columnIndex: number, e: React.MouseEvent) => {
    e.preventDefault();
    setResizingColumnIndex(columnIndex);
    resizeStartX.current = e.clientX;
    resizeStartWidths.current = [...columnWidths];
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [columnWidths]);

  // Handle resize move
  useEffect(() => {
    if (resizingColumnIndex === null) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - resizeStartX.current;
      const newWidths = [...resizeStartWidths.current];
      
      // Resize the column on the left of the handle
      const leftColumnIndex = resizingColumnIndex;
      const rightColumnIndex = resizingColumnIndex + 1;
      
      if (leftColumnIndex >= 0 && rightColumnIndex < newWidths.length) {
        const maxLeftWidth = leftColumnIndex === 0 ? MAX_COLUMN_WIDTH : resizeStartWidths.current[leftColumnIndex] * 1.5;
        const newLeftWidth = Math.max(
          MIN_COLUMN_WIDTH,
          Math.min(
            maxLeftWidth,
            resizeStartWidths.current[leftColumnIndex] + deltaX
          )
        );
        const newRightWidth = Math.max(
          MIN_COLUMN_WIDTH,
          resizeStartWidths.current[rightColumnIndex] - deltaX
        );
        
        // Only update if both columns are within constraints
        if (newLeftWidth >= MIN_COLUMN_WIDTH && newRightWidth >= MIN_COLUMN_WIDTH) {
          newWidths[leftColumnIndex] = newLeftWidth;
          newWidths[rightColumnIndex] = newRightWidth;
          setColumnWidths(newWidths);
        }
      }
    };

    const handleMouseUp = () => {
      setResizingColumnIndex(null);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingColumnIndex]);

  // Generate grid template columns string
  const gridTemplateColumns = useMemo(() => {
    return columnWidths.map(width => `${width}px`).join(' ');
  }, [columnWidths]);

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
          className="items-center gap-2 px-3 h-10 text-[12px] text-[var(--muted)] bg-slate-50 border-b border-slate-200 grid relative"
          style={{ gridTemplateColumns: gridTemplateColumns }}
        >
          <div className="relative group">
            NAME
            {columnWidths.length > 1 && (
              <div
                className={`absolute right-0 top-0 bottom-0 cursor-col-resize bg-slate-300 hover:bg-slate-400 active:bg-slate-500 transition-all z-10 ${
                  resizingColumnIndex === 0 ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}
                style={{ transform: 'translateX(8px)', width: '4px' }}
                onMouseDown={(e) => handleResizeStart(0, e)}
              />
            )}
          </div>
          <div className="relative group">
            TYPE
            {columnWidths.length > 2 && (
              <div
                className={`absolute right-0 top-0 bottom-0 cursor-col-resize bg-slate-300 hover:bg-slate-400 active:bg-slate-500 transition-all z-10 ${
                  resizingColumnIndex === 1 ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}
                style={{ transform: 'translateX(8px)', width: '4px' }}
                onMouseDown={(e) => handleResizeStart(1, e)}
              />
            )}
          </div>
          <div className="relative group">
            PROJECT
            {columnWidths.length > 3 && (
              <div
                className={`absolute right-0 top-0 bottom-0 cursor-col-resize bg-slate-300 hover:bg-slate-400 active:bg-slate-500 transition-all z-10 ${
                  resizingColumnIndex === 2 ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}
                style={{ transform: 'translateX(8px)', width: '4px' }}
                onMouseDown={(e) => handleResizeStart(2, e)}
              />
            )}
          </div>
          <div className="relative group">
            LOCATION
            {columnWidths.length > 4 && (
              <div
                className={`absolute right-0 top-0 bottom-0 cursor-col-resize bg-slate-300 hover:bg-slate-400 active:bg-slate-500 transition-all z-10 ${
                  resizingColumnIndex === 3 ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}
                style={{ transform: 'translateX(8px)', width: '4px' }}
                onMouseDown={(e) => handleResizeStart(3, e)}
              />
            )}
          </div>
          <div className="relative group">
            DELETED ON
            {columnWidths.length > 5 && (
              <div
                className={`absolute right-0 top-0 bottom-0 cursor-col-resize bg-slate-300 hover:bg-slate-400 active:bg-slate-500 transition-all z-10 ${
                  resizingColumnIndex === 4 ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}
                style={{ transform: 'translateX(8px)', width: '4px' }}
                onMouseDown={(e) => handleResizeStart(4, e)}
              />
            )}
          </div>
          <div className="relative group">
            DELETED BY
            {columnWidths.length > 6 && (
              <div
                className={`absolute right-0 top-0 bottom-0 cursor-col-resize bg-slate-300 hover:bg-slate-400 active:bg-slate-500 transition-all z-10 ${
                  resizingColumnIndex === 5 ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}
                style={{ transform: 'translateX(8px)', width: '4px' }}
                onMouseDown={(e) => handleResizeStart(5, e)}
              />
            )}
          </div>
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
              className={`items-center gap-2 px-3 h-11 text-[13px] text-[var(--text)] grid hover:bg-slate-50 transition-colors ${
                i ? 'border-t border-slate-200' : ''
              }`}
              style={{ gridTemplateColumns: gridTemplateColumns }}
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
