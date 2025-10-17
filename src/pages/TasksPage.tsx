import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import type { Task, User } from "@/lib/api/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, ChevronDown, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { TaskDetailDialog } from "@/components/TaskDetailDialog";
import { CreateTaskDialog } from "@/components/CreateTaskDialog";
import type { CreateTaskInput } from "@/lib/api/types";
import { useWorkspaceTasks, useCreateTask, useUpdateTask, useDeleteTask } from "@/lib/api/hooks/useTasks";
import { useProjects } from "@/lib/api/hooks/useProjects";
import { supabase } from "@/integrations/supabase/client";

const TasksPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [filter, setFilter] = useState<'all' | 'my' | 'completed'>('all');
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [groupBy, setGroupBy] = useState<'status' | 'date' | 'creator'>('status');
  
  // Use React Query hooks for data
  const { data: tasks = [], isLoading: tasksLoading } = useWorkspaceTasks(workspaceId || '');
  const { data: projects = [] } = useProjects(workspaceId || '');
  const createTaskMutation = useCreateTask();
  const updateTaskMutation = useUpdateTask();
  const deleteTaskMutation = useDeleteTask();

  useEffect(() => {
    if (!workspaceId) {
      navigate('/');
    }
  }, [workspaceId, navigate]);

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
  };

  const handleTaskUpdate = (taskId: string, updates: Partial<Task>) => {
    updateTaskMutation.mutate({ id: taskId, input: updates });
    if (selectedTask?.id === taskId) {
      setSelectedTask({ ...selectedTask, ...updates });
    }
  };

  const handleCreateTask = (input: CreateTaskInput) => {
    createTaskMutation.mutate(input);
  };

  const getTaskAssignees = async (assigneeIds: string[]): Promise<User[]> => {
    if (assigneeIds.length === 0) return [];
    
    const { data } = await supabase
      .from('users')
      .select('*')
      .in('id', assigneeIds);
    
    return (data || []).map(user => ({
      id: user.id,
      shortId: user.short_id,
      authId: user.auth_id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      avatarUrl: user.avatar_url,
      lastActiveAt: user.last_active_at,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      deletedAt: user.deleted_at,
      deletedBy: user.deleted_by,
    }));
  };

  const getTaskCreator = async (createdById: string): Promise<User | null> => {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', createdById)
      .single();
    
    if (!data) return null;
    
    return {
      id: data.id,
      shortId: data.short_id,
      authId: data.auth_id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      avatarUrl: data.avatar_url,
      lastActiveAt: data.last_active_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      deletedAt: data.deleted_at,
      deletedBy: data.deleted_by,
    };
  };

  const toggleSection = (sectionId: string) => {
    setCollapsedSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  const filteredTasks = tasks.filter(task => {
    if (filter === 'completed') return task.status === 'done_completed';
    if (filter === 'my') {
      // Filter for current user - for now show all since we don't have auth
      return true;
    }
    return true;
  });

  const statusConfig = {
    task_redline: { 
      label: "TASK/REDLINE", 
      color: "bg-destructive text-destructive-foreground",
      count: filteredTasks.filter(t => t.status === 'task_redline').length
    },
    progress_update: { 
      label: "PROGRESS/UPDATE", 
      color: "bg-primary text-primary-foreground",
      count: filteredTasks.filter(t => t.status === 'progress_update').length
    },
    done_completed: { 
      label: "COMPLETE", 
      color: "bg-secondary text-secondary-foreground",
      count: filteredTasks.filter(t => t.status === 'done_completed').length
    },
  };

  const taskRedlineTasks = filteredTasks.filter(t => t.status === 'task_redline');
  const progressUpdateTasks = filteredTasks.filter(t => t.status === 'progress_update');
  const completeTasks = filteredTasks.filter(t => t.status === 'done_completed');

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
  };

  const TaskRow = ({ task }: { task: Task }) => {
    const [assignees, setAssignees] = useState<User[]>([]);
    const [creator, setCreator] = useState<User | null>(null);
    
    useEffect(() => {
      getTaskAssignees(task.assignees).then(setAssignees);
      getTaskCreator(task.createdBy).then(setCreator);
    }, [task.assignees, task.createdBy]);
    
    const fileCount = task.attachedFiles?.length || 0;
    const project = projects.find(p => p.id === task.projectId);
    const projectAddress = project?.address as { streetNumber?: string; streetName?: string; city?: string; state?: string; zipCode?: string } | undefined;
    const addressDisplay = projectAddress?.streetNumber && projectAddress?.streetName 
      ? `${projectAddress.streetNumber} ${projectAddress.streetName}`
      : '-';

    if (!creator) return null;

    return (
      <TableRow 
        onClick={() => handleTaskClick(task)}
        className="cursor-pointer"
      >
        {/* Name & Address */}
        <TableCell>
          <div className="font-medium">{task.title}</div>
          {project ? (
            <Link 
              to={`/workspace/${project.workspaceId}/projects/${project.id}`}
              onClick={(e) => e.stopPropagation()}
              className="text-sm text-primary hover:underline truncate max-w-md block"
            >
              {addressDisplay}
            </Link>
          ) : (
            <div className="text-sm text-muted-foreground truncate max-w-md">{addressDisplay}</div>
          )}
        </TableCell>

        {/* Files */}
        <TableCell className="text-center w-[80px]">
          {fileCount > 0 ? (
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Plus className="h-4 w-4" />
            </Button>
          ) : (
            <span className="text-sm text-muted-foreground">-</span>
          )}
        </TableCell>

        {/* Date Created */}
        <TableCell className="text-center w-[120px]">
          <span className="text-sm">{formatDate(task.createdAt)}</span>
        </TableCell>

        {/* Created By */}
        <TableCell className="text-center w-[100px]">
          <div className="flex justify-center">
            <Avatar className="h-8 w-8">
              <AvatarFallback 
                className="text-white text-xs"
                style={{ background: creator.avatarUrl || 'linear-gradient(135deg, hsl(280, 70%, 60%) 0%, hsl(320, 80%, 65%) 100%)' }}
              >
                {creator.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
              </AvatarFallback>
            </Avatar>
          </div>
        </TableCell>

        {/* Assigned To */}
        <TableCell className="text-center w-[120px]">
          <div className="flex justify-center gap-1">
            {assignees.length > 0 ? (
              assignees.map((assignee) => (
                <Avatar key={assignee.id} className="h-8 w-8">
                  <AvatarFallback 
                    className="text-white text-xs"
                    style={{ background: assignee.avatarUrl || 'linear-gradient(135deg, hsl(280, 70%, 60%) 0%, hsl(320, 80%, 65%) 100%)' }}
                  >
                    {assignee.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">-</span>
            )}
          </div>
        </TableCell>
      </TableRow>
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

        {/* Table */}
        {!isCollapsed && sectionTasks.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="text-center w-[80px]">Files</TableHead>
                <TableHead className="text-center w-[120px]">Date Created</TableHead>
                <TableHead className="text-center w-[100px]">Created by</TableHead>
                <TableHead className="text-center w-[120px]">Assigned to</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sectionTasks.map(task => (
                <TaskRow key={task.id} task={task} />
              ))}
            </TableBody>
          </Table>
        )}

        {!isCollapsed && sectionTasks.length === 0 && (
          <div className="text-center py-8 text-sm text-muted-foreground">
            No tasks
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-full">
      {/* Main Content */}
      <div className="flex-1 p-6 space-y-6 overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Task Board</h1>
            <p className="text-muted-foreground">
              {workspaceId 
                ? `Track and manage tasks across all projects`
                : "Select a workspace to view tasks"
              }
            </p>
          </div>
          {workspaceId && projects.length > 0 && (
            <CreateTaskDialog 
              projects={projects} 
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
        {tasksLoading ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-lg">Loading tasks...</p>
          </div>
        ) : !workspaceId ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-lg">
              Please select a workspace from the sidebar to view tasks
            </p>
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-lg mb-4">
              No projects in this workspace yet
            </p>
            <p className="text-sm text-muted-foreground">
              Create a project first to start adding tasks
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <TaskSection status="task_redline" tasks={taskRedlineTasks} />
            <TaskSection status="progress_update" tasks={progressUpdateTasks} />
            <TaskSection status="done_completed" tasks={completeTasks} />
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
          assignees={[]} // TODO: Load task assignees from user IDs
          createdBy={null} // TODO: Load creator from user ID
        />
      )}
    </div>
  );
};

export default TasksPage;
