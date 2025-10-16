import { useState, useEffect } from "react";
import { Building2, Plus, Check } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api/client";
import type { Workspace } from "@/lib/api/types";
import { useToast } from "@/hooks/use-toast";

interface WorkspaceSwitcherProps {
  onWorkspaceChange?: (workspaceId: string) => void;
}

export function WorkspaceSwitcher({ onWorkspaceChange }: WorkspaceSwitcherProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [newWorkspaceDescription, setNewWorkspaceDescription] = useState("");

  useEffect(() => {
    loadWorkspaces();
  }, []);

  const loadWorkspaces = () => {
    const allWorkspaces = api.workspaces.list();
    setWorkspaces(allWorkspaces);
    
    // Use workspace from URL if available, otherwise use stored value
    const currentId = workspaceId || api.workspaces.getCurrentWorkspaceId();
    if (currentId) {
      setCurrentWorkspaceId(currentId);
      api.workspaces.setCurrentWorkspaceId(currentId);
    } else if (allWorkspaces.length > 0) {
      // Set first workspace as current if none selected
      setCurrentWorkspaceId(allWorkspaces[0].id);
      api.workspaces.setCurrentWorkspaceId(allWorkspaces[0].id);
      navigate(`/workspace/${allWorkspaces[0].id}/projects`);
    }
  };

  const handleWorkspaceChange = (newWorkspaceId: string) => {
    setCurrentWorkspaceId(newWorkspaceId);
    api.workspaces.setCurrentWorkspaceId(newWorkspaceId);
    onWorkspaceChange?.(newWorkspaceId);
  };

  const handleCreateWorkspace = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newWorkspaceName.trim()) return;

    const newWorkspace = api.workspaces.create({
      name: newWorkspaceName.trim(),
      description: newWorkspaceDescription.trim(),
      icon: '🏢',
    });

    setWorkspaces([...workspaces, newWorkspace]);
    setCurrentWorkspaceId(newWorkspace.id);
    api.workspaces.setCurrentWorkspaceId(newWorkspace.id);
    
    toast({
      title: "Workspace created",
      description: `${newWorkspace.name} has been created successfully`,
    });

    setNewWorkspaceName("");
    setNewWorkspaceDescription("");
    setCreateDialogOpen(false);
    onWorkspaceChange?.(newWorkspace.id);
    
    // Navigate to new workspace
    navigate(`/workspace/${newWorkspace.id}/projects`);
  };

  const currentWorkspace = workspaces.find(w => w.id === currentWorkspaceId);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-2 h-auto py-2 px-3 hover:bg-accent/30"
          >
            <Building2 className="h-4 w-4 flex-shrink-0" />
            <span className="truncate text-sm">{currentWorkspace?.name || 'Select Workspace'}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 bg-popover">
          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
            Workspaces
          </div>
          <DropdownMenuSeparator />
          {workspaces.map((workspace) => (
            <DropdownMenuItem
              key={workspace.id}
              onClick={() => handleWorkspaceChange(workspace.id)}
              className="cursor-pointer"
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{workspace.icon}</span>
                  <span className="text-sm">{workspace.name}</span>
                </div>
                {currentWorkspaceId === workspace.id && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </div>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setCreateDialogOpen(true)}
            className="cursor-pointer"
          >
            <Plus className="mr-2 h-4 w-4" />
            <span className="text-sm">Create workspace</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Workspace</DialogTitle>
            <DialogDescription>
              Organize your projects by creating a new workspace
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateWorkspace} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="workspace-name">Workspace Name</Label>
              <Input
                id="workspace-name"
                placeholder="e.g., Commercial Projects"
                value={newWorkspaceName}
                onChange={(e) => setNewWorkspaceName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="workspace-description">Description (optional)</Label>
              <Textarea
                id="workspace-description"
                placeholder="Describe this workspace..."
                value={newWorkspaceDescription}
                onChange={(e) => setNewWorkspaceDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Create Workspace</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
