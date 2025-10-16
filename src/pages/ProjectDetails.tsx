import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "@/lib/api/client";
import type { Project, Task } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import { TaskItem } from "@/components/TaskItem";
import { CreateTaskDialog } from "@/components/CreateTaskDialog";
import { UserAvatar } from "@/components/UserAvatar";
import { useToast } from "@/hooks/use-toast";

const ProjectDetails = () => {
  const { id, workspaceId } = useParams<{ id: string; workspaceId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  
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
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <div className="space-y-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate(currentWorkspaceId ? `/workspace/${currentWorkspaceId}/projects` : "/projects")}
            size="sm"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Projects
          </Button>
          
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <h1 className="text-3xl font-bold">{project.name}</h1>
                <Badge variant="default" className="capitalize">
                  {project.phase}
                </Badge>
                <Badge variant="secondary" className="capitalize">
                  {project.status.replace('_', ' ')}
                </Badge>
              </div>
              <p className="text-muted-foreground mb-4">{project.description}</p>
              
              {/* Project Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div>
                  <p className="text-sm text-muted-foreground">Client</p>
                  <p className="font-medium">{client?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Progress</p>
                  <p className="font-medium">{project.progress}%</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Team</p>
                  <div className="flex items-center -space-x-2 mt-1">
                    {team.slice(0, 3).map(user => (
                      <UserAvatar key={user.id} user={user} size="sm" />
                    ))}
                  </div>
                </div>
              </div>
            </div>
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
    </div>
  );
};

export default ProjectDetails;
