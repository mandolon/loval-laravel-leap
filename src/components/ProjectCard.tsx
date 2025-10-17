import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreVertical, Trash2, MapPin, Users, Archive } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import type { Project } from "@/lib/api/types";

interface ProjectCardProps {
  project: Project;
  onClick: () => void;
  onDelete?: (id: string) => void;
  onHardDelete?: (id: string) => void;
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
  completed: 'outline',
  archived: 'outline',
} as const;

const statusLabels = {
  pending: 'Pending',
  active: 'In Progress',
  completed: 'Completed',
  archived: 'Archived',
} as const;

export const ProjectCard = ({ project, onDelete, onHardDelete, onClick }: ProjectCardProps) => {
  const [hardDeleteDialogOpen, setHardDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  
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
            <Badge variant={statusColors[project.status]} className="text-xs">
              {statusLabels[project.status]}
            </Badge>
          </div>
          <CardDescription className="line-clamp-2">
            {project.description}
          </CardDescription>
        </div>
        {(onDelete || onHardDelete) && (
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
              {onDelete && (
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(project.id);
                  }}
                >
                  <Archive className="mr-2 h-4 w-4" />
                  Move to Trash
                </DropdownMenuItem>
              )}
              {onHardDelete && (
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.stopPropagation();
                    setHardDeleteDialogOpen(true);
                  }}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Permanently
                </DropdownMenuItem>
              )}
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

      {/* Hard Delete Confirmation Dialog */}
      <AlertDialog open={hardDeleteDialogOpen} onOpenChange={setHardDeleteDialogOpen}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently Delete Project?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <div className="text-destructive font-medium">
                ⚠️ This will permanently delete:
              </div>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Project: "{project.name}"</li>
                <li>{project.totalTasks} tasks</li>
                <li>All files (including from storage)</li>
                <li>All notes and invoices</li>
              </ul>
              <p className="text-sm font-medium">
                This action cannot be undone. Use "Move to Trash" for recoverable deletion.
              </p>
              <div className="space-y-2">
                <Label htmlFor="project-delete-confirm">
                  Type the project name to confirm:
                </Label>
                <Input
                  id="project-delete-confirm"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder={project.name}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={(e) => {
              e.stopPropagation();
              setDeleteConfirmText("");
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteConfirmText !== project.name}
              onClick={(e) => {
                e.stopPropagation();
                onHardDelete?.(project.id);
                setHardDeleteDialogOpen(false);
                setDeleteConfirmText("");
              }}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete Forever
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
