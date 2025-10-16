import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreVertical, Trash2, MapPin } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { UserAvatar } from "./UserAvatar";
import type { Project, User, Client } from "@/lib/api/types";

interface ProjectCardProps {
  project: Project;
  client: Client | null;
  team: User[];
  taskCount: number;
  onDelete: (id: string) => void;
  onClick: () => void;
}

const phaseColors = {
  design: 'default',
  permit: 'secondary',
  build: 'default',
  completed: 'outline',
} as const;

const statusColors = {
  active: 'default',
  on_hold: 'secondary',
  archived: 'outline',
} as const;

export const ProjectCard = ({ project, client, team, taskCount, onDelete, onClick }: ProjectCardProps) => {
  return (
    <Card 
      className="hover:shadow-lg transition-all duration-300 cursor-pointer border-border group"
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
        <div className="space-y-1 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <CardTitle className="text-lg truncate">{project.name}</CardTitle>
            <Badge variant={phaseColors[project.phase]} className="capitalize text-xs">
              {project.phase}
            </Badge>
            <Badge variant={statusColors[project.status]} className="capitalize text-xs">
              {project.status.replace('_', ' ')}
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
              className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
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
      <CardContent className="space-y-4">
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span>{project.progress}%</span>
          </div>
          <Progress value={project.progress} className="h-2" />
        </div>

        {/* Address */}
        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span className="line-clamp-1">{project.address}</span>
        </div>

        {/* Client */}
        {client && (
          <div className="text-sm">
            <span className="text-muted-foreground">Client: </span>
            <span className="font-medium">{client.name}</span>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="text-sm text-muted-foreground">
            {taskCount} {taskCount === 1 ? 'task' : 'tasks'}
          </div>
          <div className="flex items-center -space-x-2">
            {team.slice(0, 3).map(user => (
              <UserAvatar key={user.id} user={user} size="sm" />
            ))}
            {team.length > 3 && (
              <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs">
                +{team.length - 3}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
