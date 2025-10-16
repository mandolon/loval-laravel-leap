import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreVertical, Trash2, MapPin, Users } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import type { Project } from "@/lib/api/types";

interface ProjectCardProps {
  project: Project;
  onClick: () => void;
  onDelete?: (id: string) => void;
}

const phaseColors = {
  'Pre-Design': 'secondary',
  'Design': 'default',
  'Permit': 'secondary',
  'Build': 'default',
} as const;

const statusColors = {
  pending: 'secondary',
  active: 'default',
  on_hold: 'outline',
  completed: 'outline',
  archived: 'outline',
} as const;

export const ProjectCard = ({ project, onDelete, onClick }: ProjectCardProps) => {
  const formatAddress = () => {
    const addr = project.address;
    if (!addr.streetNumber && !addr.streetName && !addr.city) return 'No address';
    return `${addr.streetNumber || ''} ${addr.streetName || ''}, ${addr.city || ''}, ${addr.state || ''} ${addr.zipCode || ''}`.trim();
  };

  const clientName = project.primaryClient.firstName && project.primaryClient.lastName
    ? `${project.primaryClient.firstName} ${project.primaryClient.lastName}`
    : project.primaryClient.email || 'No client';

  return (
    <Card 
      className="hover:shadow-lg transition-all duration-300 cursor-pointer border-border group"
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
        <div className="space-y-1 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <CardTitle className="text-lg truncate">{project.name}</CardTitle>
            <Badge variant="outline" className="text-xs font-mono">
              {project.shortId}
            </Badge>
            <Badge variant={phaseColors[project.phase]} className="text-xs">
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
        {onDelete && (
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
        )}
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
          <span className="line-clamp-1">{formatAddress()}</span>
        </div>

        {/* Client */}
        <div className="text-sm">
          <span className="text-muted-foreground">Client: </span>
          <span className="font-medium">{clientName}</span>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t text-sm text-muted-foreground">
          <div>
            {project.completedTasks}/{project.totalTasks} tasks
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {project.teamMemberCount} team
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
