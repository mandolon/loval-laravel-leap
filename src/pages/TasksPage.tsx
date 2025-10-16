import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "@/lib/api/client";
import type { Task, User } from "@/lib/api/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, FileText, ChevronDown, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { TaskDetailDialog } from "@/components/TaskDetailDialog";
import { CreateTaskDialog } from "@/components/CreateTaskDialog";
import type { CreateTaskInput } from "@/lib/api/types";

const TasksPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<any>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [filter, setFilter] = useState<'all' | 'my' | 'completed'>('all');
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [groupBy, setGroupBy] = useState<'status' | 'date' | 'creator'>('status');
  
  const currentWorkspaceId = workspaceId || api.workspaces.getCurrentWorkspaceId();

  useEffect(() => {
    loadTasks();
  }, [currentWorkspaceId]);

  useEffect(() => {
    if (!workspaceId && currentWorkspaceId) {
      navigate(`/workspace/${currentWorkspaceId}/tasks`, { replace: true });
    }
  }, [workspaceId, currentWorkspaceId, navigate]);

  const loadTasks = () => {
    const workspaceId = currentWorkspaceId;
    
    if (workspaceId) {
      const workspace = api.workspaces.get(workspaceId);
      setCurrentWorkspace(workspace);
      
      const projects = api.projects.list(workspaceId);
      const allTasks = projects.flatMap(p => api.tasks.list(p.id));
      setTasks(allTasks);
    } else {
      setCurrentWorkspace(null);
      setTasks([]);
    }
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
  };

  const handleTaskUpdate = (taskId: string, updates: Partial<Task>) => {
    api.tasks.update(taskId, updates);
    setTasks(tasks.map(t => t.id === taskId ? { ...t, ...updates } : t));
    if (selectedTask?.id === taskId) {
      setSelectedTask({ ...selectedTask, ...updates });
    }
  };

  const handleCreateTask = (input: CreateTaskInput) => {
    const newTask = api.tasks.create(input);
    setTasks([...tasks, newTask]);
    toast({
      title: "Task created",
      description: "New task has been added",
    });
  };

  const getTaskAssignees = (assigneeIds: string[]): User[] => {
    return assigneeIds.map(id => api.users.get(id)).filter(Boolean) as User[];
  };

  const getTaskCreator = (createdById: string): User => {
    return api.users.get(createdById) as User;
  };

  const toggleSection = (sectionId: string) => {
    setCollapsedSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  const statusConfig = {
    task_redline: { 
      label: "TASK/REDLINE", 
      color: "bg-destructive text-destructive-foreground",
      count: tasks.filter(t => t.status === 'task_redline').length
    },
    progress_update: { 
      label: "PROGRESS/UPDATE", 
      color: "bg-primary text-primary-foreground",
      count: tasks.filter(t => t.status === 'progress_update').length
    },
    complete: { 
      label: "COMPLETE", 
      color: "bg-secondary text-secondary-foreground",
      count: tasks.filter(t => t.status === 'complete').length
    },
  };

  const filteredTasks = tasks.filter(task => {
    if (filter === 'completed') return task.status === 'complete';
    if (filter === 'my') {
      // Filter for current user - for now show all since we don't have auth
      return true;
    }
    return true;
  });

  const taskRedlineTasks = filteredTasks.filter(t => t.status === 'task_redline');
  const progressUpdateTasks = filteredTasks.filter(t => t.status === 'progress_update');
  const completeTasks = filteredTasks.filter(t => t.status === 'complete');

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
  };

  const TaskRow = ({ task }: { task: Task }) => {
    const assignees = getTaskAssignees(task.assigneeIds);
    const creator = getTaskCreator(task.createdById);
    const fileCount = task.attachments?.length || 0;

    return (
      <div 
        onClick={() => handleTaskClick(task)}
        className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 items-center py-3 px-4 hover:bg-muted/50 cursor-pointer border-b last:border-b-0"
      >
        {/* Name & Address */}
        <div>
          <div className="font-medium">{task.title}</div>
          {task.description && (
            <div className="text-sm text-muted-foreground truncate">{task.description}</div>
          )}
        </div>

        {/* Files */}
        <div className="flex items-center justify-center">
          {fileCount > 0 && (
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Date Created */}
        <div className="text-sm text-center min-w-[80px]">
          {formatDate(task.createdAt)}
        </div>

        {/* Created By */}
        <div className="flex justify-center">
          <Avatar className="h-8 w-8">
            <AvatarFallback 
              className="text-white text-xs"
              style={{ background: creator.avatar }}
            >
              {creator.initials}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Assigned To */}
        <div className="flex justify-center gap-1">
          {assignees.map((assignee) => (
            <Avatar key={assignee.id} className="h-8 w-8">
              <AvatarFallback 
                className="text-white text-xs"
                style={{ background: assignee.avatar }}
              >
                {assignee.initials}
              </AvatarFallback>
            </Avatar>
          ))}
        </div>
      </div>
    );
  };

  const TaskSection = ({ 
    status, 
    tasks: sectionTasks 
  }: { 
    status: Task['status']; 
    tasks: Task[];
  }) => {
    const config = statusConfig[status];
    const isCollapsed = collapsedSections[status];

    return (
      <div className="space-y-0 border rounded-lg overflow-hidden">
        {/* Section Header */}
        <div 
          className="flex items-center gap-3 p-3 bg-muted/30 cursor-pointer"
          onClick={() => toggleSection(status)}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
          <Badge className={config.color}>{config.label}</Badge>
          <span className="text-sm font-medium">{config.count}</span>
        </div>

        {/* Column Headers */}
        {!isCollapsed && sectionTasks.length > 0 && (
          <>
            <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 px-4 py-2 bg-muted/20 border-y text-sm font-medium text-muted-foreground">
              <div>Name</div>
              <div className="text-center min-w-[40px]">Files</div>
              <div className="text-center min-w-[80px]">Date Created</div>
              <div className="text-center min-w-[40px]">Created by</div>
              <div className="text-center min-w-[40px]">Assigned to</div>
            </div>

            {/* Task Rows */}
            <div>
              {sectionTasks.map(task => (
                <TaskRow key={task.id} task={task} />
              ))}
            </div>
          </>
        )}

        {!isCollapsed && sectionTasks.length === 0 && (
          <div className="text-center py-8 text-sm text-muted-foreground">
            No tasks
          </div>
        )}
      </div>
    );
  };

  // Get first project for creating tasks
  const firstProject = currentWorkspace 
    ? api.projects.list(currentWorkspace.id)[0] 
    : null;

  return (
    <div className="flex h-full">
      {/* Left Sidebar */}
      <div className="w-48 border-r p-4 space-y-2">
        <h3 className="font-semibold text-sm mb-4 text-muted-foreground uppercase">Task Board</h3>
        <Button
          variant={filter === 'all' ? 'secondary' : 'ghost'}
          className="w-full justify-start"
          onClick={() => setFilter('all')}
        >
          All Tasks
        </Button>
        <Button
          variant={filter === 'my' ? 'secondary' : 'ghost'}
          className="w-full justify-start"
          onClick={() => setFilter('my')}
        >
          My Tasks
        </Button>
        <Button
          variant={filter === 'completed' ? 'secondary' : 'ghost'}
          className="w-full justify-start"
          onClick={() => setFilter('completed')}
        >
          Completed
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 space-y-6 overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Task Board</h1>
            <p className="text-muted-foreground">
              {currentWorkspace 
                ? `Track and manage tasks in ${currentWorkspace.name}`
                : "Select a workspace to view tasks"
              }
            </p>
          </div>
          {firstProject && (
            <CreateTaskDialog 
              projectId={firstProject.id} 
              onCreateTask={handleCreateTask}
            />
          )}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">Group by:</span>
          <Button variant="outline" size="sm">
            Status <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm">
            Date Created <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm">
            Created by <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        </div>

        {/* Task Sections */}
        {!currentWorkspace ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-lg">
              Please select a workspace from the sidebar to view tasks
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <TaskSection status="task_redline" tasks={taskRedlineTasks} />
            <TaskSection status="progress_update" tasks={progressUpdateTasks} />
            <TaskSection status="complete" tasks={completeTasks} />
          </div>
        )}
      </div>

      {/* Task Detail Dialog */}
      {selectedTask && (
        <TaskDetailDialog
          task={selectedTask}
          open={!!selectedTask}
          onOpenChange={(open) => !open && setSelectedTask(null)}
          onUpdate={(updates) => handleTaskUpdate(selectedTask.id, updates)}
          assignees={getTaskAssignees(selectedTask.assigneeIds)}
          createdBy={getTaskCreator(selectedTask.createdById)}
        />
      )}
    </div>
  );
};

export default TasksPage;
