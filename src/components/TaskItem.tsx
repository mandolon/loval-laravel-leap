import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { MoreVertical, Trash2, Calendar } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { UserAvatar } from "./UserAvatar";
import type { Task, User } from "@/lib/api/types";
import { format } from "date-fns";

interface TaskItemProps {
  task: Task;
  assignees: User[];
  onStatusChange: (id: string, status: Task['status']) => void;
  onDelete: (id: string) => void;
}

const priorityColors = {
  low: 'secondary',
  medium: 'default',
  high: 'default',
  urgent: 'destructive',
} as const;

export const TaskItem = ({ task, assignees, onStatusChange, onDelete }: TaskItemProps) => {
  const isDone = task.status === 'done';

  const handleStatusClick = () => {
    if (task.status === 'todo') {
      onStatusChange(task.id, 'in_progress');
    } else if (task.status === 'in_progress') {
      onStatusChange(task.id, 'done');
    } else {
      onStatusChange(task.id, 'todo');
    }
  };

  return (
    <Card className="p-4 hover:shadow-md transition-all duration-200 group bg-card">
      <div className="flex items-start gap-3">
        <Checkbox 
          checked={isDone}
          onCheckedChange={handleStatusClick}
          className="mt-1"
        />
        
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h4 className={`font-medium text-sm ${isDone ? 'line-through text-muted-foreground' : ''}`}>
              {task.title}
            </h4>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7"
                >
                  <MoreVertical className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem 
                  onClick={() => onDelete(task.id)}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Task
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {task.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {task.description}
            </p>
          )}
          
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={priorityColors[task.priority]} className="capitalize text-xs">
              {task.priority}
            </Badge>

            {task.dueDate && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {format(new Date(task.dueDate), 'MMM d')}
              </div>
            )}

            {assignees.length > 0 && (
              <div className="flex items-center -space-x-1 ml-auto">
                {assignees.slice(0, 2).map(user => (
                  <UserAvatar key={user.id} user={user} size="sm" />
                ))}
                {assignees.length > 2 && (
                  <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[10px]">
                    +{assignees.length - 2}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};
