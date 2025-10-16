import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "@/lib/api/client";
import type { Project, Task } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import { TaskItem } from "@/components/TaskItem";
import { CreateTaskDialog } from "@/components/CreateTaskDialog";
import { useToast } from "@/hooks/use-toast";

const ProjectDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    if (!id) return;
    
    const projectData = api.projects.get(id);
    if (!projectData) {
      toast({
        title: "Project not found",
        description: "The project you're looking for doesn't exist",
        variant: "destructive",
      });
      navigate("/");
      return;
    }
    
    setProject(projectData);
    setTasks(api.tasks.list(id));
  }, [id, navigate, toast]);

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

  const todoTasks = tasks.filter(t => t.status === 'todo');
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
  const doneTasks = tasks.filter(t => t.status === 'done');

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/")}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Projects
          </Button>
          
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-4xl font-bold">{project.name}</h1>
                <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>
                  {project.status}
                </Badge>
              </div>
              <p className="text-muted-foreground text-lg">{project.description}</p>
            </div>
            <CreateTaskDialog projectId={project.id} onCreateTask={handleCreateTask} />
          </div>
        </div>

        {tasks.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-lg mb-4">No tasks yet</p>
            <CreateTaskDialog projectId={project.id} onCreateTask={handleCreateTask} />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Todo Column */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">To Do</h3>
                <Badge variant="secondary">{todoTasks.length}</Badge>
              </div>
              <div className="space-y-3">
                {todoTasks.map(task => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onStatusChange={handleStatusChange}
                    onDelete={handleDeleteTask}
                  />
                ))}
              </div>
            </div>

            {/* In Progress Column */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">In Progress</h3>
                <Badge variant="default">{inProgressTasks.length}</Badge>
              </div>
              <div className="space-y-3">
                {inProgressTasks.map(task => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onStatusChange={handleStatusChange}
                    onDelete={handleDeleteTask}
                  />
                ))}
              </div>
            </div>

            {/* Done Column */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">Done</h3>
                <Badge variant="outline">{doneTasks.length}</Badge>
              </div>
              <div className="space-y-3">
                {doneTasks.map(task => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onStatusChange={handleStatusChange}
                    onDelete={handleDeleteTask}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectDetails;
