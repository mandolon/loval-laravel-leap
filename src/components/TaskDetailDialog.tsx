import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Calendar, Upload, FileText } from "lucide-react";
import type { Task, User } from "@/lib/api/types";
import { useUser } from "@/contexts/UserContext";

interface TaskDetailDialogProps {
  task: Task;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (updates: Partial<Task>) => void;
  assignees: User[];
  createdBy: User;
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
  const [description, setDescription] = useState(task.description);
  const [dueDate, setDueDate] = useState(task.dueDate || "");

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <Badge className={statusConfig[task.status].className}>
              {statusConfig[task.status].label}
            </Badge>
            <span className="text-sm text-muted-foreground font-mono">
              {task.id.substring(0, 8).toUpperCase()}
            </span>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold">{task.title}</h2>

          {/* Task Info Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            {/* Created By */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Created by</Label>
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarFallback 
                    className="text-white text-xs"
                    style={{ background: createdBy.avatarUrl || 'linear-gradient(135deg, hsl(280, 70%, 60%) 0%, hsl(320, 80%, 65%) 100%)' }}
                  >
                    {createdBy.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm">{createdBy.name}</span>
              </div>
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
                  <Avatar key={assignee.id} className="h-6 w-6">
                    <AvatarFallback 
                      className="text-white text-xs"
                      style={{ background: assignee.avatarUrl || 'linear-gradient(135deg, hsl(280, 70%, 60%) 0%, hsl(320, 80%, 65%) 100%)' }}
                    >
                      {assignee.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
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
            <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer">
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-1">
                Drop your files here to upload
              </p>
              <p className="text-xs text-muted-foreground">
                (Click box to select files)
              </p>
            </div>

            {/* Attachments Table */}
            {task.attachedFiles && task.attachedFiles.length > 0 ? (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left py-3 px-4 text-sm font-medium">Name</th>
                      <th className="text-left py-3 px-4 text-sm font-medium">Size</th>
                      <th className="text-left py-3 px-4 text-sm font-medium">Category</th>
                      <th className="text-left py-3 px-4 text-sm font-medium">Date</th>
                      <th className="text-left py-3 px-4 text-sm font-medium">Author</th>
                    </tr>
                  </thead>
                  <tbody>
                    {task.attachedFiles.map((fileId) => (
                      <tr key={fileId} className="border-t hover:bg-muted/30">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">File {fileId.substring(0, 8)}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm">—</td>
                        <td className="py-3 px-4 text-sm">—</td>
                        <td className="py-3 px-4 text-sm">—</td>
                        <td className="py-3 px-4 text-sm">—</td>
                      </tr>
                    ))}
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
