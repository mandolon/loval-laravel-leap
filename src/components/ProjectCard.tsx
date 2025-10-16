import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreVertical, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Project } from "@/lib/api/types";

interface ProjectCardProps {
  project: Project;
  taskCount: number;
  onDelete: (id: string) => void;
  onClick: () => void;
}

export const ProjectCard = ({ project, taskCount, onDelete, onClick }: ProjectCardProps) => {
  return (
    <Card 
      className="hover:shadow-lg transition-all duration-300 cursor-pointer border-border group"
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div className="space-y-1 flex-1">
          <div className="flex items-center gap-2">
            <CardTitle className="text-xl">{project.name}</CardTitle>
            <Badge 
              variant={project.status === 'active' ? 'default' : 'secondary'}
              className="capitalize"
            >
              {project.status}
            </Badge>
          </div>
          <CardDescription className="line-clamp-2">
            {project.description}
          </CardDescription>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
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
              onClick={(e) => {
                e.stopPropagation();
                onDelete(project.id);
              }}
              className="text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Project
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-muted-foreground">
          {taskCount} {taskCount === 1 ? 'task' : 'tasks'}
        </div>
      </CardContent>
    </Card>
  );
};
