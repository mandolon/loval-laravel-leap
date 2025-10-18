import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import type { Task, User } from "@/lib/api/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, UserPlus, ChevronDown, ChevronRight, Upload, Paperclip } from "lucide-react";
import { useUploadTaskFile } from "@/lib/api/hooks/useFiles";
import { useToast } from "@/hooks/use-toast";
import { TaskDetailDialog } from "@/components/TaskDetailDialog";
import { CreateTaskDialog } from "@/components/CreateTaskDialog";
import type { CreateTaskInput } from "@/lib/api/types";
import { useWorkspaceTasks, useCreateTask, useUpdateTask, useDeleteTask } from "@/lib/api/hooks/useTasks";
import { useProjects } from "@/lib/api/hooks/useProjects";
import { useProjectMembers } from "@/lib/api/hooks/useProjectMembers";
import { supabase } from "@/integrations/supabase/client";
import { useUser } from "@/contexts/UserContext";
import { PageHeader } from "@/components/layout/PageHeader";

const TasksPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [searchParams] = useSearchParams();
  const { user } = useUser();
  const view = searchParams.get('view') || 'all';
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
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
    // Apply view-based filtering
    if (view === 'completed') {
      return task.status === 'done_completed';
    } else if (view === 'my-tasks') {
      // Show tasks assigned to the current user (excluding completed)
      if (!user?.id || !task.assignees.includes(user.id)) return false;
      return task.status !== 'done_completed';
    } else {
      // All tasks view: show Task Redline and Progress Update only (no completed)
      return task.status === 'task_redline' || task.status === 'progress_update';
    }
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
    const [isAssignPopoverOpen, setIsAssignPopoverOpen] = useState(false);
    const uploadFileMutation = useUploadTaskFile();
    const fileInputRef = useState<HTMLInputElement | null>(null)[0];
    
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

    // Fetch project members for assignment
    const { data: projectMembers = [] } = useProjectMembers(task.projectId);

    const handleToggleAssignee = (userId: string) => {
      const currentAssignees = task.assignees || [];
      const newAssignees = currentAssignees.includes(userId)
        ? currentAssignees.filter(id => id !== userId)
        : [...currentAssignees, userId];
      
      handleTaskUpdate(task.id, { assignees: newAssignees });
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      uploadFileMutation.mutate({
        file,
        taskId: task.id,
        projectId: task.projectId,
      });

      // Reset input
      e.target.value = '';
    };

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
              to={`/workspace/${project.workspaceId}/project/${project.id}`}
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
        <TableCell className="text-center w-[80px]" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-center gap-1">
            {fileCount > 0 && (
              <div className="flex items-center gap-1">
                <Paperclip className="h-3 w-3 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{fileCount}</span>
              </div>
            )}
            <input
              ref={(el) => fileInputRef || el}
              type="file"
              className="hidden"
              onChange={handleFileUpload}
              onClick={(e) => e.stopPropagation()}
            />
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0"
              onClick={(e) => {
                e.stopPropagation();
                const input = document.querySelector(`input[type="file"]`) as HTMLInputElement;
                input?.click();
              }}
              disabled={uploadFileMutation.isPending}
            >
              {uploadFileMutation.isPending ? (
                <Upload className="h-4 w-4 animate-pulse" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
          </div>
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
        <TableCell className="text-center w-[140px]">
          <div className="flex justify-center items-center gap-2">
            <div className="flex gap-1">
              {assignees.length > 0 ? (
                assignees.slice(0, 3).map((assignee) => (
                  <Avatar key={assignee.id} className="h-8 w-8">
                    <AvatarFallback 
                      className="text-white text-xs"
                      style={{ background: assignee.avatarUrl || 'linear-gradient(135deg, hsl(280, 70%, 60%) 0%, hsl(320, 80%, 65%) 100%)' }}
                    >
                      {assignee.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                ))
              ) : null}
            </div>
            <Popover open={isAssignPopoverOpen} onOpenChange={setIsAssignPopoverOpen}>
              <PopoverTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={(e) => e.stopPropagation()}
                >
                  <UserPlus className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent 
                className="w-64 p-3" 
                align="end"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Assign Team Members</h4>
                  {projectMembers.length > 0 ? (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {projectMembers.map((member) => (
                        <div 
                          key={member.userId}
                          className="flex items-center space-x-2"
                        >
                          <Checkbox
                            id={`assign-${task.id}-${member.userId}`}
                            checked={task.assignees.includes(member.userId)}
                            onCheckedChange={() => handleToggleAssignee(member.userId)}
                          />
                          <label
                            htmlFor={`assign-${task.id}-${member.userId}`}
                            className="flex items-center gap-2 cursor-pointer flex-1"
                          >
                            <Avatar className="h-6 w-6">
                              <AvatarFallback 
                                className="text-white text-xs"
                                style={{ background: member.userAvatarUrl || 'linear-gradient(135deg, hsl(280, 70%, 60%) 0%, hsl(320, 80%, 65%) 100%)' }}
                              >
                                {member.userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{member.userName}</span>
                          </label>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No team members in this project</p>
                  )}
                </div>
              </PopoverContent>
            </Popover>
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
                <TableHead className="text-center w-[140px]">Assigned to</TableHead>
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
        <PageHeader
          title={view === 'completed' ? 'Completed Tasks' : view === 'my-tasks' ? 'My Tasks' : 'All Tasks'}
          subtitle={workspaceId 
            ? view === 'completed' 
              ? 'View all completed tasks'
              : view === 'my-tasks'
              ? 'Tasks assigned to you'
              : 'Active tasks (Task Redline & Progress Update)'
            : "Select a workspace to view tasks"
          }
          actions={workspaceId && projects.length > 0 ? (
            <CreateTaskDialog 
              projects={projects} 
              onCreateTask={handleCreateTask}
            />
          ) : undefined}
        />

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
            {view === 'completed' ? (
              <TaskSection status="done_completed" tasks={completeTasks} />
            ) : (
              <>
                <TaskSection status="task_redline" tasks={taskRedlineTasks} />
                <TaskSection status="progress_update" tasks={progressUpdateTasks} />
              </>
            )}
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
