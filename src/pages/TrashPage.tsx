import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Trash2, RotateCcw, AlertTriangle, MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { DESIGN_TOKENS as T } from "@/lib/design-tokens";

interface DeletedThread {
  id: string;
  title: string;
  deleted_at: string;
  workspace_id: string;
}

export default function TrashPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [deletedProjects, setDeletedProjects] = useState<Project[]>([]);
  const [deletedThreads, setDeletedThreads] = useState<DeletedThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedThread, setSelectedThread] = useState<DeletedThread | null>(null);
  const [permanentDeleteDialogOpen, setPermanentDeleteDialogOpen] = useState(false);
  const [permanentDeleteThreadDialogOpen, setPermanentDeleteThreadDialogOpen] = useState(false);

  const restoreProjectMutation = useRestoreProject(workspaceId || "");
  const hardDeleteProjectMutation = useHardDeleteProject(workspaceId || "");

  useEffect(() => {
    if (workspaceId) {
      loadDeletedProjects();
      loadDeletedThreads();
    }
  }, [workspaceId]);

  const loadDeletedProjects = async () => {
    try {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("workspace_id", workspaceId)
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false });

      if (error) throw error;

      const transformedProjects = data.map((row) => ({
        id: row.id,
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

  const loadDeletedThreads = async () => {
    try {
      const { data, error } = await supabase
        .from("ai_chat_threads")
        .select("*")
        .eq("workspace_id", workspaceId)
        .not("deleted_at", "is", null)
        .order("deleted_at", { ascending: false });

      if (error) throw error;
      setDeletedThreads(data || []);
    } catch (error) {
      console.error("Error loading deleted threads:", error);
      toast({
        title: "Error",
        description: "Failed to load deleted AI chats",
        variant: "destructive",
      });
    }
  };

  const handleRestore = (project: Project) => {
    restoreProjectMutation.mutate(project.id, {
      onSuccess: () => {
        loadDeletedProjects();
      },
    });
  };

  const handlePermanentDelete = () => {
    if (!selectedProject) return;
    hardDeleteProjectMutation.mutate(selectedProject.id, {
      onSuccess: () => {
        loadDeletedProjects();
        setPermanentDeleteDialogOpen(false);
        setSelectedProject(null);
      },
    });
  };

  const confirmPermanentDelete = () => {
    handlePermanentDelete();
  };

  const confirmPermanentDeleteThread = async () => {
    if (!selectedThread) return;

    try {
      // Delete messages first
      const { error: messagesError } = await supabase
        .from("ai_chat_messages")
        .delete()
        .eq("thread_id", selectedThread.id);

      if (messagesError) throw messagesError;

      // Delete thread
      const { error: threadError } = await supabase
        .from("ai_chat_threads")
        .delete()
        .eq("id", selectedThread.id);

      if (threadError) throw threadError;

      toast({
        title: "Chat permanently deleted",
        description: "The AI chat has been permanently deleted.",
      });
      loadDeletedThreads();
      setPermanentDeleteThreadDialogOpen(false);
      setSelectedThread(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to permanently delete AI chat",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading trash...</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full text-[12px] overflow-hidden pb-6 pr-1">
      <div className={`${T.panel} ${T.radius} min-h-0 min-w-0 grid grid-rows-[auto_1fr] overflow-hidden h-full`}>
        {/* Header */}
        <div className="h-9 px-3 border-b border-slate-200 dark:border-[#1d2230] flex items-center bg-white dark:bg-[#0E1118]">
          <span className="text-[12px] font-medium">Trash</span>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto bg-white dark:bg-[#0F1219] p-4">
          <Tabs defaultValue="projects" className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="projects">Projects</TabsTrigger>
              <TabsTrigger value="ai-chats">AI Chats</TabsTrigger>
            </TabsList>

            <TabsContent value="projects">
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
                          <div className="text-sm text-muted-foreground">
                            Deleted {formatDistanceToNow(new Date(project.deletedAt!))} ago
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRestore(project)}
                              className="gap-2"
                            >
                              <RotateCcw className="h-3 w-3" />
                              Restore
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                setSelectedProject(project);
                                setPermanentDeleteDialogOpen(true);
                              }}
                            >
                              Delete Forever
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="ai-chats">
              {deletedThreads.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <MessageSquare className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-medium mb-2">No deleted AI chats</h3>
                    <p className="text-sm text-muted-foreground text-center max-w-sm">
                      Deleted AI conversations will appear here.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {deletedThreads.map((thread) => (
                    <Card key={thread.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">{thread.title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-muted-foreground">
                            Deleted {formatDistanceToNow(new Date(thread.deleted_at))} ago
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              setSelectedThread(thread);
                              setPermanentDeleteThreadDialogOpen(true);
                            }}
                          >
                            Delete Forever
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Permanent Delete Project Dialog */}
      <AlertDialog open={permanentDeleteDialogOpen} onOpenChange={setPermanentDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Project Forever?
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

      {/* Permanent Delete Thread Dialog */}
      <AlertDialog open={permanentDeleteThreadDialogOpen} onOpenChange={setPermanentDeleteThreadDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete AI Chat Forever?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Are you sure you want to permanently delete <strong>{selectedThread?.title}</strong>?
              </p>
              <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3 text-sm">
                <p className="font-medium text-destructive mb-1">This action cannot be undone.</p>
                <p className="text-muted-foreground">
                  All messages in this conversation will be permanently removed.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmPermanentDeleteThread}
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