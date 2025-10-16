import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { MoreVertical, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Task } from "@/lib/api/types";

interface TaskItemProps {
  task: Task;
  onStatusChange: (id: string, status: Task['status']) => void;
  onDelete: (id: string) => void;
}

const statusColors = {
  todo: 'secondary',
  in_progress: 'default',
  done: 'outline',
} as const;

const priorityColors = {
  low: 'secondary',
  medium: 'default',
  high: 'destructive',
} as const;

export const TaskItem = ({ task, onStatusChange, onDelete }: TaskItemProps) => {
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
    <Card className="p-4 hover:shadow-md transition-all duration-200 group">
      <div className="flex items-start gap-4">
        <Checkbox 
          checked={isDone}
          onCheckedChange={handleStatusClick}
          className="mt-1"
        />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <h4 className={`font-medium ${isDone ? 'line-through text-muted-foreground' : ''}`}>
                {task.title}
              </h4>
              {task.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {task.description}
                </p>
              )}
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreVertical className="h-4 w-4" />
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
          
          <div className="flex gap-2 mt-3">
            <Badge variant={statusColors[task.status]} className="capitalize text-xs">
              {task.status.replace('_', ' ')}
            </Badge>
            <Badge variant={priorityColors[task.priority]} className="capitalize text-xs">
              {task.priority}
            </Badge>
          </div>
        </div>
      </div>
    </Card>
  );
};
