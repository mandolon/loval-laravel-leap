import React, { useEffect, useMemo, useRef, useState, useCallback, useLayoutEffect } from 'react';
import { Upload, X, FileText, Image as ImageIcon, Trash2, Calendar } from 'lucide-react';
import { createPortal } from 'react-dom';
import type { Task, User } from '@/lib/api/types';
import { TeamAvatar } from '@/components/TeamAvatar';
import { AssigneeGroup } from '@/apps/team/components/AssigneeGroup';
import { useTaskFiles, useUploadTaskFile, useDeleteTaskFile, downloadTaskFile } from '@/lib/api/hooks/useFiles';
import { Dialog, DialogContent, DialogOverlay } from '@/components/ui/dialog';

type TaskDrawerProps = {
  open: boolean;
  task: Task | null;
  width: number;
  topOffset?: number;
  onWidthChange?: (width: number) => void;
  projectName?: string;
  onClose: () => void;
  onUpdate?: (updates: Partial<Task>) => void;
  onStatusToggle?: (taskId: string) => void;
  assignees?: User[];
  users?: User[];
  createdBy?: User | null;
  onDeleteTask?: (taskId: string) => Promise<void> | void;
};

function getFileIcon(type?: string | null) {
  if (!type) return <FileText className="w-4 h-4" />;
  return type.startsWith('image/') ? <ImageIcon className="w-4 h-4" /> : <FileText className="w-4 h-4" />;
}

function formatShortDate(input: string) {
  const d = new Date(input);
  if (isNaN(d.getTime())) return String(input);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const mon = months[d.getMonth()];
  const day = d.getDate();
  const yy = String(d.getFullYear()).slice(-2);
  return `${mon} ${day}, ${yy}`;
}

function formatFileSize(bytes?: number | null) {
  if (!bytes && bytes !== 0) return '—';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

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

const Badge = ({ children, color }: { children: React.ReactNode; color: string }) => (
  <span className="px-2 py-[2px] rounded text-[11px] font-medium" style={{ background: color, color: '#ffffff' }}>
    {children}
  </span>
);

const STATUS_OPTIONS: Array<{ value: Task['status']; label: string; color: string }> = [
  { value: 'task_redline', label: 'TASK/REDLINE', color: '#d14c4c' },
  { value: 'progress_update', label: 'PROGRESS/UPDATE', color: '#4c75d1' },
  { value: 'done_completed', label: 'COMPLETE', color: '#4cd159' },
];

export default function TaskDrawer({ open, task, width, topOffset = 0, onWidthChange, projectName, onClose, onUpdate, onStatusToggle, assignees = [], users = [], createdBy, onDeleteTask }: TaskDrawerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragState = useRef<{ startX: number; startWidth: number } | null>(null);
  const [statusPopoverOpen, setStatusPopoverOpen] = useState(false);
  const descriptionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [localAssignees, setLocalAssignees] = useState<string[]>(() => {
    // Initialize with task assignees if available, ensuring it's always an array
    if (task) {
      return Array.isArray(task.assignees) ? task.assignees.filter(id => id != null) : [];
    }
    return [];
  });
  const usersById = useMemo(() => {
    const rec: Record<string, User> = {};
    users.forEach((u) => { rec[u.id] = u; });
    return rec;
  }, [users]);

  const { data: files = [] } = useTaskFiles(task?.id || '');
  const uploadFileMutation = useUploadTaskFile();
  const deleteFileMutation = useDeleteTaskFile();

  // Sync local assignees with task prop
  useEffect(() => {
    if (task) {
      // Ensure we always have an array
      const currentAssignees = Array.isArray(task.assignees) 
        ? task.assignees.filter(id => id != null) 
        : [];
      
      setLocalAssignees(prev => {
        // Only update if the arrays are different (deep comparison)
        const prevSorted = [...prev].sort().join(',');
        const currentSorted = [...currentAssignees].sort().join(',');
        if (prevSorted !== currentSorted) {
          return currentAssignees;
        }
        return prev;
      });
    }
  }, [task?.id, task?.assignees]);

  // Close status popover when task changes
  useEffect(() => {
    setStatusPopoverOpen(false);
  }, [task?.id]);

  const handleTitleEdit = useCallback((value: string) => {
    if (!task || !onUpdate) return;
    const trimmed = value.trim();
    if (trimmed && trimmed !== task.title) onUpdate({ title: trimmed });
  }, [task, onUpdate]);

  const handleDescriptionBlur = useCallback((value: string) => {
    if (!task || !onUpdate) return;
    if (value !== task.description) onUpdate({ description: value });
  }, [task, onUpdate]);

  const handleDescriptionChange = useCallback((value: string) => {
    if (!task || !onUpdate) return;
    
    // Clear existing timeout
    if (descriptionTimeoutRef.current) {
      clearTimeout(descriptionTimeoutRef.current);
    }
    
    // Set new timeout - save after 800ms of inactivity
    descriptionTimeoutRef.current = setTimeout(() => {
      if (value !== task.description) {
        onUpdate({ description: value });
      }
    }, 800);
  }, [task, onUpdate]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (descriptionTimeoutRef.current) {
        clearTimeout(descriptionTimeoutRef.current);
      }
    };
  }, []);

  const handleFileUpload = useCallback((filesList: FileList | null) => {
    if (!task || !filesList || filesList.length === 0) return;
    Array.from(filesList).forEach((file) => {
      uploadFileMutation.mutate({ file, taskId: task.id, projectId: task.projectId });
    });
  }, [task, uploadFileMutation]);

  const handleFileDelete = useCallback((fileId: string) => {
    if (!task) return;
    deleteFileMutation.mutate({ fileId, taskId: task.id });
  }, [task, deleteFileMutation]);

  const handleStatusSelect = useCallback((status: Task['status']) => {
    if (task && onUpdate) {
      onUpdate({ status });
    }
    setStatusPopoverOpen(false);
  }, [task, onUpdate]);

  const getStatusColor = useCallback((status: Task['status']) => {
    switch (status) {
      case 'task_redline':
        return '#d14c4c';
      case 'progress_update':
        return '#4c75d1';
      case 'done_completed':
        return '#4cd159';
      default:
        return '#94a3b8';
    }
  }, []);

  // Page-level drag & drop
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onDragOver = (e: DragEvent) => { e.preventDefault(); setIsDragging(true); };
    const onDragLeave = (e: DragEvent) => { e.preventDefault(); setIsDragging(false); };
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFileUpload(e.dataTransfer?.files || null);
    };
    el.addEventListener('dragover', onDragOver);
    el.addEventListener('dragleave', onDragLeave);
    el.addEventListener('drop', onDrop);
    return () => {
      el.removeEventListener('dragover', onDragOver);
      el.removeEventListener('dragleave', onDragLeave);
      el.removeEventListener('drop', onDrop);
    };
  }, [handleFileUpload]);

  if (!task) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-5xl max-h-[85vh] p-0 gap-0 overflow-hidden flex flex-col [&>button]:hidden data-[state=open]:animate-none data-[state=closed]:animate-none">
        <div
          ref={containerRef}
          className="flex-1 min-h-0 flex flex-col"
        >
        <div className="flex flex-col h-full min-h-0 bg-white" data-testid="task-drawer-root">
          {/* Header */}
          <div className="border-b border-[#cecece] bg-white shrink-0">
            <div className="py-2 px-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span 
                    className="inline-block w-4 h-4 rounded-full border-2" 
                    style={{ borderColor: task ? getStatusColor(task.status) : '#94a3b8' }}
                  />
                  <span className="text-[#202020] text-[14px]">{task.shortId}</span>
                  <span className="w-px h-4 bg-gray-300" />
                  <div className="text-[13px] text-[#646464] font-medium leading-tight">{projectName || 'Project'}</div>
                </div>
                <button
                  className="w-8 h-8 inline-flex items-center justify-center rounded hover:bg-gray-100 transition-colors"
                  onClick={onClose}
                  aria-label="Close task detail"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Main */}
          <div className="flex-1 min-h-0 overflow-auto px-12 pt-8">
            <div className="max-w-[840px] mx-auto pb-8">
              {/* Status Badge */}
              <div className="mb-4">
                <Popover
                  open={statusPopoverOpen}
                  onClose={() => setStatusPopoverOpen(false)}
                  anchor={
                    <button
                      type="button"
                      onClick={() => setStatusPopoverOpen(true)}
                      className="inline-flex items-center"
                      aria-label="Change status"
                    >
                      <Badge color={task ? getStatusColor(task.status) : '#94a3b8'}>
                        {task ? STATUS_OPTIONS.find(opt => opt.value === task.status)?.label || 'STATUS' : 'STATUS'}
                      </Badge>
                    </button>
                  }
                  panel={
                    <div className="py-1">
                      {STATUS_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => handleStatusSelect(option.value)}
                          className={`w-full text-left px-3 py-1.5 text-[12px] hover:bg-slate-50 transition-colors flex items-center gap-2 ${
                            task?.status === option.value ? 'bg-slate-50' : ''
                          }`}
                        >
                          <span 
                            className="inline-block w-4 h-4 rounded-full border-2 flex-shrink-0" 
                            style={{ borderColor: option.color }}
                          />
                          <span>{option.label}</span>
                        </button>
                      ))}
                    </div>
                  }
                />
              </div>

              {/* Title */}
              <div className="mb-5">
                <input
                  key={task.id}
                  id="task-drawer-title"
                  type="text"
                  defaultValue={task.title}
                  onBlur={(e) => handleTitleEdit(e.target.value)}
                  className="w-full text-2xl font-semibold tracking-tight outline-none border-b border-transparent focus:border-[#4C75D1] py-2 transition-colors"
                  aria-label="Task title"
                />
              </div>

              {/* Description */}
              <div className="mb-8">
                <div className="rounded-lg border border-[#cecece] bg-slate-50/30 focus-within:bg-white focus-within:border-[#4C75D1] focus-within:shadow-sm transition-all overflow-hidden">
                  <textarea
                    key={`desc-${task.id}`}
                    placeholder="Describe the task details, requirements, or any relevant information..."
                    className="min-h-[150px] w-full p-4 text-[14px] border-0 outline-none resize-none placeholder:text-gray-400 bg-transparent"
                    defaultValue={task.description || ''}
                    onChange={(e) => handleDescriptionChange(e.target.value)}
                    onBlur={(e) => handleDescriptionBlur(e.target.value)}
                  />
                </div>
              </div>

              {/* Fields Row */}
              <div className="grid grid-cols-5 gap-6 mb-8 items-start">
                {/* Created by */}
                <div>
                  <label className="text-[13px] text-[#646464] block mb-2">Created by</label>
                  <div className="flex items-center gap-2 text-[12px]">
                    {createdBy ? (
                      <TeamAvatar user={{ ...createdBy, avatar_url: createdBy.avatarUrl }} size="sm" />
                    ) : (
                      <div className="w-6 h-6 rounded-full border border-dashed border-gray-400" />
                    )}
                  </div>
                </div>

                {/* Date Created */}
                <div>
                  <label className="text-[13px] text-[#646464] block mb-2">Date Created</label>
                  <div className="text-[12px] text-[#202020]">{formatShortDate(task.createdAt)}</div>
                </div>

                {/* Assigned to */}
                <div>
                  <label className="text-[13px] text-[#646464] block mb-2">Assigned to</label>
                  <div className="flex items-center">
                    <AssigneeGroup
                      key={`${task.id}-${task.assignees?.sort().join(',') || ''}`}
                      value={localAssignees}
                      usersById={usersById}
                      onChange={(next) => {
                        setLocalAssignees(next);
                        onUpdate?.({ assignees: next });
                      }}
                    />
                  </div>
                </div>

                {/* Track Time */}
                <div>
                  <label className="text-[13px] text-[#646464] block mb-2">Track Time</label>
                  <div className="text-sm">{task.actualTime || 0}h</div>
                </div>

                {/* Due Date */}
                <div>
                  <label className="text-[13px] text-[#646464] block mb-2">Due Date</label>
                  <div className="relative">
                    {task.dueDate ? (
                      <input type="date" defaultValue={task.dueDate as any} onBlur={(e) => onUpdate?.({ dueDate: e.target.value })} className="h-8 text-sm border border-[#cecece] rounded px-2" />
                    ) : (
                      <button className="h-8 px-2 text-muted-foreground inline-flex items-center gap-1" onClick={() => onUpdate?.({ dueDate: new Date().toISOString().split('T')[0] as any })}>
                        <Calendar className="h-4 w-4" />
                        Set date
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Attachments */}
              <div>
                <h2 className="text-[13px] font-semibold mb-3">Attachments</h2>
                <input ref={fileInputRef} type="file" multiple onChange={(e) => handleFileUpload(e.target.files)} className="hidden" />

                <div
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-[#cecece] bg-gray-50 hover:bg-gray-100'}`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="flex items-center justify-center gap-2 text-[13px] text-[#646464]">
                    <Upload className="w-4 h-4" />
                    <span>Drop your files here to upload</span>
                  </div>
                  <div className="text-[13px] text-[#646464] mt-1">(Click box to select files)</div>
                </div>

                {files.length > 0 ? (
                  <div className="mt-3 max-h-[340px] overflow-auto rounded-md">
                    <div className="border-b border-[#cecece]">
                      <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_40px] gap-4 px-4 py-2 text-[12px] font-semibold text-[#646464] sticky top-0 bg-white z-10">
                        <div>Name</div>
                        <div>Size</div>
                        <div>Type</div>
                        <div>Date</div>
                        <div>Author</div>
                        <div></div>
                      </div>
                    </div>
                    {files.map((f) => (
                      <div key={f.id} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_40px] gap-4 px-4 py-2 text-[12px] border-b border-[#cecece] hover:bg-gray-50 transition-colors group odd:bg-white even:bg-gray-50 min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          {getFileIcon(f.mimetype || null)}
                          <span className="text-[#202020] truncate" title={f.filename}>{f.filename}</span>
                        </div>
                        <div className="text-[#646464]">{formatFileSize(f.filesize)}</div>
                        <div className="text-[#646464]">{(f.mimetype?.split('/')[1] || 'File').toUpperCase()}</div>
                        <div className="text-[#646464]">{formatShortDate(f.createdAt)}</div>
                        <div className="text-[#646464]">—</div>
                        <div className="flex items-center justify-center">
                          <button onClick={() => downloadTaskFile(f.storagePath, f.filename)} className="p-1 hover:bg-gray-100 rounded" title="Download">
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleFileDelete(f.id)} className="p-1 hover:bg-red-100 rounded ml-1" title="Delete">
                            <Trash2 className="w-3.5 h-3.5 text-red-600" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-3">
                    <div className="border-b border-[#cecece]">
                      <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 px-4 py-2 text-[12px] font-semibold text-[#646464] sticky top-0 bg-white z-10">
                        <div>Name</div>
                        <div>Size</div>
                        <div>Type</div>
                        <div>Date</div>
                        <div>Author</div>
                      </div>
                    </div>
                    <div className="text-center py-8 text-[12px] text-[#646464] flex flex-col items-center justify-center">
                      <FileText className="w-6 h-6 mb-1 opacity-60" />
                      <span>No attachments yet</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-[#cecece] bg-white mt-auto">
                <div className="max-w-[840px] mx-auto px-5 py-1 flex justify-end">
                  <button
                    className="inline-flex items-center gap-1 text-[12px] text-[#646464] hover:text-red-600 hover:bg-red-50/40 rounded px-2 py-1 transition-colors"
                    onClick={async () => { if (task && onDeleteTask) { const ok = window.confirm('Delete this task? This cannot be undone.'); if (ok) await onDeleteTask(task.id); } }}
                    aria-label="Delete Task"
                    title="Delete Task"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Task</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


