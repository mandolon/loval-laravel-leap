import { useState } from "react";
import { Building2, Plus, Check, Settings, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
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
import { useWorkspaces } from "@/hooks/useWorkspaces";
import { useToast } from "@/hooks/use-toast";
import { useUpdateWorkspace, useDeleteWorkspace } from "@/lib/api/hooks/useWorkspaces";
import { WorkspaceMembersTable } from "@/components/workspace/WorkspaceMembersTable";
import { DialogFooter } from "@/components/ui/dialog";
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

interface WorkspaceSwitcherProps {
  onWorkspaceChange?: (workspaceId: string) => void;
}

export function WorkspaceSwitcher({ onWorkspaceChange }: WorkspaceSwitcherProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const {
    workspaces,
    currentWorkspace,
    currentWorkspaceId,
    createWorkspace,
    switchWorkspace,
  } = useWorkspaces();
  
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [newWorkspaceDescription, setNewWorkspaceDescription] = useState("");
  const [editWorkspaceName, setEditWorkspaceName] = useState("");
  const [editWorkspaceDescription, setEditWorkspaceDescription] = useState("");
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  
  const updateWorkspaceMutation = useUpdateWorkspace();
  const deleteWorkspaceMutation = useDeleteWorkspace();

  const handleWorkspaceChange = (newWorkspaceId: string) => {
    switchWorkspace(newWorkspaceId);
    onWorkspaceChange?.(newWorkspaceId);
    navigate(`/workspace/${newWorkspaceId}/projects`);
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newWorkspaceName.trim()) return;

    const newWorkspace = await createWorkspace({
      name: newWorkspaceName.trim(),
      description: newWorkspaceDescription.trim(),
      icon: '🏢',
    });

    if (newWorkspace) {
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
    }
  };

  const handleOpenSettings = () => {
    if (currentWorkspace) {
      setEditWorkspaceName(currentWorkspace.name);
      setEditWorkspaceDescription(currentWorkspace.description || "");
      setSettingsDialogOpen(true);
    }
  };

  const handleUpdateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editWorkspaceName.trim() || !currentWorkspaceId) return;

    updateWorkspaceMutation.mutate(
      {
        id: currentWorkspaceId,
        input: {
          name: editWorkspaceName.trim(),
          description: editWorkspaceDescription.trim(),
        },
      },
      {
        onSuccess: () => {
          setSettingsDialogOpen(false);
        },
      }
    );
  };

  const handleDeleteWorkspace = async () => {
    if (!currentWorkspaceId || deleteConfirmText !== "DELETE") return;
    
    deleteWorkspaceMutation.mutate(currentWorkspaceId, {
      onSuccess: () => {
        const remainingWorkspaces = workspaces.filter(w => w.id !== currentWorkspaceId);
        
        if (remainingWorkspaces.length > 0) {
          switchWorkspace(remainingWorkspaces[0].id);
          navigate(`/workspace/${remainingWorkspaces[0].id}/projects`);
        } else {
          // Navigate to no workspace page
          navigate('/');
        }
        
        setDeleteDialogOpen(false);
        setDeleteConfirmText("");
        setSettingsDialogOpen(false);
      },
    });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-2 h-auto py-2 px-3 hover:bg-accent/30"
          >
            <span className="truncate text-sm">{currentWorkspace?.name || 'Select Workspace'}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 bg-popover z-50">
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
                <span className="text-sm">{workspace.name}</span>
                {currentWorkspaceId === workspace.id && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </div>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleOpenSettings}
            className="cursor-pointer"
          >
            <Settings className="mr-2 h-4 w-4" />
            <span className="text-sm">Workspace settings</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setCreateDialogOpen(true)}
            className="cursor-pointer"
          >
            <Plus className="mr-2 h-4 w-4" />
            <span className="text-sm">Create workspace</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Create Workspace Dialog */}
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

      {/* Workspace Settings Dialog */}
      <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Workspace Settings</DialogTitle>
            <DialogDescription>
              Update your workspace name and description
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateWorkspace} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="edit-workspace-name">Workspace Name</Label>
              <Input
                id="edit-workspace-name"
                placeholder="e.g., Commercial Projects"
                value={editWorkspaceName}
                onChange={(e) => setEditWorkspaceName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-workspace-description">Description (optional)</Label>
              <Textarea
                id="edit-workspace-description"
                placeholder="Describe this workspace..."
                value={editWorkspaceDescription}
                onChange={(e) => setEditWorkspaceDescription(e.target.value)}
                rows={3}
              />
            </div>
            
            <div className="space-y-4 pt-4 border-t">
              {currentWorkspaceId && (
                <WorkspaceMembersTable workspaceId={currentWorkspaceId} />
              )}
            </div>
            
            <div className="space-y-4 pt-4 border-t border-destructive/20">
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-destructive flex items-center gap-2">
                  <Trash2 className="h-4 w-4" />
                  Danger Zone
                </h3>
                <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Delete Workspace</p>
                      <p className="text-xs text-muted-foreground">
                        Permanently delete this workspace and all projects within it. This action cannot be undone.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault();
                        setDeleteDialogOpen(true);
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSettingsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateWorkspaceMutation.isPending}>
                {updateWorkspaceMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Workspace Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workspace?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <div className="text-destructive font-medium">
                ⚠️ This will permanently delete:
              </div>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Workspace: "{currentWorkspace?.name}"</li>
                <li>All projects in this workspace</li>
                <li>All tasks, files, notes, and invoices</li>
              </ul>
              <p className="text-sm font-medium">
                This action cannot be undone.
              </p>
              <div className="space-y-2">
                <Label htmlFor="delete-confirm">
                  Type "DELETE" to confirm:
                </Label>
                <Input
                  id="delete-confirm"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="DELETE"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirmText("")}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteConfirmText !== "DELETE" || deleteWorkspaceMutation.isPending}
              onClick={handleDeleteWorkspace}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteWorkspaceMutation.isPending ? "Deleting..." : "Delete Workspace"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
