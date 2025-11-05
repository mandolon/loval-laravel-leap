import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Upload, X, FileText, Image as ImageIcon, Trash2, Calendar } from 'lucide-react';
import type { Task, User } from '@/lib/api/types';
import { TeamAvatar } from '@/components/TeamAvatar';
import { AssigneeGroup } from '@/apps/team/components/AssigneeGroup';
import { useTaskFiles, useUploadTaskFile, useDeleteTaskFile, downloadTaskFile } from '@/lib/api/hooks/useFiles';

type TaskDrawerProps = {
  open: boolean;
  task: Task | null;
  width: number;
  topOffset?: number;
  onWidthChange?: (width: number) => void;
  projectName?: string;
  onClose: () => void;
  onUpdate?: (updates: Partial<Task>) => void;
  assignees?: User[];
  users?: User[];
  createdBy?: User | null;
  onDeleteTask?: (taskId: string) => Promise<void> | void;
};

const BADGE_BG = { red: '#d14c4c', blue: '#4c75d1', green: '#4cd159' } as const;
const STATUS_CONFIG: Record<Task['status'], { label: string; tone: keyof typeof BADGE_BG }> = {
  task_redline: { label: 'TASK/REDLINE', tone: 'red' },
  progress_update: { label: 'PROGRESS/UPDATE', tone: 'blue' },
  done_completed: { label: 'COMPLETE', tone: 'green' },
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

export default function TaskDrawer({ open, task, width, topOffset = 0, onWidthChange, projectName, onClose, onUpdate, assignees = [], users = [], createdBy, onDeleteTask }: TaskDrawerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragState = useRef<{ startX: number; startWidth: number } | null>(null);
  const usersById = useMemo(() => {
    const rec: Record<string, User> = {};
    users.forEach((u) => { rec[u.id] = u; });
    return rec;
  }, [users]);

  const { data: files = [] } = useTaskFiles(task?.id || '');
  const uploadFileMutation = useUploadTaskFile();
  const deleteFileMutation = useDeleteTaskFile();

  const handleTitleEdit = useCallback((value: string) => {
    if (!task || !onUpdate) return;
    const trimmed = value.trim();
    if (trimmed && trimmed !== task.title) onUpdate({ title: trimmed });
  }, [task, onUpdate]);

  const handleDescriptionBlur = useCallback((value: string) => {
    if (!task || !onUpdate) return;
    if (value !== task.description) onUpdate({ description: value });
  }, [task, onUpdate]);

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

  const handleDownload = useCallback(async (storagePath: string, filename: string) => {
    await downloadTaskFile(storagePath, filename);
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
      // @ts-expect-error: DataTransfer types
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
    return (
      <div
        className="absolute right-0 bg-white border-l"
        style={{ width, top: topOffset, bottom: -48, transform: 'translateX(100%)' }}
        aria-hidden
      />
    );
  }

  return (
    <div
      className="absolute right-0 bg-white border-l"
      style={{ width, top: topOffset, bottom: -48 }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="task-drawer-title"
    >
      {/* Resize handle on the left edge */}
      <div
        className="absolute left-0 top-0 h-full w-1 cursor-col-resize z-20"
        onMouseDown={(e) => {
          e.preventDefault();
          dragState.current = { startX: e.clientX, startWidth: width };
          const onMove = (ev: MouseEvent) => {
            if (!dragState.current || !onWidthChange) return;
            const dx = dragState.current.startX - ev.clientX; // moving left increases width
            const next = Math.max(420, Math.min(900, Math.round(dragState.current.startWidth + dx)));
            onWidthChange(next);
          };
          const onUp = () => {
            dragState.current = null;
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
          };
          document.addEventListener('mousemove', onMove);
          document.addEventListener('mouseup', onUp);
        }}
        title="Drag to resize"
      />

      <div
        ref={containerRef}
        className={`h-full transition-transform duration-200 ease-out ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex flex-col h-full bg-white" data-testid="task-drawer-root">
          {/* Header */}
          <div className="border-b border-[#cecece] bg-white shadow-[inset_0_-1px_0_0_#f1f1f1]">
            <div className="py-2 px-3">
              <div className="flex items-center justify-between px-5">
                <div className="text-[14px] text-[#202020] font-medium leading-tight">{projectName || 'Project'}</div>
                <div className="flex items-center gap-1">
                  <button
                    className="w-7 h-7 inline-flex items-center justify-center rounded hover:bg-gray-100"
                    onClick={onClose}
                    aria-label="Close task detail"
                    title="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Main */}
          <div className="flex-1 overflow-auto p-5">
            <div className="max-w-[840px] mx-auto">
              {/* Status + ID */}
              <div className="flex items-center justify-between mt-4 mb-2">
                <div className="flex items-center gap-2 relative">
                  <span className="px-2 py-[2px] rounded text-[12px] font-medium tracking-[0.02em]" style={{ background: BADGE_BG[STATUS_CONFIG[task.status].tone], color: '#fff' }}>{STATUS_CONFIG[task.status].label}</span>
                  <div className="flex items-center gap-2 text-[12px] text-[#646464] pl-2">
                    <span className="text-[#202020]">{task.shortId}</span>
                    <span className="w-px h-4 bg-gray-300" />
                    <span className="inline-block w-[9px] h-[9px] rounded-full" style={{ backgroundColor: STATUS_CONFIG[task.status].tone === 'green' ? '#4cd159' : STATUS_CONFIG[task.status].tone === 'red' ? '#d14c4c' : '#4c75d1' }} />
                  </div>
                </div>
              </div>

              {/* Title */}
              <div className="my-3">
                <input
                  id="task-drawer-title"
                  type="text"
                  defaultValue={task.title}
                  onBlur={(e) => handleTitleEdit(e.target.value)}
                  className="w-full text-xl font-semibold tracking-tight outline-none border-b border-transparent focus:border-[#4C75D1] py-2"
                  aria-label="Task title"
                />
              </div>

              {/* Fields Row */}
              <div className="grid grid-cols-5 gap-5 mb-5 items-start">
                {/* Created by */}
                <div className="pl-4">
                  <label className="text-[12px] text-[#646464] block mb-1.5">Created by</label>
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
                  <label className="text-[12px] text-[#646464] block mb-1.5">Date Created</label>
                  <div className="text-[12px] text-[#202020]">{formatShortDate(task.createdAt)}</div>
                </div>

                {/* Assigned to */}
                <div>
                  <label className="text-[12px] text-[#646464] block mb-1.5">Assigned to</label>
                  <div className="flex items-center">
                    <AssigneeGroup
                      value={task.assignees || []}
                      usersById={usersById}
                      onChange={(next) => onUpdate?.({ assignees: next })}
                    />
                  </div>
                </div>

                {/* Track Time */}
                <div>
                  <label className="text-[12px] text-[#646464] block mb-1.5">Track Time</label>
                  <div className="text-sm">{task.actualTime || 0}h</div>
                </div>

                {/* Due Date */}
                <div>
                  <label className="text-[12px] text-[#646464] block mb-1.5">Due Date</label>
                  <div className="relative">
                    {task.dueDate ? (
                      <input type="date" defaultValue={task.dueDate as any} onBlur={(e) => onUpdate?.({ dueDate: e.target.value })} className="h-8 text-sm border border-[#e5e7eb] rounded px-2" />
                    ) : (
                      <button className="h-8 px-2 text-muted-foreground inline-flex items-center gap-1" onClick={() => onUpdate?.({ dueDate: new Date().toISOString().split('T')[0] as any })}>
                        <Calendar className="h-4 w-4" />
                        Set date
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="mt-2 mb-6">
                <div className="rounded-md border border-[#e5e7eb] bg-white/80 focus-within:bg-white focus-within:border-[#4C75D1] focus-within:shadow-sm transition-colors">
                  <textarea
                    placeholder="Describe the task details, requirements, or any relevant information..."
                    className="min-h-[200px] w-full p-3 text-[14px] border-0 outline-none resize-none placeholder:text-gray-400"
                    defaultValue={task.description || ''}
                    onBlur={(e) => handleDescriptionBlur(e.target.value)}
                  />
                </div>
              </div>

              {/* Attachments */}
              <div className="mb-6">
                <h2 className="text-[12px] font-semibold mb-2 pl-3">Attachments</h2>
                <input ref={fileInputRef} type="file" multiple onChange={(e) => handleFileUpload(e.target.files)} className="hidden" />

                <div
                  className={`border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-colors ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-[#e5e7eb] bg-gray-50 hover:bg-gray-100'}`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="flex items-center justify-center gap-2 text-[12px] text-[#646464]">
                    <Upload className="w-4 h-4" />
                    <span>Drop your files here to upload</span>
                  </div>
                  <div className="text-[12px] text-[#646464] mt-1">(Click box to select files)</div>
                </div>

                {files.length > 0 ? (
                  <div className="mt-3 max-h-[340px] overflow-auto rounded-md">
                    <div className="border-b border-[#e5e7eb]">
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
                      <div key={f.id} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_40px] gap-4 px-4 py-2 text-[12px] border-b border-[#e5e7eb] hover:bg-gray-50 transition-colors group odd:bg-white even:bg-gray-50 min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          {getFileIcon(f.mimetype || null)}
                          <span className="text-[#202020] truncate" title={f.filename}>{f.filename}</span>
                        </div>
                        <div className="text-[#646464]">{formatFileSize(f.filesize)}</div>
                        <div className="text-[#646464]">{(f.mimetype?.split('/')[1] || 'File').toUpperCase()}</div>
                        <div className="text-[#646464]">{formatShortDate(f.createdAt)}</div>
                        <div className="text-[#646464]">—</div>
                        <div className="flex items-center justify-center">
                          <button onClick={() => handleDownload(f.storagePath, f.filename)} className="p-1 hover:bg-gray-100 rounded" title="Download">
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
                    <div className="border-b border-[#e5e7eb]">
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
              <div className="border-t border-[#e5e7eb] bg-white">
                <div className="px-5 py-2 flex justify-end">
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
    </div>
  );
}


