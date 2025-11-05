import { useState, useMemo, useCallback, useRef, useLayoutEffect, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronRight, Plus, UserPlus, Check } from 'lucide-react';
import { StatusDot } from '@/components/taskboard/StatusDot';
import { TeamAvatar } from '@/components/TeamAvatar';
import type { Task, Project, User } from '@/lib/api/types';

// Status configuration
const STATUS_META = {
  task_redline: { label: 'TASK/REDLINE', tone: 'red' as const },
  progress_update: { label: 'PROGRESS/UPDATE', tone: 'blue' as const },
  done_completed: { label: 'COMPLETE', tone: 'green' as const },
} as const;

const BADGE_BG = {
  red: '#b91c1c',
  blue: '#1d4ed8',
  green: '#065f46',
} as const;

const CENTER_COLS = new Set(['files', 'date', 'created', 'assigned']);

type TaskStatus = 'task_redline' | 'progress_update' | 'done_completed';

const STORAGE_KEY = 'tasks-table-column-widths';
const DEFAULT_COLUMN_WIDTHS = [32, 420, 56, 110, 84, 168]; // Status, Name, Files, Date, Created, Assigned
const MIN_COLUMN_WIDTH = 48;
const MAX_TABLE_WIDTH = 3000;

const Badge = ({ children, tone }: { children: React.ReactNode; tone: 'red' | 'blue' | 'green' }) => (
  <span className="px-2 py-[2px] rounded text-[11px] font-medium" style={{ background: BADGE_BG[tone], color: '#ffffff' }}>
    {children}
  </span>
);

// Generic Popover component
function useOutsideDismiss<T extends HTMLElement>(open: boolean, onClose: () => void) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onClick); };
  }, [open, onClose]);
  return ref;
}

const Popover: React.FC<{
  open: boolean;
  onClose: () => void;
  anchor: React.ReactNode;
  panel: React.ReactNode;
  anchorClass?: string;
  panelClass?: string;
}> = ({ open, onClose, anchor, panel, anchorClass, panelClass }) => {
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useOutsideDismiss<HTMLDivElement>(open, onClose);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 0 });

  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      if (!anchorRef.current) return;
      const rect = anchorRef.current.getBoundingClientRect();
      setCoords({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => { window.removeEventListener('scroll', update, true); window.removeEventListener('resize', update); };
  }, [open]);

  return (
    <div ref={anchorRef} className={anchorClass || 'relative inline-block'}>
      {anchor}
      {open && createPortal(
        <div
          ref={panelRef}
          data-portal="popover"
          className={panelClass || 'w-56 rounded-md border border-[#cecece] bg-white shadow-sm'}
          style={{ position: 'fixed', top: coords.top, left: coords.left, zIndex: 1000 }}
        >
          {panel}
        </div>,
        document.body
      )}
    </div>
  );
};

// Quick Add Task Row
interface QuickAddProps {
  onSave: (t: { title: string; projectId: string; assignees: string[]; status: TaskStatus }) => void;
  onCancel: () => void;
  defaultStatus: TaskStatus;
  projects: Project[];
  users: User[];
  columnWidths: number[];
}

const QuickAddTaskRow: React.FC<QuickAddProps> = ({ onSave, onCancel, defaultStatus, projects, users, columnWidths }) => {
  const [title, setTitle] = useState('');
  const [projectId, setProjectId] = useState('');
  const [projOpen, setProjOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignees, setAssignees] = useState<string[]>([]);

  const canSave = title.trim().length > 0 && projectId.trim().length > 0;
  const toggleAssignee = useCallback((id: string) => setAssignees((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])), []);
  const handleSave = useCallback(() => {
    if (canSave) onSave({ title, projectId, assignees, status: defaultStatus });
  }, [canSave, defaultStatus, onSave, projectId, title, assignees]);

  const selectedProject = projects.find((p) => p.id === projectId);
  const gridTemplateColumns = columnWidths.map(width => `${width}px`).join(' ');

  return (
    <div className="border-b border-[#cecece] grid items-center" style={{ gridTemplateColumns }}>
      {/* Status */}
      <div className="px-2 py-2 text-center">
        <button
          aria-label="Status (muted)"
          className="inline-grid place-items-center h-4 w-4 rounded-full hover:bg-slate-100/60"
          style={{ background: 'transparent' }}
        >
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
            <circle cx="8" cy="8" r="7" fill="none" stroke="#94a3b8" strokeWidth="2" strokeDasharray="1 1" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Name */}
      <div className="px-2 py-2">
        <div className="relative mb-1 flex items-center gap-3">
          <Popover
            open={projOpen}
            onClose={() => setProjOpen(false)}
            anchorClass="relative inline-block"
            anchor={
              <button
                type="button"
                onClick={() => setProjOpen((o) => !o)}
                className="inline-flex items-center gap-1 h-[18px] text-[11px] leading-tight px-0 rounded hover:bg-slate-50 focus:bg-slate-50"
              >
                <span className={projectId ? 'text-slate-900' : 'text-slate-400'}>
                  {selectedProject?.name || 'Select Project...'}
                </span>
                <ChevronDown size={12} className="text-slate-500" />
              </button>
            }
            panel={
              <div className="max-h-60 overflow-auto">
                <ul className="py-[2px]">
                  {projects.length === 0 && <li className="px-2 py-1 text-xs text-slate-500">No projects</li>}
                  {projects.map((p) => (
                    <li key={p.id}>
                      <button
                        onClick={() => {
                          setProjectId(p.id);
                          setProjOpen(false);
                        }}
                        className={`w-full text-left px-2 py-1 text-[12px] hover:bg-slate-100 ${projectId === p.id ? 'bg-slate-50' : ''}`}
                      >
                        {p.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            }
          />
        </div>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Task Name"
          className="block w-full px-0 bg-transparent outline-none focus:outline-none focus:ring-0 text-[13px] leading-tight h-[18px]"
        />
      </div>

      {/* Files */}
      <div className="px-2 py-2 text-center" />

      {/* Date */}
      <div className="px-2 py-2" />

      {/* Created */}
      <div className="px-2 py-2 text-center" />

      {/* Assigned */}
      <div className="px-2 py-2">
        <div className="flex items-center justify-end gap-2 whitespace-nowrap" data-testid="qa-actions">
          {/* Attach (placeholder) */}
          <button
            aria-label="Attach files"
            title="Attach files"
            onClick={(e) => {
              e.stopPropagation();
            }}
            className="inline-flex items-center justify-center h-6 w-6 rounded bg-white hover:bg-slate-50 flex-shrink-0"
            style={{ 
              border: '0.5px dashed #cbd5e1',
              borderWidth: '0.5px',
              borderStyle: 'dashed',
              borderColor: '#cbd5e1',
              minWidth: '24px',
              minHeight: '24px'
            }}
          >
            <Plus size={12} className="text-slate-700" />
          </button>

          {/* Assign */}
          <Popover
            open={assignOpen}
            onClose={() => setAssignOpen(false)}
            anchorClass="relative inline-block"
            anchor={
              <button
                data-testid="qa-assign-btn"
                title="Assign"
                onClick={() => setAssignOpen((o) => !o)}
                className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-white hover:bg-slate-50 flex-shrink-0"
              >
                <UserPlus className="h-3.5 w-3.5 text-slate-600" />
              </button>
            }
            panel={
              <div className="max-h-64 overflow-auto w-56">
                <div className="px-2 py-1 text-[11px] text-slate-500 border-b border-[#cecece]">Assign to</div>
                <ul className="py-[2px]">
                  {users.length === 0 && <li className="px-2 py-1 text-xs text-slate-500">No users</li>}
                  {users.map((u) => {
                    const active = assignees.includes(u.id);
                    const initials = u.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2);
                    return (
                      <li key={u.id}>
                        <button
                          onClick={() => toggleAssignee(u.id)}
                          className="w-full flex items-center gap-2 px-2 py-1 text-[12px] hover:bg-slate-100"
                        >
                          <span
                            className={`inline-flex items-center justify-center h-5 w-5 rounded-full ${active ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-700'}`}
                          >
                            {initials}
                          </span>
                          <span className="flex-1 text-left">{u.name}</span>
                          {active && <Check size={14} className="text-slate-700" />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            }
          />

          {/* Actions */}
          <button onClick={onCancel} className="h-6 px-2 rounded border border-slate-300 text-xs text-slate-700 bg-white hover:bg-slate-50">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className={`h-6 px-2 rounded text-xs text-white ${canSave ? 'bg-[#4C75D1] hover:opacity-90' : 'bg-slate-300 cursor-not-allowed'}`}
          >
            Save ↓
          </button>
        </div>
      </div>

      {/* Empty column */}
      <div className="px-2 py-2"></div>
    </div>
  );
};

const formatDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });

// Task Row Component
interface TaskRowProps {
  task: Task;
  project: Project | undefined;
  creator: User | undefined;
  assignedUsers: User[];
  users: User[];
  onTaskClick: (task: Task) => void;
  onProjectClick: (projectId: string) => void;
  onStatusToggle: (taskId: string) => void;
  onUpdateTaskAssignees: (taskId: string, assignees: string[]) => void;
  gridTemplateColumns: string;
}

const TaskRow: React.FC<TaskRowProps> = ({
  task,
  project,
  creator,
  assignedUsers,
  users,
  onTaskClick,
  onProjectClick,
  onStatusToggle,
  onUpdateTaskAssignees,
  gridTemplateColumns,
}) => {
  const [assignOpen, setAssignOpen] = useState(false);
  const [localAssignees, setLocalAssignees] = useState<string[]>(task.assignees);

  const toggleAssignee = useCallback((userId: string) => {
    setLocalAssignees((prev) => {
      const updated = prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId];
      onUpdateTaskAssignees(task.id, updated);
      return updated;
    });
  }, [task.id, onUpdateTaskAssignees]);

  return (
    <div
      className="hover:bg-slate-50 cursor-pointer border-b border-[#cecece] grid items-center"
      style={{ gridTemplateColumns }}
    >
      {/* Status */}
      <div className="px-2 py-1.5 flex items-center justify-center">
        <StatusDot status={task.status} onClick={() => onStatusToggle(task.id)} />
      </div>

      {/* Name */}
      <div className="px-2 py-1.5">
        <button
          type="button"
          data-testid="name-cell"
          onClick={() => onTaskClick(task)}
          className="w-full text-left rounded hover:bg-slate-50 focus:bg-slate-50 outline-none px-1 py-0.5 cursor-pointer"
          style={{ lineHeight: 1.1 }}
        >
          <span
            role="link"
            aria-label="Open project"
            title="Open project"
            tabIndex={0}
            data-testid="project-link"
            onClick={(e) => {
              e.stopPropagation();
              if (project) onProjectClick(project.id);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                if (project) onProjectClick(project.id);
              }
            }}
            className="block text-slate-600 hover:text-slate-900 hover:bg-slate-50 focus:bg-slate-50 rounded px-0.5 cursor-pointer text-[11px] leading-tight mb-0.5"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            {project?.name || '-'}
          </span>
          <div className="text-slate-900 font-medium leading-tight" style={{ fontSize: '13px' }}>
            {task.title}
          </div>
        </button>
      </div>

      {/* Files */}
      <div className="px-2 py-1.5 text-center">
        <div className="w-full text-center">
          <button
            aria-label="Attach files"
            title="Attach files"
            onClick={(e) => {
              e.stopPropagation();
            }}
            className="inline-flex items-center justify-center h-6 w-6 rounded bg-white hover:bg-slate-50"
            style={{ 
              border: '0.5px dashed #cbd5e1',
              borderWidth: '0.5px',
              borderStyle: 'dashed',
              borderColor: '#cbd5e1'
            }}
          >
            <Plus size={12} className="text-slate-700" />
          </button>
        </div>
      </div>

      {/* Date */}
      <div className="px-2 py-1.5 text-center">
        <span className="block mx-auto text-slate-600 whitespace-nowrap" style={{ fontSize: '14px' }}>
          {formatDate(task.createdAt)}
        </span>
      </div>

      {/* Created */}
      <div className="px-2 py-1.5 text-center">
        {creator ? (
          <div className="flex justify-center">
            <TeamAvatar user={{ ...creator, avatar_url: creator.avatarUrl }} size="sm" />
          </div>
        ) : (
          <span className="text-slate-400 text-xs">-</span>
        )}
      </div>

      {/* Assigned */}
      <div className="px-2 py-1.5 text-center">
        <div className="flex gap-1 justify-center items-center mx-auto">
          {assignedUsers.slice(0, 2).map((u) => (
            <TeamAvatar key={u.id} user={{ ...u, avatar_url: u.avatarUrl }} size="sm" />
          ))}
          {assignedUsers.length > 2 && (
            <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-slate-500 text-white text-[9px]">
              +{assignedUsers.length - 2}
            </span>
          )}
          <Popover
            open={assignOpen}
            onClose={() => setAssignOpen(false)}
            anchorClass="relative inline-block"
            anchor={
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setAssignOpen((o) => !o);
                }}
                className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-white hover:bg-slate-50"
                title="Assign users"
              >
                <UserPlus className="h-3.5 w-3.5 text-slate-600" />
              </button>
            }
            panel={
              <div className="max-h-64 overflow-auto w-56">
                <div className="px-2 py-1 text-[11px] text-slate-500 border-b border-[#cecece]">Assign to</div>
                <ul className="py-[2px]">
                  {users.length === 0 && <li className="px-2 py-1 text-xs text-slate-500">No users</li>}
                  {users.map((u) => {
                    const active = localAssignees.includes(u.id);
                    return (
                      <li key={u.id}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleAssignee(u.id);
                          }}
                          className="w-full flex items-center gap-2 px-2 py-1 text-[12px] hover:bg-slate-100"
                        >
                          <TeamAvatar user={{ ...u, avatar_url: u.avatarUrl }} size="xs" />
                          <span className="flex-1 text-left">{u.name}</span>
                          {active && <Check size={14} className="text-slate-700" />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            }
          />
        </div>
      </div>

      {/* Empty column */}
      <div className="px-2 py-1.5"></div>
    </div>
  );
};

interface TasksSectionProps {
  status: TaskStatus;
  tasks: Task[];
  projects: Project[];
  users: User[];
  collapsed: boolean;
  onToggleCollapse: () => void;
  onTaskClick: (task: Task) => void;
  onProjectClick: (projectId: string) => void;
  onStatusToggle: (taskId: string) => void;
  onQuickAdd: (input: { title: string; projectId: string; assignees: string[]; status: TaskStatus }) => void;
  onUpdateTaskAssignees: (taskId: string, assignees: string[]) => void;
  columnWidths: number[];
  onColumnWidthsChange: (widths: number[]) => void;
}

const TasksSection: React.FC<TasksSectionProps> = ({
  status,
  tasks,
  projects,
  users,
  collapsed,
  onToggleCollapse,
  onTaskClick,
  onProjectClick,
  onStatusToggle,
  onQuickAdd,
  onUpdateTaskAssignees,
  columnWidths,
  onColumnWidthsChange,
}) => {
  const meta = STATUS_META[status];
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  
  // Resize state
  const [resizingColumnIndex, setResizingColumnIndex] = useState<number | null>(null);
  const resizeStartX = useRef<number>(0);
  const resizeStartWidths = useRef<number[]>([]);
  const [tableOverflow, setTableOverflow] = useState<number>(0); // Extra width when column hits min

  // Generate grid template columns string
  const gridTemplateColumns = useMemo(() => {
    // Add flexible empty column at the end, with potential overflow
    const widths = columnWidths.map(width => `${width}px`).join(' ');
    // Add overflow to empty column if needed
    const emptyColumnWidth = tableOverflow > 0 ? `minmax(${tableOverflow}px, 1fr)` : 'minmax(0, 1fr)';
    return `${widths} ${emptyColumnWidth}`;
  }, [columnWidths, tableOverflow]);

  // Handle resize start
  const handleResizeStart = useCallback((columnIndex: number, e: React.MouseEvent) => {
    e.preventDefault();
    setResizingColumnIndex(columnIndex);
    resizeStartX.current = e.clientX;
    resizeStartWidths.current = [...columnWidths];
    setTableOverflow(0); // Reset overflow when starting new resize
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
      
      // Only allow resizing for columns 1-5 (Name, Files, Date, Created, Assigned)
      // Column 0 (Status) is fixed, last column (Empty) is flexible and doesn't need resizing
      if (leftColumnIndex >= 1 && leftColumnIndex < newWidths.length) {
        // If resizing the last resizable column (Assigned), only adjust that column
        // The empty column will adjust automatically since it's flexible
        if (leftColumnIndex === newWidths.length - 1) {
          // Calculate new width
          const newLeftWidth = resizeStartWidths.current[leftColumnIndex] + deltaX;
          
          // If dragging left (making narrower) and at min width, table will grow horizontally
          // via the flexible empty column, which pushes content to the left
          if (newLeftWidth >= MIN_COLUMN_WIDTH) {
            // Column can resize normally
            newWidths[leftColumnIndex] = newLeftWidth;
            setTableOverflow(0);
            onColumnWidthsChange(newWidths);
          } else {
            // At min width, but dragging left - grow table horizontally
            // Keep column at min width, but track overflow to grow table
            newWidths[leftColumnIndex] = MIN_COLUMN_WIDTH;
            // Calculate how much we've dragged past min width
            const overflow = MIN_COLUMN_WIDTH - newLeftWidth;
            setTableOverflow(Math.max(0, overflow));
            onColumnWidthsChange(newWidths);
          }
        } else {
          // Normal resize between two fixed-width columns
          const newLeftWidth = Math.max(
            MIN_COLUMN_WIDTH,
            resizeStartWidths.current[leftColumnIndex] + deltaX
          );
          const newRightWidth = Math.max(
            MIN_COLUMN_WIDTH,
            resizeStartWidths.current[rightColumnIndex] - deltaX
          );
          
          // Only update if both columns are within constraints
          if (newLeftWidth >= MIN_COLUMN_WIDTH && newRightWidth >= MIN_COLUMN_WIDTH) {
            newWidths[leftColumnIndex] = newLeftWidth;
            newWidths[rightColumnIndex] = newRightWidth;
            onColumnWidthsChange(newWidths);
          }
        }
      }
    };

    const handleMouseUp = () => {
      setResizingColumnIndex(null);
      setTableOverflow(0); // Reset overflow on mouse up
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingColumnIndex, onColumnWidthsChange]);

  const handleQuickAddClick = useCallback(() => setShowQuickAdd(true), []);
  const handleQuickAddSave = useCallback(
    (input: { title: string; projectId: string; assignees: string[]; status: TaskStatus }) => {
      onQuickAdd(input);
      setShowQuickAdd(false);
    },
    [onQuickAdd]
  );
  const handleQuickAddCancel = useCallback(() => setShowQuickAdd(false), []);

  // Calculate table width - sum of fixed columns, empty column fills remaining space
  const totalFixedWidth = columnWidths.reduce((sum, width) => sum + width, 0);
  const tableWidth = Math.min(totalFixedWidth, MAX_TABLE_WIDTH);

  return (
    <div className="mb-6">
      <div className="flex items-center gap-4 mb-3 cursor-pointer" onClick={onToggleCollapse}>
        <button className="p-0 text-slate-600 hover:text-slate-900">
          {collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
        </button>
        <Badge tone={meta.tone}>{meta.label}</Badge>
        <span className="text-slate-500 text-xs font-medium">{tasks.length}</span>
      </div>

      {!collapsed && (
        <div className="overflow-x-auto pl-8 pr-8" style={{ scrollbarGutter: 'stable' }} data-testid="table-scroll-x">
          <div 
            className="border-collapse text-xs"
            style={{
              width: '100%',
              minWidth: `${tableWidth}px`
            }}
          >
            {/* Table Header */}
            <div
              className="border-b border-[#cecece] grid items-center relative"
              style={{ gridTemplateColumns }}
            >
              {/* Status */}
              <div className="px-2 py-1.5 text-xs font-semibold text-slate-700 text-center relative flex items-center justify-center">
                <div className="pr-3"></div>
              </div>

              {/* Name */}
              <div className="px-2 py-1.5 text-xs font-semibold text-slate-700 text-left relative group">
                <div className="pr-3">Name</div>
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

              {/* Files */}
              <div className="px-2 py-1.5 text-xs font-semibold text-slate-700 text-center relative group">
                <div className="pr-3">Files</div>
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

              {/* Date */}
              <div className="px-2 py-1.5 text-xs font-semibold text-slate-700 text-center relative group">
                <div className="pr-3">Date</div>
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

              {/* Created */}
              <div className="px-2 py-1.5 text-xs font-semibold text-slate-700 text-center relative group">
                <div className="pr-3">Created by</div>
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

              {/* Assigned */}
              <div className="px-2 py-1.5 text-xs font-semibold text-slate-700 text-center relative group">
                <div className="pr-3">Assigned to</div>
                {columnWidths.length >= 6 && (
                  <div
                    className={`absolute right-0 top-0 bottom-0 cursor-col-resize bg-slate-300 hover:bg-slate-400 active:bg-slate-500 transition-all z-10 ${
                      resizingColumnIndex === 5 ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    }`}
                    style={{ transform: 'translateX(8px)', width: '4px' }}
                    onMouseDown={(e) => handleResizeStart(5, e)}
                  />
                )}
              </div>

              {/* Empty column */}
              <div className="px-2 py-1.5 text-xs font-semibold text-slate-700 relative">
                <div className="pr-3"></div>
              </div>
            </div>

            {/* Table Body */}
            <div>
              {tasks.map((task) => {
                const project = projects.find((p) => p.id === task.projectId);
                const creator = users.find((u) => u.id === task.createdBy);
                const assignedUsers = users.filter((u) => task.assignees.includes(u.id));

                return (
                  <TaskRow
                    key={task.id}
                    task={task}
                    project={project}
                    creator={creator}
                    assignedUsers={assignedUsers}
                    users={users}
                    onTaskClick={onTaskClick}
                    onProjectClick={onProjectClick}
                    onStatusToggle={onStatusToggle}
                    onUpdateTaskAssignees={onUpdateTaskAssignees}
                    gridTemplateColumns={gridTemplateColumns}
                  />
                );
              })}
              
              {!showQuickAdd && tasks.length > 0 && (
                <div className="border-b border-transparent grid items-center" style={{ gridTemplateColumns }}>
                  <div className="px-2 py-0">
                    <div className="h-[42px] flex items-center justify-start">
                      <button onClick={handleQuickAddClick} className="h-5 w-5 grid place-items-center rounded hover:bg-slate-100" aria-label="Add Task">
                        <Plus size={14} className="text-slate-600" />
                      </button>
                    </div>
                  </div>
                  <div className="px-2 py-0" style={{ gridColumn: 'span 6' }}>
                    <div className="h-[42px] flex items-center">
                      <button onClick={handleQuickAddClick} className="inline-flex items-center rounded px-1.5 py-1 transition-colors hover:bg-slate-100" style={{ fontSize: '13px' }}>
                        <span className="text-slate-500">Add Task</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              {showQuickAdd && (
                <QuickAddTaskRow 
                  columnWidths={columnWidths}
                  projects={projects} 
                  users={users} 
                  defaultStatus={status} 
                  onSave={handleQuickAddSave} 
                  onCancel={handleQuickAddCancel} 
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface TasksTableProps {
  tasks: Task[];
  projects: Project[];
  users: User[];
  onTaskClick: (task: Task) => void;
  onProjectClick: (projectId: string) => void;
  onStatusToggle: (taskId: string) => void;
  onQuickAdd: (input: { title: string; projectId: string; assignees: string[]; status: TaskStatus }) => void;
  onUpdateTaskAssignees: (taskId: string, assignees: string[]) => void;
}

export function TasksTable({ tasks, projects, users, onTaskClick, onProjectClick, onStatusToggle, onQuickAdd, onUpdateTaskAssignees }: TasksTableProps) {
  const [collapsed, setCollapsed] = useState<Record<TaskStatus, boolean>>({
    task_redline: false,
    progress_update: false,
    done_completed: false,
  });
  
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

  // Save column widths to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(columnWidths));
    } catch {
      // Ignore errors
    }
  }, [columnWidths]);

  const filtered = useMemo(
    () => ({
      task_redline: tasks.filter((t) => t.status === 'task_redline'),
      progress_update: tasks.filter((t) => t.status === 'progress_update'),
      done_completed: tasks.filter((t) => t.status === 'done_completed'),
    }),
    [tasks]
  );

  const toggleCollapse = useCallback((status: TaskStatus) => {
    setCollapsed((s) => ({ ...s, [status]: !s[status] }));
  }, []);

  return (
    <div className="h-full w-full text-[12px] overflow-hidden pb-6 pr-1">
      <div className="min-h-0 min-w-0 h-full flex flex-col" data-testid="task-root">
        <div className="flex-1 overflow-auto" style={{ scrollbarGutter: 'stable' }} data-testid="task-scroll">
          <div className="p-4 space-y-4" data-testid="task-container">
            <TasksSection
              status="task_redline"
              tasks={filtered.task_redline}
              projects={projects}
              users={users}
              collapsed={collapsed.task_redline}
              onToggleCollapse={() => toggleCollapse('task_redline')}
              onTaskClick={onTaskClick}
              onProjectClick={onProjectClick}
              onStatusToggle={onStatusToggle}
              onQuickAdd={onQuickAdd}
              onUpdateTaskAssignees={onUpdateTaskAssignees}
              columnWidths={columnWidths}
              onColumnWidthsChange={setColumnWidths}
            />
            <TasksSection
              status="progress_update"
              tasks={filtered.progress_update}
              projects={projects}
              users={users}
              collapsed={collapsed.progress_update}
              onToggleCollapse={() => toggleCollapse('progress_update')}
              onTaskClick={onTaskClick}
              onProjectClick={onProjectClick}
              onStatusToggle={onStatusToggle}
              onQuickAdd={onQuickAdd}
              onUpdateTaskAssignees={onUpdateTaskAssignees}
              columnWidths={columnWidths}
              onColumnWidthsChange={setColumnWidths}
            />
            <TasksSection
              status="done_completed"
              tasks={filtered.done_completed}
              projects={projects}
              users={users}
              collapsed={collapsed.done_completed}
              onToggleCollapse={() => toggleCollapse('done_completed')}
              onTaskClick={onTaskClick}
              onProjectClick={onProjectClick}
              onStatusToggle={onStatusToggle}
              onQuickAdd={onQuickAdd}
              onUpdateTaskAssignees={onUpdateTaskAssignees}
              columnWidths={columnWidths}
              onColumnWidthsChange={setColumnWidths}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
