import { useState, useMemo, useCallback, useRef, useLayoutEffect, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useReactTable, getCoreRowModel, flexRender } from '@tanstack/react-table';
import { ChevronDown, ChevronRight, Plus, UserPlus, Check } from 'lucide-react';
import { StatusDot } from '@/components/taskboard/StatusDot';
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
type ColumnSizingState = Record<string, number>;

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
}

const QuickAddTaskRow: React.FC<QuickAddProps> = ({ onSave, onCancel, defaultStatus, projects, users }) => {
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

  return (
    <tr className="border-b border-[#cecece]">
      {/* Status (muted) */}
      <td className="px-2 py-2 text-center">
        <button
          aria-label="Status (muted)"
          className="inline-grid place-items-center h-4 w-4 rounded-full hover:bg-slate-100/60"
          style={{ background: 'transparent' }}
        >
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
            <circle cx="8" cy="8" r="7" fill="none" stroke="#94a3b8" strokeWidth="2" strokeDasharray="1 1" strokeLinecap="round" />
          </svg>
        </button>
      </td>

      {/* Name + Project selector */}
      <td className="px-2 py-2">
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
      </td>

      {/* Files column: left blank */}
      <td className="px-2 py-2 text-center" />

      {/* Date (blank) */}
      <td className="px-2 py-2" />

      {/* Created (blank) */}
      <td className="px-2 py-2 text-center" />

      {/* Assigned column: attach + assign + cancel + save */}
      <td className="px-2 py-2">
        <div className="flex items-center justify-end gap-2 whitespace-nowrap" data-testid="qa-actions">
          {/* Attach (placeholder) */}
          <button
            aria-label="Attach files"
            title="Attach files"
            onClick={(e) => {
              e.stopPropagation();
            }}
            className="inline-flex items-center justify-center h-6 w-6 rounded border border-slate-300 bg-white hover:bg-slate-50"
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
                className="inline-flex items-center justify-center h-6 w-6 rounded-full border border-slate-300 bg-white hover:bg-slate-50"
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
          <button onClick={onCancel} className="h-7 px-2 rounded border border-slate-300 text-xs text-slate-700 bg-white hover:bg-slate-50">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className={`h-7 px-2 rounded text-xs text-white ${canSave ? 'bg-[#4C75D1] hover:opacity-90' : 'bg-slate-300 cursor-not-allowed'}`}
          >
            Save ↓
          </button>
        </div>
      </td>
    </tr>
  );
};

const formatDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });

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
  columnSizing: ColumnSizingState;
  onColumnSizingChange: (updater: any) => void;
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
  columnSizing,
  onColumnSizingChange,
}) => {
  const meta = STATUS_META[status];
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  const columnsBase = useMemo(
    () => [
      {
        id: 'status',
        header: '',
        size: 32,
        minSize: 24,
        maxSize: 48,
        enableResizing: false,
        cell: ({ row }: any) => <StatusDot status={row.original.status} onClick={() => onStatusToggle(row.original.id)} />,
      },
      {
        id: 'name',
        header: 'Name',
        size: 420,
        minSize: 220,
        maxSize: 1000,
        cell: ({ row }: any) => {
          const task = row.original as Task;
          const project = projects.find((p) => p.id === task.projectId);
          return (
            <button
              type="button"
              data-testid="name-cell"
              onClick={() => onTaskClick(task)}
              className="w-full text-left rounded hover:bg-slate-50 focus:bg-slate-50 outline-none px-1 py-1 cursor-pointer"
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
                className="block text-slate-600 hover:text-slate-900 hover:bg-slate-50 focus:bg-slate-50 rounded px-0.5 cursor-pointer text-[11px] leading-tight mb-1"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                {project?.name || '-'}
              </span>
              <div className="text-slate-900 font-normal leading-tight" style={{ fontSize: '13px' }}>
                {task.title}
              </div>
            </button>
          );
        },
      },
      {
        id: 'files',
        header: 'Files',
        size: 56,
        minSize: 52,
        maxSize: 200,
        cell: ({ row }: any) => (
          <div className="w-full text-center">
            <button
              aria-label="Attach files"
              title="Attach files"
              onClick={(e) => {
                e.stopPropagation();
              }}
              className="inline-flex items-center justify-center h-6 w-6 rounded border border-slate-300 bg-white hover:bg-slate-50"
            >
              <Plus size={12} className="text-slate-700" />
            </button>
          </div>
        ),
      },
      {
        id: 'date',
        header: 'Date',
        size: 110,
        minSize: 96,
        maxSize: 260,
        cell: ({ row }: any) => (
          <span className="block mx-auto text-slate-600 whitespace-nowrap" style={{ fontSize: '14px' }}>
            {formatDate(row.original.createdAt)}
          </span>
        ),
      },
      {
        id: 'created',
        header: 'Created',
        size: 84,
        minSize: 72,
        maxSize: 200,
        cell: ({ row }: any) => {
          const task = row.original as Task;
          const creator = users.find((u) => u.id === task.createdBy);
          const initials = creator
            ? creator.name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2)
            : '?';
          return (
            <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-slate-400 text-white text-[10px] mx-auto">
              {initials}
            </span>
          );
        },
      },
      {
        id: 'assigned',
        header: 'Assigned',
        size: 168,
        minSize: 84,
        maxSize: 260,
        cell: ({ row }: any) => {
          const task = row.original as Task;
          const assignedUsers = users.filter((u) => task.assignees.includes(u.id));
          return (
            <div className="flex gap-1 justify-center mx-auto">
              {assignedUsers.slice(0, 2).map((u) => {
                const initials = u.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2);
                return (
                  <span key={u.id} className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-slate-300 text-slate-800 text-[10px]">
                    {initials}
                  </span>
                );
              })}
              {assignedUsers.length > 2 && (
                <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-slate-500 text-white text-[9px]">
                  +{assignedUsers.length - 2}
                </span>
              )}
            </div>
          );
        },
      },
    ],
    [onStatusToggle, onTaskClick, onProjectClick, projects, users]
  );

  const table: any = useReactTable({
    data: tasks,
    columns: columnsBase,
    getCoreRowModel: getCoreRowModel(),
    state: { columnSizing },
    onColumnSizingChange,
    defaultColumn: { minSize: 48, maxSize: 800 },
    columnResizeMode: 'onChange',
  });

  const handleQuickAddClick = useCallback(() => setShowQuickAdd(true), []);
  const handleQuickAddSave = useCallback(
    (input: { title: string; projectId: string; assignees: string[]; status: TaskStatus }) => {
      onQuickAdd(input);
      setShowQuickAdd(false);
    },
    [onQuickAdd]
  );
  const handleQuickAddCancel = useCallback(() => setShowQuickAdd(false), []);

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
          <table className="border-collapse text-xs table-fixed w-full">
            <colgroup>
              {table.getAllLeafColumns().map((column: any) => (
                <col
                  key={column.id}
                  style={{ width: `${column.getSize()}px` }}
                />
              ))}
            </colgroup>
            <thead>
              {table.getHeaderGroups().map((headerGroup: any) => (
                <tr key={headerGroup.id} className="border-b border-[#cecece]">
                  {headerGroup.headers.map((header: any) => {
                    const isCentered = CENTER_COLS.has(header.column.id);
                    return (
                      <th
                        key={header.id}
                        className={`px-2 py-1.5 text-xs font-semibold text-slate-700 relative ${isCentered ? 'text-center' : 'text-left'}`}
                      >
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.id !== 'status' && (
                          <div
                            data-col={header.column.id}
                            onMouseDown={header.getResizeHandler()}
                            onTouchStart={header.getResizeHandler()}
                            className="absolute top-0 right-0 h-full w-6 cursor-col-resize hover:bg-blue-500/10 active:bg-blue-500/20 select-none touch-none"
                            style={{ userSelect: 'none' }}
                          />
                        )}
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row: any) => (
                <tr key={row.id} className="hover:bg-slate-50 cursor-pointer border-b border-[#cecece]">
                  {row.getVisibleCells().map((cell: any) => {
                    const isCentered = CENTER_COLS.has(cell.column.id as string);
                    return (
                      <td key={cell.id} className={`px-2 py-2 ${isCentered ? 'text-center cell-hoverable' : ''}`}>
                        <div className={`row-wrap ${isCentered ? 'center' : ''}`}>
                          <div className="cell-hover-border">{flexRender(cell.column.columnDef.cell, cell.getContext())}</div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
              {!showQuickAdd && tasks.length > 0 && (
                <tr className="border-b border-transparent">
                  <td className="px-2 py-0">
                    <div className="h-[42px] flex items-center justify-start">
                      <button onClick={handleQuickAddClick} className="h-5 w-5 grid place-items-center rounded hover:bg-slate-100" aria-label="Add Task">
                        <Plus size={14} className="text-slate-600" />
                      </button>
                    </div>
                  </td>
                  <td colSpan={table.getAllLeafColumns().length - 1} className="px-2 py-0">
                    <div className="h-[42px] flex items-center">
                      <button onClick={handleQuickAddClick} className="inline-flex items-center rounded px-1.5 py-1 transition-colors hover:bg-slate-100" style={{ fontSize: '13px' }}>
                        <span className="text-slate-500">Add Task</span>
                      </button>
                    </div>
                  </td>
                </tr>
              )}
              {showQuickAdd && (
                <QuickAddTaskRow projects={projects} users={users} defaultStatus={status} onSave={handleQuickAddSave} onCancel={handleQuickAddCancel} />
              )}
            </tbody>
          </table>
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
}

export function TasksTable({ tasks, projects, users, onTaskClick, onProjectClick, onStatusToggle, onQuickAdd }: TasksTableProps) {
  const [collapsed, setCollapsed] = useState<Record<TaskStatus, boolean>>({
    task_redline: false,
    progress_update: false,
    done_completed: false,
  });
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({
    status: 32,
    name: 420,
    files: 56,
    date: 110,
    created: 84,
    assigned: 168,
  });

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
              columnSizing={columnSizing}
              onColumnSizingChange={setColumnSizing}
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
              columnSizing={columnSizing}
              onColumnSizingChange={setColumnSizing}
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
              columnSizing={columnSizing}
              onColumnSizingChange={setColumnSizing}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
