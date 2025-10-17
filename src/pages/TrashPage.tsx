import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Trash2, RotateCcw, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useRestoreProject, useHardDeleteProject } from "@/lib/api/hooks/useProjects";
import type { Project } from "@/lib/api/types";
import { formatDistanceToNow } from "date-fns";

export default function TrashPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [deletedProjects, setDeletedProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [permanentDeleteDialogOpen, setPermanentDeleteDialogOpen] = useState(false);

  const restoreProjectMutation = useRestoreProject(workspaceId || "");
  const hardDeleteProjectMutation = useHardDeleteProject(workspaceId || "");

  useEffect(() => {
    if (workspaceId) {
      loadDeletedProjects();
    }
  }, [workspaceId]);

  const loadDeletedProjects = async () => {
    if (!workspaceId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("workspace_id", workspaceId)
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false });

      if (error) throw error;

      const transformedProjects: Project[] = (data || []).map((row: any) => ({
        id: row.id,
        shortId: row.short_id,
        workspaceId: row.workspace_id,
        name: row.name,
        description: row.description,
        status: row.status,
        phase: row.phase,
        address: row.address || {},
        primaryClient: {
          firstName: row.primary_client_first_name,
          lastName: row.primary_client_last_name,
          email: row.primary_client_email,
          phone: row.primary_client_phone,
          address: row.primary_client_address,
        },
        secondaryClient: row.secondary_client_first_name ? {
          firstName: row.secondary_client_first_name,
          lastName: row.secondary_client_last_name,
          email: row.secondary_client_email,
          phone: row.secondary_client_phone,
          address: row.secondary_client_address,
        } : undefined,
        assessorParcelInfo: row.assessor_parcel_info || {},
        estimatedAmount: row.estimated_amount,
        dueDate: row.due_date,
        progress: row.progress,
        totalTasks: row.total_tasks,
        completedTasks: row.completed_tasks,
        teamMemberCount: row.team_member_count,
        createdBy: row.created_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        updatedBy: row.updated_by,
        deletedAt: row.deleted_at,
        deletedBy: row.deleted_by,
      }));

      setDeletedProjects(transformedProjects);
    } catch (error) {
      console.error("Error loading deleted projects:", error);
      toast({
        title: "Error",
        description: "Failed to load deleted projects",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = (project: Project) => {
    restoreProjectMutation.mutate(project.id, {
      onSuccess: () => {
        loadDeletedProjects();
      },
    });
  };

  const handlePermanentDelete = (project: Project) => {
    setSelectedProject(project);
    setPermanentDeleteDialogOpen(true);
  };

  const confirmPermanentDelete = () => {
    if (!selectedProject) return;

    hardDeleteProjectMutation.mutate(selectedProject.id, {
      onSuccess: () => {
        loadDeletedProjects();
        setPermanentDeleteDialogOpen(false);
        setSelectedProject(null);
      },
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading trash...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
              <Trash2 className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold">Trash</h1>
              <p className="text-sm text-muted-foreground">
                Deleted projects are stored here for 30 days
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {deletedProjects.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Trash2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium mb-2">Trash is empty</h3>
              <p className="text-sm text-muted-foreground text-center max-w-sm">
                Deleted projects will appear here. They will be automatically removed after 30 days.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {deletedProjects.map((project) => (
              <Card key={project.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <CardTitle className="text-lg">{project.name}</CardTitle>
                        <Badge variant="outline" className="text-xs">
                          {project.status}
                        </Badge>
                      </div>
                      {project.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {project.description}
                        </p>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                      <p className="text-xs text-muted-foreground">
                        Deleted {project.deletedAt && formatDistanceToNow(new Date(project.deletedAt), { addSuffix: true })}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{project.totalTasks || 0} tasks</span>
                        <span>Phase: {project.phase}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRestore(project)}
                        disabled={restoreProjectMutation.isPending}
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Restore
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handlePermanentDelete(project)}
                        disabled={hardDeleteProjectMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Forever
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Permanent Delete Confirmation Dialog */}
      <AlertDialog open={permanentDeleteDialogOpen} onOpenChange={setPermanentDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Forever?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Are you sure you want to permanently delete <strong>{selectedProject?.name}</strong>?
              </p>
              <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3 text-sm">
                <p className="font-medium text-destructive mb-1">This action cannot be undone.</p>
                <p className="text-muted-foreground">
                  All project data including tasks, files, notes, and invoices will be permanently removed.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmPermanentDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete Forever
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
