import { useState } from "react";
import { useAllWorkspaces } from "@/lib/api/hooks/useWorkspaces";
import { useProjects } from "@/lib/api/hooks/useProjects";
import { useAssignMember } from "@/lib/api/hooks/useWorkspaceMembers";
import { useAssignProjectMember } from "@/lib/api/hooks/useProjectMembers";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface AddUserToWorkspaceDialogProps {
  userId: string;
  userName: string;
  userWorkspaceIds: string[];
}

export function AddUserToWorkspaceDialog({ 
  userId, 
  userName,
  userWorkspaceIds 
}: AddUserToWorkspaceDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedWorkspaceIds, setSelectedWorkspaceIds] = useState<string[]>([]);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  
  const { data: workspaces, isLoading: isLoadingWorkspaces } = useAllWorkspaces();
  const { data: allProjects } = useProjects('', { limit: 1000 });
  
  const assignMember = useAssignMember();
  const assignProjectMember = useAssignProjectMember();
  
  // Filter available workspaces
  const availableWorkspaces = workspaces?.filter(ws => 
    !userWorkspaceIds.includes(ws.id)
  ) || [];
  
  // Filter projects by selected workspaces
  const availableProjects = allProjects?.filter(p => 
    selectedWorkspaceIds.includes(p.workspaceId)
  ) || [];
  
  const toggleWorkspace = (workspaceId: string) => {
    setSelectedWorkspaceIds(prev => 
      prev.includes(workspaceId) 
        ? prev.filter(id => id !== workspaceId)
        : [...prev, workspaceId]
    );
  };
  
  const toggleProject = (projectId: string) => {
    setSelectedProjectIds(prev => 
      prev.includes(projectId) 
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    );
  };
  
  const handleSubmit = async () => {
    if (selectedWorkspaceIds.length === 0) {
      toast({
        title: "No workspaces selected",
        description: "Please select at least one workspace",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Assign to workspaces
      for (const workspaceId of selectedWorkspaceIds) {
        await assignMember.mutateAsync({ 
          userId, 
          workspaceId 
        });
      }
      
      // Assign to projects
      for (const projectId of selectedProjectIds) {
        await assignProjectMember.mutateAsync({ 
          userId, 
          projectId 
        });
      }
      
      resetDialog();
      setOpen(false);
    } catch (error) {
      console.error('Error assigning user:', error);
    }
  };
  
  const resetDialog = () => {
    setSelectedWorkspaceIds([]);
    setSelectedProjectIds([]);
  };
  
  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetDialog();
    }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Plus className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add {userName} to Workspaces/Projects</DialogTitle>
          <DialogDescription>
            Select workspaces and optionally assign to specific projects
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Workspaces Section */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Workspaces</Label>
            {availableWorkspaces.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                User is already assigned to all workspaces
              </p>
            ) : (
              <div className="space-y-2">
                {availableWorkspaces.map((workspace) => (
                  <div key={workspace.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`workspace-${workspace.id}`}
                      checked={selectedWorkspaceIds.includes(workspace.id)}
                      onCheckedChange={() => toggleWorkspace(workspace.id)}
                    />
                    <Label
                      htmlFor={`workspace-${workspace.id}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {workspace.name}
                    </Label>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Projects Section (only if workspaces selected) */}
          {selectedWorkspaceIds.length > 0 && (
            <div className="space-y-3 border-t pt-4">
              <Label className="text-base font-semibold">
                Projects (Optional)
              </Label>
              {availableProjects.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No projects in selected workspaces
                </p>
              ) : (
                <div className="space-y-3">
                  {selectedWorkspaceIds.map((workspaceId) => {
                    const workspace = workspaces?.find(w => w.id === workspaceId);
                    const workspaceProjects = availableProjects.filter(
                      p => p.workspaceId === workspaceId
                    );
                    
                    if (workspaceProjects.length === 0) return null;
                    
                    return (
                      <div key={workspaceId} className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">
                          {workspace?.name}
                        </p>
                        <div className="ml-4 space-y-2">
                          {workspaceProjects.map((project) => (
                            <div key={project.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`project-${project.id}`}
                                checked={selectedProjectIds.includes(project.id)}
                                onCheckedChange={() => toggleProject(project.id)}
                              />
                              <Label
                                htmlFor={`project-${project.id}`}
                                className="text-sm font-normal cursor-pointer"
                              >
                                {project.name}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={selectedWorkspaceIds.length === 0 || assignMember.isPending}
          >
            {assignMember.isPending ? 'Assigning...' : 'Assign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
