import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "@/lib/api/client";
import type { Project, Task } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileText, CheckSquare, FileSpreadsheet, Link as LinkIcon, FolderOpen, User, MessageSquare, Edit, ChevronRight, ChevronLeft } from "lucide-react";
import { TaskItem } from "@/components/TaskItem";
import { CreateTaskDialog } from "@/components/CreateTaskDialog";
import { UserAvatar } from "@/components/UserAvatar";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const ProjectDetails = () => {
  const { id, workspaceId } = useParams<{ id: string; workspaceId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTab, setActiveTab] = useState("project");
  const [chatOpen, setChatOpen] = useState(true);
  
  const currentWorkspaceId = workspaceId || api.workspaces.getCurrentWorkspaceId();

  useEffect(() => {
    if (!id) return;
    
    const projectData = api.projects.get(id);
    if (!projectData) {
      toast({
        title: "Project not found",
        description: "The project you're looking for doesn't exist",
        variant: "destructive",
      });
      navigate(currentWorkspaceId ? `/workspace/${currentWorkspaceId}/projects` : "/");
      return;
    }
    
    setProject(projectData);
    setTasks(api.tasks.list(id));
  }, [id, navigate, toast, currentWorkspaceId]);

  const handleCreateTask = (input: Parameters<typeof api.tasks.create>[0]) => {
    const newTask = api.tasks.create(input);
    setTasks([...tasks, newTask]);
    toast({
      title: "Task created",
      description: "Your task has been added successfully",
    });
  };

  const handleStatusChange = (taskId: string, status: Task['status']) => {
    api.tasks.update(taskId, { status });
    setTasks(tasks.map(t => t.id === taskId ? { ...t, status } : t));
  };

  const handleDeleteTask = (taskId: string) => {
    api.tasks.delete(taskId);
    setTasks(tasks.filter(t => t.id !== taskId));
    toast({
      title: "Task deleted",
      description: "The task has been removed",
    });
  };

  if (!project) return null;

  const client = api.clients.get(project.clientId);
  const team = project.teamIds.map(id => api.users.get(id)).filter(Boolean) as any[];
  
  const taskRedlineTasks = tasks.filter(t => t.status === 'task_redline');
  const progressUpdateTasks = tasks.filter(t => t.status === 'progress_update');
  const completeTasks = tasks.filter(t => t.status === 'complete');

  const getTaskAssignees = (assigneeIds: string[]) => {
    return assigneeIds.map(id => api.users.get(id)).filter(Boolean) as any[];
  };

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-6 space-y-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate(currentWorkspaceId ? `/workspace/${currentWorkspaceId}/projects` : "/projects")}
            size="sm"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Projects
          </Button>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent">
              <TabsTrigger value="files" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
                <FileText className="h-4 w-4 mr-2" />
                Files
              </TabsTrigger>
              <TabsTrigger value="tasks" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
                <CheckSquare className="h-4 w-4 mr-2" />
                Tasks
              </TabsTrigger>
              <TabsTrigger value="invoices" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Invoices
              </TabsTrigger>
              <TabsTrigger value="links" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
                <LinkIcon className="h-4 w-4 mr-2" />
                Links
              </TabsTrigger>
              <TabsTrigger value="project" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
                <FolderOpen className="h-4 w-4 mr-2" />
                Project
              </TabsTrigger>
              <TabsTrigger value="client" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
                <User className="h-4 w-4 mr-2" />
                Client
              </TabsTrigger>
              <TabsTrigger value="notes" className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
                <MessageSquare className="h-4 w-4 mr-2" />
                Notes
              </TabsTrigger>
            </TabsList>

            <TabsContent value="files" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Files</CardTitle>
                  <CardDescription>Project files and documents</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">No files uploaded yet</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="tasks" className="mt-6">
              <div className="space-y-4 mb-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">Tasks</h2>
                  <CreateTaskDialog projects={[project]} onCreateTask={handleCreateTask} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Task/Redline Column */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg">Task/Redline</h3>
                    <Badge className="bg-destructive text-destructive-foreground">{taskRedlineTasks.length}</Badge>
                  </div>
                  <div className="space-y-3">
                    {taskRedlineTasks.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">No tasks</p>
                    ) : (
                      taskRedlineTasks.map(task => (
                        <TaskItem
                          key={task.id}
                          task={task}
                          assignees={getTaskAssignees(task.assigneeIds)}
                          onStatusChange={handleStatusChange}
                          onDelete={handleDeleteTask}
                        />
                      ))
                    )}
                  </div>
                </div>

                {/* Progress/Update Column */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg">Progress/Update</h3>
                    <Badge className="bg-primary text-primary-foreground">{progressUpdateTasks.length}</Badge>
                  </div>
                  <div className="space-y-3">
                    {progressUpdateTasks.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">No tasks</p>
                    ) : (
                      progressUpdateTasks.map(task => (
                        <TaskItem
                          key={task.id}
                          task={task}
                          assignees={getTaskAssignees(task.assigneeIds)}
                          onStatusChange={handleStatusChange}
                          onDelete={handleDeleteTask}
                        />
                      ))
                    )}
                  </div>
                </div>

                {/* Complete Column */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg">Complete</h3>
                    <Badge className="bg-secondary text-secondary-foreground">{completeTasks.length}</Badge>
                  </div>
                  <div className="space-y-3">
                    {completeTasks.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">No tasks</p>
                    ) : (
                      completeTasks.map(task => (
                        <TaskItem
                          key={task.id}
                          task={task}
                          assignees={getTaskAssignees(task.assigneeIds)}
                          onStatusChange={handleStatusChange}
                          onDelete={handleDeleteTask}
                        />
                      ))
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="invoices" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Invoices</CardTitle>
                  <CardDescription>Project invoices and billing</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">No invoices yet</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="links" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Links</CardTitle>
                  <CardDescription>Related project links</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">No links added yet</p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="project" className="mt-6 space-y-6">
              {/* Project Narrative */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Project Narrative</CardTitle>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{project.description || "Select a project to view its details. Once project data is available, this tab will display key information, status updates, permits, and team members for the selected project."}</p>
                </CardContent>
              </Card>

              {/* Team Section */}
              <Card>
                <CardHeader>
                  <CardTitle>Team</CardTitle>
                </CardHeader>
                <CardContent>
                  {team.length === 0 ? (
                    <p className="text-muted-foreground">No team members assigned</p>
                  ) : (
                    <div className="flex items-center gap-4">
                      {team.map(user => (
                        <div key={user.id} className="flex items-center gap-2">
                          <UserAvatar user={user} size="md" />
                          <div>
                            <p className="font-medium">{user.first_name} {user.last_name}</p>
                            <p className="text-xs text-muted-foreground">{user.role}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Project Address */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Project Address</CardTitle>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                </CardHeader>
                <CardContent>
                  <p className="font-medium">{project.address || '—'}</p>
                </CardContent>
              </Card>

              {/* Assessor Parcel Information */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Assessor Parcel Information</CardTitle>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Assessor's Parcel #</p>
                        <p className="font-medium text-primary">—</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Occupancy Class</p>
                        <p className="font-medium">—</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Zoning Designation</p>
                        <p className="font-medium text-primary">—</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Construction</p>
                        <p className="font-medium">—</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-6 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Stories</p>
                        <p className="font-medium">—</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Plate Height</p>
                        <p className="font-medium">—</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Roof Height</p>
                        <p className="font-medium">—</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Year Built</p>
                        <p className="font-medium">—</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Approx Lot Area</p>
                        <p className="font-medium">—</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Acres</p>
                        <p className="font-medium">—</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="client" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Client Information</CardTitle>
                </CardHeader>
                <CardContent>
                  {client ? (
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Name</p>
                        <p className="font-medium text-lg">{client.name}</p>
                      </div>
                      {client.company && (
                        <div>
                          <p className="text-sm text-muted-foreground">Company</p>
                          <p className="font-medium">{client.company}</p>
                        </div>
                      )}
                      {client.email && (
                        <div>
                          <p className="text-sm text-muted-foreground">Email</p>
                          <p className="font-medium">{client.email}</p>
                        </div>
                      )}
                      {client.phone && (
                        <div>
                          <p className="text-sm text-muted-foreground">Phone</p>
                          <p className="font-medium">{client.phone}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No client assigned</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notes" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Notes</CardTitle>
                  <CardDescription>Project notes and comments</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">No notes yet</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Project Chat Sidebar */}
      <Collapsible open={chatOpen} onOpenChange={setChatOpen}>
        <div className="relative">
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="absolute -left-10 top-4 z-10 h-8 w-8"
            >
              {chatOpen ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="w-80 border-l bg-background p-6 overflow-auto data-[state=closed]:w-0 data-[state=closed]:p-0 transition-all">
            <h3 className="font-semibold text-lg mb-4">Project Chat</h3>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center py-8">No messages yet</p>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    </div>
  );
};

export default ProjectDetails;
