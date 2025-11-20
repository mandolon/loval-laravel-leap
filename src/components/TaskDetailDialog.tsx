import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar, Upload, FileText, Download, Trash2 } from "lucide-react";
import { TeamAvatar } from "@/components/TeamAvatar";
import type { Task, User } from "@/lib/api/types";
import { useUser } from "@/contexts/UserContext";
import { useTaskFiles, useUploadTaskFile, useDeleteTaskFile, downloadTaskFile } from "@/lib/api/hooks/useFiles";
import { supabase } from "@/integrations/supabase/client";

interface TaskDetailDialogProps {
  task: Task;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (updates: Partial<Task>) => void;
  assignees: User[];
  createdBy: User | null;
}

export function TaskDetailDialog({ 
  task, 
  open, 
  onOpenChange, 
  onUpdate,
  assignees,
  createdBy 
}: TaskDetailDialogProps) {
  const { user: currentUser } = useUser();
  const [title, setTitle] = useState(task.title);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [description, setDescription] = useState(task.description);
  const [dueDate, setDueDate] = useState(task.dueDate || "");
  const [fileAuthors, setFileAuthors] = useState<Record<string, User>>({});
  
  const { data: files = [], isLoading: filesLoading } = useTaskFiles(task.id);
  const uploadFileMutation = useUploadTaskFile();
  const deleteFileMutation = useDeleteTaskFile();

  const statusConfig = {
    task_redline: { 
      label: "TASK/REDLINE", 
      className: "bg-destructive text-destructive-foreground"
    },
    progress_update: { 
      label: "PROGRESS/UPDATE", 
      className: "bg-primary text-primary-foreground"
    },
    done_completed: { 
      label: "COMPLETE", 
      className: "bg-secondary text-secondary-foreground"
    },
  };

  const handleTitleBlur = () => {
    if (title !== task.title && title.trim()) {
      onUpdate({ title: title.trim() });
      setIsEditingTitle(false);
    } else if (!title.trim()) {
      setTitle(task.title);
      setIsEditingTitle(false);
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleTitleBlur();
    } else if (e.key === 'Escape') {
      setTitle(task.title);
      setIsEditingTitle(false);
    }
  };

  const handleDescriptionBlur = () => {
    if (description !== task.description) {
      onUpdate({ description });
    }
  };

  const handleDueDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    setDueDate(newDate);
    onUpdate({ dueDate: newDate });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Fetch file authors
  useEffect(() => {
    const fetchAuthors = async () => {
      const authorIds = [...new Set(files.map(f => f.uploadedBy))];
      if (authorIds.length === 0) return;

      const { data } = await supabase
        .from('users')
        .select('*')
        .in('id', authorIds);

      if (data) {
        const authorsMap: Record<string, User> = {};
        data.forEach(user => {
          authorsMap[user.id] = {
            id: user.id,
            shortId: user.short_id,
            authId: user.auth_id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            avatarUrl: user.avatar_url,
            lastActiveAt: user.last_active_at,
            createdAt: user.created_at,
            updatedAt: user.updated_at,
            deletedAt: user.deleted_at,
            deletedBy: user.deleted_by,
          };
        });
        setFileAuthors(authorsMap);
      }
    };

    fetchAuthors();
  }, [files]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    uploadFileMutation.mutate({
      file,
      taskId: task.id,
      projectId: task.projectId,
    });

    // Reset input
    e.target.value = '';
  };

  const handleFileDownload = async (storagePath: string, filename: string) => {
    try {
      await downloadTaskFile(storagePath, filename);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const handleFileDelete = (fileId: string) => {
    if (confirm('Are you sure you want to delete this file?')) {
      deleteFileMutation.mutate({ fileId, taskId: task.id });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="sr-only">Task Details</DialogTitle>
          <DialogDescription className="sr-only">
            View and edit task details, attachments, and information
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-8">
          {/* Header */}
          <div className="flex items-center gap-3">
            <Badge className={statusConfig[task.status].className}>
              {statusConfig[task.status].label}
            </Badge>
            <span className="text-sm text-muted-foreground font-mono">
              {task.shortId}
            </span>
          </div>

          {/* Title */}
          {isEditingTitle ? (
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={handleTitleKeyDown}
              className="text-2xl font-bold h-auto py-2"
              autoFocus
            />
          ) : (
            <h2 
              className="text-2xl font-bold cursor-pointer hover:text-primary transition-colors"
              onClick={() => setIsEditingTitle(true)}
            >
              {task.title}
            </h2>
          )}

          {/* Task Info Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            {/* Created By */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Created by</Label>
              {createdBy ? (
                <div className="flex">
                  <TeamAvatar user={{ ...createdBy, avatar_url: createdBy.avatarUrl }} size="sm" />
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">Loading...</span>
              )}
            </div>

            {/* Date Created */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Date Created</Label>
              <div className="text-sm">{formatDate(task.createdAt)}</div>
            </div>

            {/* Assigned To */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Assigned to</Label>
              <div className="flex items-center gap-1">
                {assignees.map((assignee) => (
                  <TeamAvatar key={assignee.id} user={{ ...assignee, avatar_url: assignee.avatarUrl }} size="sm" />
                ))}
                {assignees.length === 0 && (
                  <span className="text-sm text-muted-foreground">Unassigned</span>
                )}
              </div>
            </div>

            {/* Track Time */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Track Time</Label>
              <div className="text-sm">{task.actualTime || 0}h</div>
            </div>

            {/* Due Date */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Due Date</Label>
              <div className="relative">
                {dueDate ? (
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={handleDueDateChange}
                    className="h-8 text-sm"
                  />
                ) : (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 px-2 text-muted-foreground"
                    onClick={() => setDueDate(new Date().toISOString().split('T')[0])}
                  >
                    <Calendar className="h-4 w-4 mr-1" />
                    Set date
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Textarea
              placeholder="Describe the task details, requirements, or any relevant information..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={handleDescriptionBlur}
              rows={8}
              className="resize-none"
            />
          </div>

          {/* Attachments */}
          <div className="space-y-3">
            <Label className="font-semibold">Attachments</Label>
            
            {/* Upload Area */}
            <label className="block">
              <input
                type="file"
                className="hidden"
                onChange={handleFileUpload}
                disabled={uploadFileMutation.isPending}
              />
              <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer">
                <Upload className={`h-8 w-8 mx-auto mb-2 text-muted-foreground ${uploadFileMutation.isPending ? 'animate-pulse' : ''}`} />
                <p className="text-sm text-muted-foreground mb-1">
                  {uploadFileMutation.isPending ? 'Uploading...' : 'Drop your files here to upload'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {uploadFileMutation.isPending ? 'Please wait' : '(Click box to select files)'}
                </p>
              </div>
            </label>

            {/* Attachments Table */}
            {filesLoading ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                Loading files...
              </div>
            ) : files.length > 0 ? (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left py-3 px-4 text-sm font-medium">Name</th>
                      <th className="text-left py-3 px-4 text-sm font-medium">Size</th>
                      <th className="text-left py-3 px-4 text-sm font-medium">Type</th>
                      <th className="text-left py-3 px-4 text-sm font-medium">Date</th>
                      <th className="text-left py-3 px-4 text-sm font-medium">Author</th>
                      <th className="text-center py-3 px-4 text-sm font-medium w-[100px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {files.map((file) => {
                      const author = fileAuthors[file.uploadedBy];
                      return (
                        <tr key={file.id} className="border-t hover:bg-muted/30">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm truncate max-w-[200px]" title={file.filename}>
                                {file.filename}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm">
                            {file.filesize ? formatFileSize(file.filesize) : '—'}
                          </td>
                          <td className="py-3 px-4 text-sm">
                            {file.mimetype?.split('/')[1]?.toUpperCase() || '—'}
                          </td>
                          <td className="py-3 px-4 text-sm">
                            {formatDate(file.createdAt)}
                          </td>
                          <td className="py-3 px-4">
                            {author ? (
                              <div className="flex items-center gap-2">
                                <TeamAvatar user={{ ...author, avatar_url: author.avatarUrl }} size="sm" />
                                <span className="text-sm">{author.name}</span>
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => handleFileDownload(file.storagePath, file.filename)}
                                title="Download"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                onClick={() => handleFileDelete(file.id)}
                                disabled={deleteFileMutation.isPending}
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No attachments yet
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
