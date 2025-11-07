import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Building2 } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useWorkspaces } from "@/hooks/useWorkspaces";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useRoleAwareNavigation } from "@/hooks/useRoleAwareNavigation";

export default function NoWorkspacePage() {
  const { user } = useUser();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { role } = useRoleAwareNavigation();
  const { createWorkspace } = useWorkspaces();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [newWorkspaceDescription, setNewWorkspaceDescription] = useState("");

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
      
      // Force full page reload to properly initialize workspace context
      window.location.href = `/${role || 'team'}/workspace/${newWorkspace.id}/projects`;
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-background">
      <div className="max-w-md w-full space-y-8 text-center">
        {/* User Info */}
        {user && (
          <div className="space-y-2">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <div className="text-2xl font-bold text-primary">
                {user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
              </div>
            </div>
            <h1 className="text-2xl font-bold">{user.name}</h1>
            <p className="text-muted-foreground">{user.email}</p>
          </div>
        )}

        {/* Empty State */}
        <div className="py-8">
          <div className="mx-auto w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
            <Building2 className="h-10 w-10 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold mb-2">No Workspaces</h2>
          <p className="text-muted-foreground mb-6">
            Create your first workspace to start organizing your projects
          </p>
          <Button onClick={() => setCreateDialogOpen(true)} size="lg" className="gap-2">
            <Plus className="h-5 w-5" />
            Create Workspace
          </Button>
        </div>
      </div>

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
    </div>
  );
}