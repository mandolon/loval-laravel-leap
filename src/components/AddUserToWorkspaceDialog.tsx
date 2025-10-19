import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { UserPlus } from "lucide-react";
import { useAssignMember, useAllWorkspaces, useProjects } from "@/lib/api/hooks";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";

interface AddUserToWorkspaceDialogProps {
  userId: string;
  userName: string;
}

export function AddUserToWorkspaceDialog({ userId, userName }: AddUserToWorkspaceDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<"admin" | "team" | "client" | "consultant">("team");
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  
  const { toast } = useToast();
  const { data: workspaces } = useAllWorkspaces();
  const { data: projects } = useProjects(selectedWorkspaceId || "", { limit: 100 });
  const assignMember = useAssignMember();

  const handleNext = () => {
    if (!selectedWorkspaceId) {
      toast({
        title: "Workspace required",
        description: "Please select a workspace",
        variant: "destructive",
      });
      return;
    }
    setStep(2);
  };

  const handleSubmit = async () => {
    try {
      await assignMember.mutateAsync({
        workspaceId: selectedWorkspaceId,
        userId,
        role: selectedRole,
      });

      // TODO: Assign to selected projects if any
      // This will be handled by a separate mutation in the future

      toast({
        title: "Success",
        description: `${userName} added to workspace`,
      });

      setOpen(false);
      resetDialog();
    } catch (error) {
      console.error("Error assigning user:", error);
    }
  };

  const resetDialog = () => {
    setStep(1);
    setSelectedWorkspaceId("");
    setSelectedRole("team");
    setSelectedProjectIds([]);
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      resetDialog();
    }
  };

  const toggleProject = (projectId: string) => {
    setSelectedProjectIds(prev =>
      prev.includes(projectId)
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <UserPlus className="h-4 w-4 mr-2" />
          Add to Workspace
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        {step === 1 ? (
          <>
            <DialogHeader>
              <DialogTitle>Add {userName} to Workspace</DialogTitle>
              <DialogDescription>
                Step 1 of 2: Select workspace and role
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="workspace">Workspace</Label>
                <Select value={selectedWorkspaceId} onValueChange={setSelectedWorkspaceId}>
                  <SelectTrigger id="workspace">
                    <SelectValue placeholder="Select workspace..." />
                  </SelectTrigger>
                  <SelectContent>
                    {workspaces?.map((workspace) => (
                      <SelectItem key={workspace.id} value={workspace.id}>
                        {workspace.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={selectedRole} onValueChange={(value: any) => setSelectedRole(value)}>
                  <SelectTrigger id="role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="team">Team</SelectItem>
                    <SelectItem value="client">Client</SelectItem>
                    <SelectItem value="consultant">Consultant</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleNext}>
                Next
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Add {userName} to Workspace</DialogTitle>
              <DialogDescription>
                Step 2 of 2: Assign to projects (optional)
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              {projects && projects.length > 0 ? (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {projects.map((project) => (
                    <div key={project.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={project.id}
                        checked={selectedProjectIds.includes(project.id)}
                        onCheckedChange={() => toggleProject(project.id)}
                      />
                      <label
                        htmlFor={project.id}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {project.name}
                      </label>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No projects available in this workspace
                </p>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={handleSubmit} disabled={assignMember.isPending}>
                {assignMember.isPending ? "Adding..." : "Add to Workspace"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
