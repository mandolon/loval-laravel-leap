import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Trash2, Loader2 } from 'lucide-react';
import { SETTINGS_CONSTANTS } from '../../lib/settings-constants';
import { useWorkspaces } from '@/hooks/useWorkspaces';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/contexts/UserContext';

export function WorkspaceSettingsContent() {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useUser();
  const { workspaces, currentWorkspaceId } = useWorkspaces();
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [workspaceDescription, setWorkspaceDescription] = useState('');

  const currentWorkspace = workspaces?.find(w => w.id === (workspaceId || currentWorkspaceId));

  useEffect(() => {
    if (currentWorkspace) {
      setWorkspaceName(currentWorkspace.name || '');
      setWorkspaceDescription(currentWorkspace.description || '');
    }
  }, [currentWorkspace]);

  const handleSaveChanges = async () => {
    if (!currentWorkspace || !user) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('workspaces')
        .update({
          name: workspaceName,
          description: workspaceDescription,
        })
        .eq('id', currentWorkspace.id);

      if (error) throw error;

      // Log activity
      await supabase.from('activity_log').insert({
        workspace_id: currentWorkspace.id,
        user_id: user.id,
        action: 'updated',
        resource_type: 'workspace',
        change_summary: 'Updated workspace settings',
      });

      toast({
        title: 'Success',
        description: 'Workspace settings updated successfully',
      });
    } catch (error: any) {
      console.error('Error updating workspace:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update workspace settings',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteWorkspace = async () => {
    if (!currentWorkspace || !user || deleteConfirmText !== 'DELETE') return;

    setIsLoading(true);
    try {
      // Delete the workspace
      const { error } = await supabase
        .from('workspaces')
        .delete()
        .eq('id', currentWorkspace.id);

      if (error) throw error;

      // Log activity
      await supabase.from('activity_log').insert({
        workspace_id: currentWorkspace.id,
        user_id: user.id,
        action: 'deleted',
        resource_type: 'workspace',
        change_summary: `Deleted workspace: ${currentWorkspace.name}`,
      });

      toast({
        title: 'Workspace Deleted',
        description: 'The workspace has been permanently deleted',
      });

      // Navigate to another workspace or home
      const remainingWorkspaces = workspaces?.filter(w => w.id !== currentWorkspace.id);
      if (remainingWorkspaces && remainingWorkspaces.length > 0) {
        navigate(`/team/workspace/${remainingWorkspaces[0].id}`);
      } else {
        navigate('/');
      }
    } catch (error: any) {
      console.error('Error deleting workspace:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete workspace',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setShowDeleteDialog(false);
      setDeleteConfirmText('');
    }
  };

  if (!currentWorkspace) {
    return (
      <div className="p-4 md:p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 text-[var(--muted)]" data-testid="workspace-settings-content">
      <h1 className="text-[var(--text)] text-xl font-medium mb-4">Workspace Settings</h1>

      <div
        className="grid gap-8"
        style={{ gridTemplateColumns: SETTINGS_CONSTANTS.CONTENT_COLS }}
        data-testid="workspace-settings-2col"
      >
        {/* Left - Description */}
        <div>
          <h2 className="text-[var(--text)] text-base font-medium mb-1">
            Workspace Information
          </h2>
          <p className="text-sm">
            Update your workspace name and description. These details help identify and organize your workspace.
          </p>
        </div>

        {/* Right - Form */}
        <div className="space-y-4">
          {/* Workspace Settings Card */}
          <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="workspace-name" className="text-sm text-[var(--text)]">
                Workspace Name
              </Label>
              <Input
                id="workspace-name"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                placeholder="Enter workspace name"
                className="h-9"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="workspace-description" className="text-sm text-[var(--text)]">
                Description
              </Label>
              <Textarea
                id="workspace-description"
                value={workspaceDescription}
                onChange={(e) => setWorkspaceDescription(e.target.value)}
                placeholder="Describe this workspace..."
                rows={3}
              />
            </div>

            <div className="flex justify-end pt-2">
              <Button
                onClick={handleSaveChanges}
                disabled={isLoading}
                className="bg-[#4C75D1] hover:bg-[#4C75D1]/90"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="text-sm font-medium flex items-center gap-2 text-destructive mb-2">
                  <Trash2 className="h-4 w-4" />
                  Danger Zone
                </p>
                <p className="text-sm font-medium text-[var(--text)] mb-1">
                  Delete Workspace
                </p>
                <p className="text-xs text-[var(--muted)]">
                  Permanently delete this workspace and all projects within it.
                  This action cannot be undone.
                </p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
                disabled={isLoading}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workspace</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the workspace "{currentWorkspace.name}" and all
              of its projects. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="delete-confirm" className="text-sm">
              Type <span className="font-bold">DELETE</span> to confirm:
            </Label>
            <Input
              id="delete-confirm"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE"
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setDeleteConfirmText('');
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteWorkspace}
              disabled={deleteConfirmText !== 'DELETE' || isLoading}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Workspace
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
