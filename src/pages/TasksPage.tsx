import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "@/lib/api/client";
import type { Task } from "@/lib/api/types";
import { TaskItem } from "@/components/TaskItem";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const TasksPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<any>(null);
  
  const currentWorkspaceId = workspaceId || api.workspaces.getCurrentWorkspaceId();

  useEffect(() => {
    loadTasks();
  }, [currentWorkspaceId]);

  useEffect(() => {
    // Redirect to workspace route if not already there
    if (!workspaceId && currentWorkspaceId) {
      navigate(`/workspace/${currentWorkspaceId}/tasks`, { replace: true });
    }
  }, [workspaceId, currentWorkspaceId, navigate]);

  const loadTasks = () => {
    const workspaceId = currentWorkspaceId;
    
    if (workspaceId) {
      const workspace = api.workspaces.get(workspaceId);
      setCurrentWorkspace(workspace);
      
      // Get all projects in current workspace
      const projects = api.projects.list(workspaceId);
      
      // Get tasks for those projects
      const allTasks = projects.flatMap(p => api.tasks.list(p.id));
      setTasks(allTasks);
    } else {
      setCurrentWorkspace(null);
      setTasks([]);
    }
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

  const getTaskAssignees = (assigneeIds: string[]) => {
    return assigneeIds.map(id => api.users.get(id)).filter(Boolean) as any[];
  };

  const todoTasks = tasks.filter(t => t.status === 'todo');
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
  const doneTasks = tasks.filter(t => t.status === 'done');

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold mb-2">Task Board</h1>
        <p className="text-muted-foreground text-lg">
          {currentWorkspace 
            ? `Track and manage all tasks in ${currentWorkspace.name}`
            : "Select a workspace to view tasks"
          }
        </p>
      </div>

      {/* Kanban Board */}
      {!currentWorkspace ? (
        <div className="text-center py-20">
          <p className="text-muted-foreground text-lg">
            Please select a workspace from the sidebar to view tasks
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* To Do Column */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">To Do</h3>
              <Badge variant="secondary">{todoTasks.length}</Badge>
            </div>
            <div className="space-y-3">
              {todoTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No tasks</p>
              ) : (
                todoTasks.map(task => (
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

          {/* In Progress Column */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">In Progress</h3>
              <Badge variant="default">{inProgressTasks.length}</Badge>
            </div>
            <div className="space-y-3">
              {inProgressTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No tasks</p>
              ) : (
                inProgressTasks.map(task => (
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

          {/* Done Column */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">Done</h3>
              <Badge variant="outline">{doneTasks.length}</Badge>
            </div>
            <div className="space-y-3">
              {doneTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No tasks</p>
              ) : (
                doneTasks.map(task => (
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
      )}
    </div>
  );
};

export default TasksPage;
