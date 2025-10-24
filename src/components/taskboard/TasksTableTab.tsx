import React, { useMemo, useState } from 'react';
import { useProjectMembers } from '@/lib/api/hooks/useProjectMembers';
import { UserAvatar } from '@/components/UserAvatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import type { Task, User } from '@/lib/api/types';
import { CreateTaskDialogSimple } from './CreateTaskDialogSimple';

type FilterState = 'all' | 'progress' | 'task' | 'completed';
type SortState = 'none' | 'asc' | 'desc';

interface TasksTableTabProps {
  projectId: string;
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onCreateTask: (input: { title: string; description?: string; projectId: string }) => void;
  onStatusChange: (taskId: string, status: Task['status']) => void;
}

// Status Icons
const IconCheck = () => (
  <svg viewBox="0 0 20 20" className="h-[18px] w-[18px] text-emerald-500" fill="currentColor" aria-hidden>
    <path d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.707-9.707-4 4a1 1 0 0 1-1.414 0l-2-2a1 1 0 1 1 1.414-1.414L9 10.586l3.293-3.293a1 1 0 1 1 1.414 1.414Z"/>
  </svg>
);

const IconOpenCircle = ({ color = "blue" }: { color?: "blue" | "red" }) => (
  <svg viewBox="0 0 20 20" className={`h-[18px] w-[18px] ${color === "red" ? "text-red-600" : "text-blue-600"}`} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <circle cx="10" cy="10" r="7" strokeDasharray="8 4" strokeLinecap="round" />
  </svg>
);

const IconAllTasks = () => (
  <svg viewBox="0 0 20 20" className="h-[18px] w-[18px] text-gray-500" fill="currentColor" aria-hidden>
    <path d="M9 2a1 1 0 0 0 0 2h2a1 1 0 1 0 0-2H9Z"/>
    <path fillRule="evenodd" d="M4 5a2 2 0 0 1 2-2 3 3 0 0 0 3 3h2a3 3 0 0 0 3-3 2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5Zm3 4a1 1 0 0 0 0 2h.01a1 1 0 1 0 0-2H7Zm3 0a1 1 0 0 0 0 2h3a1 1 0 1 0 0-2h-3Zm-3 4a1 1 0 1 0 0 2h.01a1 1 0 1 0 0-2H7Zm3 0a1 1 0 1 0 0 2h3a1 1 0 1 0 0-2h-3Z" clipRule="evenodd"/>
  </svg>
);

const IconChevron = () => (
  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-gray-400 transform rotate-90" fill="currentColor" aria-hidden>
    <path d="M9 6l8 6-8 6z" />
  </svg>
);

const IconDesc = () => (
  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <path d="M4 7h16M4 12h12M4 17h8" strokeLinecap="round"/>
  </svg>
);

const IconPaperclip = () => (
  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <path d="M8 7v8a4 4 0 1 0 8 0V6a3 3 0 1 0-6 0v9a2 2 0 1 0 4 0V8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const FILTER_OPTIONS = [
  {
    value: 'all' as const,
    label: 'All Tasks',
    icon: <IconAllTasks />,
  },
  {
    value: 'progress' as const,
    label: 'Progress/Update',
    icon: <IconOpenCircle color="blue" />,
  },
  {
    value: 'task' as const,
    label: 'Task/Redline',
    icon: <IconOpenCircle color="red" />,
  },
  {
    value: 'completed' as const,
    label: 'Completed',
    icon: <IconCheck />,
  },
] as const;

const labelForFilter = (value: FilterState): string => {
  const option = FILTER_OPTIONS.find(opt => opt.value === value);
  return option?.label.toUpperCase() || 'ALL TASKS';
};

const formatDate = (isoDate: string) => {
  return format(new Date(isoDate), 'MMM d, yy');
};

export const TasksTableTab = ({ 
  projectId, 
  tasks, 
  onTaskClick, 
  onCreateTask, 
  onStatusChange 
}: TasksTableTabProps) => {
  const [filter, setFilter] = useState<FilterState>('all');
  const [sortBy, setSortBy] = useState<SortState>('none');
  
  const { data: projectMembers = [] } = useProjectMembers(projectId);

  // Create user lookup map
  const userMap = useMemo(() => {
    return new Map(
      projectMembers.map(m => [m.userId, m.user])
    );
  }, [projectMembers]);

  // Filter tasks based on current filter
  const filteredTasks = useMemo(() => {
    let filtered = tasks;
    
    // Apply filter
    if (filter !== 'all') {
      filtered = tasks.filter((task) => {
        if (filter === 'progress') return task.status === 'progress_update';
        if (filter === 'task') return task.status === 'task_redline';
        if (filter === 'completed') return task.status === 'done_completed';
        return true;
      });
    }
    
    // Apply sorting
    if (sortBy !== 'none') {
      filtered = [...filtered].sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        
        if (sortBy === 'asc') {
          return dateA - dateB; // oldest first
        } else {
          return dateB - dateA; // newest first
        }
      });
    }
    
    return filtered;
  }, [tasks, filter, sortBy]);

  const handleSortClick = () => {
    // Cycle through: none -> asc -> desc -> none
    if (sortBy === 'none') {
      setSortBy('asc');
    } else if (sortBy === 'asc') {
      setSortBy('desc');
    } else {
      setSortBy('none');
    }
  };

  const handleStatusClick = (e: React.MouseEvent, task: Task) => {
    e.stopPropagation(); // Prevent row click
    
    // If task is not completed, mark it as completed
    // If task is completed, mark it as task_redline (reopen)
    let newStatus: Task['status'];
    if (task.status === 'done_completed') {
      newStatus = 'task_redline'; // reopen
    } else {
      newStatus = 'done_completed'; // complete
    }
    
    onStatusChange(task.id, newStatus);
  };

  const getStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'done_completed':
        return <IconCheck />;
      case 'progress_update':
        return <IconOpenCircle color="blue" />;
      case 'task_redline':
        return <IconOpenCircle color="red" />;
      default:
        return <IconOpenCircle color="blue" />;
    }
  };

  return (
    <div className="min-h-screen w-full bg-transparent p-6 text-gray-900 dark:text-neutral-300">
      {/* Card Container */}
      <div className="mx-0 rounded-xl border border-gray-200 dark:border-[#1a2030]/60 bg-white dark:bg-[#0E1118] shadow-sm">
        {/* Header */}
        <div className="flex items-center px-5 py-4 mb-1">
          <h2 className="text-[15px] font-medium text-gray-800 dark:text-neutral-300">Task List</h2>
        </div>

        {/* Controls Row */}
        <div className="px-5">
          <div className="flex items-center justify-between border-t border-gray-200 dark:border-[#1a2030]/60 py-3">
            <div className="flex items-center gap-2">
              <IconChevron />
              
              {/* Filter Popover */}
              <Popover>
                <PopoverTrigger asChild>
                  <button className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-[11px] bg-white text-gray-700 border-gray-300 hover:bg-gray-50 dark:bg-[#0E1118] dark:text-neutral-300 dark:border-[#1a2030]/60 dark:hover:bg-[#141C28]">
                    {filter === 'progress' && <IconOpenCircle color="blue" />}
                    {filter === 'task' && <IconOpenCircle color="red" />}
                    {filter === 'completed' && <IconCheck />}
                    {filter === 'all' && <IconAllTasks />}
                    <span className="uppercase">{labelForFilter(filter)}</span>
                    <ChevronDown className="h-3 w-3 text-gray-400" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-52 p-1" align="start">
                  <div className="flex flex-col">
                    {FILTER_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setFilter(option.value)}
                        className={`flex items-center gap-2 px-3 py-2 text-[13px] rounded-md transition-colors text-left ${
                          filter === option.value
                            ? 'bg-blue-50 dark:bg-[#141C28] text-blue-600 dark:text-blue-400'
                            : 'hover:bg-gray-50 dark:hover:bg-[#141C28] text-gray-700 dark:text-neutral-300'
                        }`}
                      >
                        {option.icon}
                        <span className="flex-1">{option.label}</span>
                        {filter === option.value && (
                          <Check className="h-3.5 w-3.5" />
                        )}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
              
              <span className="text-gray-600 dark:text-neutral-400 tabular-nums">{filteredTasks.length}</span>
            </div>
            
            <CreateTaskDialogSimple projectId={projectId} onCreateTask={onCreateTask} />
          </div>
        </div>

        {/* Column Headers */}
        <div className="px-5">
          <div className="grid grid-cols-[1fr_140px_120px_120px] items-center border-b border-gray-200 dark:border-[#1a2030]/60 px-0 pt-2 pb-2 text-[11px] text-gray-500 dark:text-neutral-400 leading-tight font-medium">
            <div>Name</div>
            <button 
              onClick={handleSortClick}
              className="text-left flex items-center gap-1 hover:text-gray-700 dark:hover:text-neutral-300 transition-colors"
            >
              Date created
              {sortBy === 'asc' && <ChevronUp className="h-3 w-3" />}
              {sortBy === 'desc' && <ChevronDown className="h-3 w-3" />}
            </button>
            <div className="text-left">Assignee</div>
            <div className="text-left">Created by</div>
          </div>
        </div>

        {/* Table Rows */}
        <ul className="divide-y divide-gray-200 dark:divide-[#1a2030]/60 px-5 pb-4">
          {filteredTasks.length === 0 ? (
            <li className="px-0 py-8 text-center">
              <div className="text-gray-500 dark:text-neutral-400 text-sm">
                {filter === 'all' ? 'No tasks yet' : 
                 filter === 'progress' ? 'No progress/update tasks' :
                 filter === 'task' ? 'No task/redline items' :
                 'No completed tasks'}
              </div>
            </li>
          ) : (
            filteredTasks.map((task: Task) => {
            const assignee = task.assignees[0] ? userMap.get(task.assignees[0]) : null;
            const creator = userMap.get(task.createdBy);
            
            return (
              <li 
                key={task.id} 
                className="grid grid-cols-[1fr_140px_120px_120px] items-center px-0 py-2 text-[13px] hover:bg-gray-50 dark:hover:bg-[#141C28] cursor-pointer transition-colors duration-150"
                onClick={() => onTaskClick(task)}
              >
                <div className="flex items-center gap-3 pl-4">
                  {/* Clickable status icon */}
                  <button
                    type="button"
                    onClick={(e) => handleStatusClick(e, task)}
                    title={task.status === 'done_completed' ? 'Reopen task' : 'Mark as complete'}
                    aria-label={task.status === 'done_completed' ? 'Reopen task' : 'Mark as complete'}
                    className="p-0 m-0 leading-none rounded-full focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-500/40"
                  >
                    {getStatusIcon(task.status)}
                  </button>

                  <span className="font-medium text-gray-800 dark:text-neutral-300">{task.title}</span>
                  
                  <span className="ml-1 flex items-center gap-2 text-gray-400" aria-label="Task detail indicators">
                    {/* Description icon */}
                    {task.description && (
                      <span title="Has description" aria-label="Has description" className="inline-flex items-center">
                        <IconDesc />
                        <span className="sr-only">Description present</span>
                      </span>
                    )}
                    
                    {/* Paperclip icon */}
                    {task.attachedFiles && task.attachedFiles.length > 0 && (
                      <span title="Has attachment" aria-label="Has attachment" className="inline-flex items-center">
                        <IconPaperclip />
                        <span className="sr-only">Attachment present</span>
                      </span>
                    )}
                  </span>
                </div>
                
                <div className="text-[13px] text-gray-600 dark:text-neutral-400">{formatDate(task.createdAt)}</div>
                
                <div>
                  {assignee ? (
                    <UserAvatar user={assignee} size="sm" />
                  ) : (
                    <span className="text-gray-400 dark:text-neutral-500">--</span>
                  )}
                </div>
                
                <div>
                  {creator ? (
                    <UserAvatar user={creator} size="sm" />
                  ) : (
                    <span className="text-gray-400 dark:text-neutral-500">--</span>
                  )}
                </div>
              </li>
            );
          })
          )}
        </ul>
      </div>
    </div>
  );
};
