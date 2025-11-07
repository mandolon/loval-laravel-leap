import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import type { Task, User } from "@/lib/api/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, UserPlus, ChevronDown, ChevronRight, Upload } from "lucide-react";
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
import { DESIGN_TOKENS as T } from "@/lib/design-tokens";
import { StatusDot } from "@/components/taskboard/StatusDot";
import { QuickAddTaskRow } from "@/components/taskboard/QuickAddTaskRow";
import { UserAvatar } from "@/components/UserAvatar";

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

  // Realtime subscription for tasks
  useEffect(() => {
    if (!workspaceId) return;

    const channel = supabase
      .channel('tasks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks'
        },
        () => {
          // Refetch will be handled by React Query invalidation
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workspaceId]);

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

    const handleStatusClick = () => {
      const nextStatus = task.status === 'task_redline' 
        ? 'progress_update' 
        : task.status === 'progress_update' 
        ? 'done_completed' 
        : 'task_redline';
      handleTaskUpdate(task.id, { status: nextStatus });
    };

    if (!creator) return null;

    return (
      <tr 
        onClick={() => handleTaskClick(task)}
        className="hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer border-b border-gray-200 dark:border-gray-700"
      >
        {/* Column 1: Status Dot */}
        <td className="px-3 py-2 text-center">
          <div style={{ marginLeft: '11px', display: 'inline-block' }}>
            <StatusDot 
              status={task.status} 
              onClick={handleStatusClick}
            />
          </div>
        </td>

        {/* Column 2: Name (Address above title) */}
        <td className="px-3 py-2">
          {project ? (
            <Link 
              to={`/workspace/${project.workspaceId}/project/${project.id}`}
              onClick={(e) => e.stopPropagation()}
              className="text-gray-500 dark:text-gray-400 text-xs leading-tight mb-1 select-text cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 hover:underline inline-block"
            >
              {addressDisplay}
            </Link>
          ) : (
            <div className="text-gray-500 dark:text-gray-400 text-xs leading-tight mb-1">{addressDisplay}</div>
          )}
                  <div className="text-gray-900 dark:text-gray-100 font-normal leading-tight" style={{ fontSize: '13px' }}>
                    {task.title}
                  </div>
        </td>

        {/* Column 3: Files */}
        <td 
          className="w-12 px-2 py-2 text-center hover:border-l hover:border-r hover:border-gray-300 dark:hover:border-gray-600"
          onClick={(e) => e.stopPropagation()}
        >
          {fileCount > 0 && (
            <span className="text-gray-600 dark:text-gray-400 text-xs mr-1">{fileCount}</span>
          )}
          <input
            ref={(el) => fileInputRef || el}
            type="file"
            className="hidden"
            onChange={handleFileUpload}
            onClick={(e) => e.stopPropagation()}
          />
          <button 
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded p-0.5 transition-colors inline-flex items-center justify-center"
            onClick={(e) => {
              e.stopPropagation();
              const input = e.currentTarget.previousElementSibling as HTMLInputElement;
              input?.click();
            }}
            disabled={uploadFileMutation.isPending}
          >
            {uploadFileMutation.isPending ? (
              <Upload className="h-3.5 w-3.5 animate-pulse" />
            ) : (
              <Plus size={14} />
            )}
          </button>
        </td>

        {/* Column 4: Date Created */}
        <td 
          className="w-20 px-2 py-2 text-gray-600 dark:text-gray-400 whitespace-nowrap hover:border-l hover:border-r hover:border-gray-300 dark:hover:border-gray-600" 
          style={{ fontSize: '14px' }}
        >
          {formatDate(task.createdAt)}
        </td>

        {/* Column 5: Created By */}
        <td className="w-16 px-2 py-2 text-center hover:border-l hover:border-r hover:border-gray-300 dark:hover:border-gray-600">
          <div className="flex justify-center">
            <UserAvatar 
              user={{
                name: creator.name,
                avatar_url: creator.avatarUrl,
              }} 
              size="xs" 
            />
          </div>
        </td>

        {/* Column 6: Assigned To */}
        <td 
          className="w-16 px-2 py-2 text-center hover:border-l hover:border-r hover:border-gray-300 dark:hover:border-gray-600"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex gap-1 justify-center items-center">
            {assignees.slice(0, 2).map((assignee) => (
              <UserAvatar 
                key={assignee.id} 
                user={{
                  name: assignee.name,
                  avatar_url: assignee.avatarUrl,
                }} 
                size="xs" 
              />
            ))}
            {assignees.length > 2 && (
              <div className="w-6 h-6 rounded-full bg-gray-400 dark:bg-gray-600 border-2 border-white dark:border-gray-800 flex items-center justify-center text-white font-semibold text-[9px]">
                +{assignees.length - 2}
              </div>
            )}
            <Popover open={isAssignPopoverOpen} onOpenChange={setIsAssignPopoverOpen}>
              <PopoverTrigger asChild>
                <button className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
                  <UserPlus size={16} />
                </button>
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
                            <UserAvatar 
                              user={{
                                name: member.userName,
                                avatar_url: member.userAvatarUrl,
                              }} 
                              size="xs" 
                            />
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
        </td>

        {/* Column 7: Empty spacer */}
        <td className="w-32 pr-8"></td>
      </tr>
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
    const [showQuickAdd, setShowQuickAdd] = useState(false);

    const handleQuickAddSave = (input: CreateTaskInput) => {
      handleCreateTask(input);
      setShowQuickAdd(false);
    };

    return (
      <div className="mb-6">
        {/* Header - compact design matching taskboard */}
        <div 
          className="flex items-center gap-4 mb-3 cursor-pointer"
          onClick={() => toggleSection(status)}
        >
          <button className="p-0 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100">
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
          </button>
          <Badge className={config.color}>{config.label}</Badge>
          <span className="text-gray-500 dark:text-gray-400 text-xs font-medium">{config.count}</span>
        </div>

        {/* Table */}
        {!isCollapsed && (
          <div className="overflow-visible pl-8">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="w-8 px-3 py-1.5 text-left font-semibold text-gray-700 dark:text-gray-300 text-xs"></th>
                  <th className="px-3 py-1.5 text-left font-semibold text-gray-700 dark:text-gray-300 text-xs">Name</th>
                  <th className="w-12 px-2 py-1.5 text-center font-semibold text-gray-700 dark:text-gray-300 text-xs whitespace-nowrap">Files</th>
                  <th className="w-20 px-2 py-1.5 text-left font-semibold text-gray-700 dark:text-gray-300 text-xs whitespace-nowrap">Date</th>
                  <th className="w-16 px-2 py-1.5 text-center font-semibold text-gray-700 dark:text-gray-300 text-xs whitespace-nowrap">Created</th>
                  <th className="w-16 px-2 py-1.5 text-center font-semibold text-gray-700 dark:text-gray-300 text-xs whitespace-nowrap">Assigned</th>
                  <th className="w-32 pr-8"></th>
                </tr>
              </thead>
              <tbody>
                {sectionTasks.map(task => (
                  <TaskRow key={task.id} task={task} />
                ))}
                
                {/* Quick Add Row */}
                {showQuickAdd && (
                  <QuickAddTaskRow
                    status={status}
                    projects={projects}
                    onSave={handleQuickAddSave}
                    onCancel={() => setShowQuickAdd(false)}
                  />
                )}
              </tbody>
            </table>

            {/* Add Task button */}
            {sectionTasks.length > 0 && (
              <div className="py-1.5" style={{ paddingLeft: '44px' }}>
                {!showQuickAdd && (
                  <button
                    onClick={() => setShowQuickAdd(true)}
                    className="flex items-center hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 px-2 py-1.5 rounded transition-colors group"
                    style={{ fontSize: '14px' }}
                  >
                    <Plus size={14} className="text-gray-600 dark:text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 mr-3" />
                    <span className="text-gray-400 dark:text-gray-500 group-hover:text-gray-900 dark:group-hover:text-gray-100">Add Task</span>
                  </button>
                )}
              </div>
            )}

            {/* Empty state */}
            {sectionTasks.length === 0 && (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground mb-4">No tasks</p>
                {!showQuickAdd && (
                  <button
                    onClick={() => setShowQuickAdd(true)}
                    className="flex items-center justify-center mx-auto hover:text-gray-900 hover:bg-gray-100 px-3 py-2 rounded transition-colors group"
                    style={{ fontSize: '14px' }}
                  >
                    <Plus size={14} className="text-gray-600 group-hover:text-gray-600 mr-2" />
                    <span className="text-gray-400 group-hover:text-gray-900">Add Task</span>
                  </button>
                )}
                {showQuickAdd && (
                  <table className="w-full border-collapse text-xs">
                    <tbody>
                      <QuickAddTaskRow
                        status={status}
                        projects={projects}
                        onSave={handleQuickAddSave}
                        onCancel={() => setShowQuickAdd(false)}
                      />
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full w-full text-[12px] overflow-hidden pb-6 pr-1">
      <div className={`${T.panel} ${T.radius} min-h-0 min-w-0 grid grid-rows-[auto_1fr] overflow-hidden h-full`}>
      {/* Header */}
      <div className="h-9 px-3 border-b border-slate-200 dark:border-[#1d2230] flex items-center bg-white dark:bg-[#0E1118]">
        <span className="text-[12px] font-medium">
          {view === 'completed' ? 'Completed Tasks' : view === 'my-tasks' ? 'My Tasks' : 'All Tasks'}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
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
            <p className="text-muted-foreground text-lg mb-2">No workspace selected</p>
            <p className="text-sm text-muted-foreground">
              Please select a workspace from the sidebar to view tasks
            </p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground">No tasks found</p>
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
          assignees={[]}
          createdBy={null}
        />
      )}
      </div>
    </div>
  );
};

export default TasksPage;
