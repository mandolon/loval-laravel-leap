import React, { useState, useMemo, useEffect } from 'react';
import { DndContext, DragOverlay, DragStartEvent, DragEndEvent, closestCenter } from '@dnd-kit/core';
import { restrictToVerticalAxis, restrictToFirstScrollableAncestor } from '@dnd-kit/modifiers';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { Project, ProjectTodo, SortOption } from './types';
import { SortableProjectRow, ProjectRowContent } from './SortableProjectRow';
import { SortDropdown } from './SortDropdown';
import { FocusListPanel } from './FocusListPanel';
import { useProjects, useUpdateProject } from '@/lib/api/hooks/useProjects';
import { useWorkspaceSettings, useUpdateWorkspaceSettings } from '@/lib/api/hooks/useWorkspaceSettings';
import { useWorkspaces } from '@/hooks/useWorkspaces';
import type { Project as DBProject } from '@/lib/api/types';

interface ActiveProjectsListProps {
  containerRef?: React.Ref<HTMLDivElement>;
}

interface ProjectTodoData {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
}

interface ProjectOrderData {
  projectIds: string[];
  lastUpdated: string;
}

interface WorkspaceMetadata {
  projectOrder?: ProjectOrderData;
  projectColors?: Record<string, 'default' | 'red' | 'yellow'>;
}

interface ProjectMetadata {
  focusTodos?: {
    todos: ProjectTodoData[];
    lastUpdated: string;
  };
}

const FOCUS_TODO_MAX_LENGTH = 25;

export const ActiveProjectsList: React.FC<ActiveProjectsListProps> = ({ containerRef }) => {
  const { currentWorkspace } = useWorkspaces();
  const workspaceId = currentWorkspace?.id || '';

  // Fetch projects from database
  const { data: dbProjects = [], isLoading: isLoadingProjects } = useProjects(workspaceId);
  const updateProjectMutation = useUpdateProject(workspaceId);
  
  // Fetch workspace settings (for project order and todos)
  const { data: workspaceSettings } = useWorkspaceSettings(workspaceId);
  const updateSettingsMutation = useUpdateWorkspaceSettings();

  const [sortBy, setSortBy] = useState<SortOption>('priority');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overlayStyle, setOverlayStyle] = useState<React.CSSProperties | undefined>(undefined);
  const [focusListProject, setFocusListProject] = useState<Project | null>(null);
  const [focusTodos, setFocusTodos] = useState<ProjectTodo[]>([]);
  const [focusListAnchorRef, setFocusListAnchorRef] = useState<React.RefObject<HTMLElement> | null>(null);
  const [localProjectOrder, setLocalProjectOrder] = useState<string[]>([]);
  const [projectColors, setProjectColors] = useState<Record<string, 'default' | 'red' | 'yellow'>>({});

  // Transform database projects to UI projects
  const activeProjects = useMemo(() => {
    return dbProjects
      .filter((p) => p.status === 'active')
      .map((p): Project => {
        const address = p.address || {};
        const displayName = 
          address.streetNumber && address.streetName 
            ? `${address.streetNumber} ${address.streetName}`
            : p.name;

        const projectMetadata = (p.metadata || {}) as ProjectMetadata;
        // Filter out unsaved "New to-do" items from the Next label
        const firstIncompleteTodo = projectMetadata.focusTodos?.todos?.find(
          (t: ProjectTodoData) => !t.completed && t.text !== 'New to-do'
        );

        return {
          id: p.id,
          name: displayName,
          stage: p.phase,
          nextLabel: firstIncompleteTodo?.text || null,
          startedAt: p.createdAt,
        };
      });
  }, [dbProjects]);

  // Get project order from metadata or default to DB order
  const projectOrder = useMemo(() => {
    const metadata = (workspaceSettings?.metadata || {}) as WorkspaceMetadata;
    const savedOrder = metadata.projectOrder?.projectIds || [];
    
    // If we have saved order, use it; otherwise use order from DB
    if (savedOrder.length > 0) {
      // Filter to only include projects that still exist
      const existingOrder = savedOrder.filter((id) => activeProjects.some((p) => p.id === id));
      
      // Add any new projects that aren't in the saved order
      const newProjects = activeProjects
        .filter((p) => !savedOrder.includes(p.id))
        .map((p) => p.id);
      
      const finalOrder = [...existingOrder, ...newProjects];
      return finalOrder;
    }
    
    const defaultOrder = activeProjects.map((p) => p.id);
    return defaultOrder;
  }, [activeProjects, workspaceSettings]);

  // Sync local order with server order
  useEffect(() => {
    setLocalProjectOrder(projectOrder);
  }, [projectOrder]);

  // Load project colors from metadata
  useEffect(() => {
    const metadata = (workspaceSettings?.metadata || {}) as WorkspaceMetadata;
    if (metadata.projectColors) {
      setProjectColors(metadata.projectColors);
    }
  }, [workspaceSettings]);

  // Update project order when active projects change
  useEffect(() => {
    const metadata = (workspaceSettings?.metadata || {}) as WorkspaceMetadata;
    const savedOrder = metadata.projectOrder?.projectIds || [];
    
    // If there are active projects but no saved order, initialize it
    // BUT: Only initialize if we actually have projects AND workspace settings have loaded
    if (activeProjects.length > 0 && savedOrder.length === 0 && workspaceSettings) {
      const initialOrder = activeProjects.map((p) => p.id);
      updateProjectOrderInDB(initialOrder);
    }
  }, [activeProjects, workspaceSettings]); // eslint-disable-line react-hooks/exhaustive-deps

  const allowDrag = sortBy === 'priority';

  // Persist project order to database
  const updateProjectOrderInDB = async (newOrder: string[]) => {
    if (!workspaceId) return;

    const metadata = (workspaceSettings?.metadata || {}) as WorkspaceMetadata;
    const updatedMetadata: WorkspaceMetadata = {
      ...metadata,
      projectOrder: {
        projectIds: newOrder,
        lastUpdated: new Date().toISOString(),
      },
    };

    updateSettingsMutation.mutate({
      workspaceId,
      input: { metadata: updatedMetadata as Record<string, unknown> },
    });
  };

  // Persist todos to database in project metadata
  const updateTodosInDB = async (projectId: string, todos: ProjectTodo[]) => {
    if (!workspaceId) return;

    const project = dbProjects.find((p) => p.id === projectId);
    if (!project) return;

    const currentMetadata = (project.metadata || {}) as ProjectMetadata;
    
    const updatedMetadata: ProjectMetadata = {
      ...currentMetadata,
      focusTodos: {
        todos: todos.map((t) => ({
          id: t.id,
          text: t.text,
          completed: t.completed,
          createdAt: new Date().toISOString(),
        })),
        lastUpdated: new Date().toISOString(),
      },
    };

    updateProjectMutation.mutate({
      id: projectId,
      input: { metadata: updatedMetadata as Record<string, unknown> },
    });
  };

  const handleOpenFocusList = (project: Project, anchorRef: React.RefObject<HTMLElement>) => {
    setFocusListProject(project);
    setFocusListAnchorRef(anchorRef);

    // Load todos from project metadata
    const dbProject = dbProjects.find((p) => p.id === project.id);
    const projectMetadata = (dbProject?.metadata || {}) as ProjectMetadata;
    
    const loadedTodos: ProjectTodo[] = projectMetadata.focusTodos?.todos?.map((t: ProjectTodoData) => ({
      id: t.id,
      text: t.text,
      completed: t.completed,
    })) || [];

    // If no todos exist, create one from nextLabel if available
    if (loadedTodos.length === 0 && project.nextLabel) {
      loadedTodos.push({
        id: 't-next',
        text: project.nextLabel,
        completed: false,
      });
    }

    setFocusTodos(loadedTodos);
  };

  const handleAddTodo = () => {
    const newTodo: ProjectTodo = {
      id: `t${Date.now()}`,
      text: 'New to-do',
      completed: false,
      isEditing: true,
    };
    const updatedTodos = [...focusTodos, newTodo];
    setFocusTodos(updatedTodos);
    // Don't save to DB yet - wait for user to finish editing
  };

  const handleToggleTodo = (todoId: string) => {
    const updatedTodos = focusTodos.map((todo) =>
      todo.id === todoId ? { ...todo, completed: !todo.completed } : todo
    );
    setFocusTodos(updatedTodos);
    
    if (focusListProject) {
      updateTodosInDB(focusListProject.id, updatedTodos);
    }
  };

  const handleDeleteTodo = (todoId: string) => {
    const updatedTodos = focusTodos.filter((todo) => todo.id !== todoId);
    setFocusTodos(updatedTodos);
    
    if (focusListProject) {
      updateTodosInDB(focusListProject.id, updatedTodos);
    }
  };

  const handleUpdateTodo = (todoId: string, newText: string) => {
    const trimmedText = newText.trim().slice(0, FOCUS_TODO_MAX_LENGTH);

    // If text is empty or just whitespace, delete the todo instead
    if (!trimmedText) {
      handleDeleteTodo(todoId);
      return;
    }
    
    const updatedTodos = focusTodos.map((todo) =>
      todo.id === todoId ? { ...todo, text: trimmedText, isEditing: false } : todo
    );
    setFocusTodos(updatedTodos);
    
    if (focusListProject) {
      updateTodosInDB(focusListProject.id, updatedTodos);
    }
  };

  const handleReorderTodos = (reorderedTodos: ProjectTodo[]) => {
    setFocusTodos(reorderedTodos);
    
    if (focusListProject) {
      updateTodosInDB(focusListProject.id, reorderedTodos);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    
    // Capture the original item's position and calculate offset from cursor
    const activeElement = document.querySelector(`[data-id="${event.active.id}"]`);
    if (activeElement) {
      const rect = activeElement.getBoundingClientRect();
      // Try to get cursor position from the activator event
      const activatorEvent = (event as any).activatorEvent;
      
      if (activatorEvent) {
        // Calculate offset from cursor to item's top-left corner
        const offsetX = rect.left - activatorEvent.clientX;
        const offsetY = rect.top - activatorEvent.clientY;
        
        // Apply offset as transform to position overlay at item's location
        setOverlayStyle({
          transform: `translate(${offsetX}px, ${offsetY}px)`,
        });
      } else {
        // Fallback: position absolutely at item location
        setOverlayStyle({
          position: 'fixed',
          left: `${rect.left}px`,
          top: `${rect.top}px`,
          width: `${rect.width}px`,
        });
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    setOverlayStyle(undefined);
    if (!allowDrag) return;

    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = localProjectOrder.indexOf(active.id as string);
    const newIndex = localProjectOrder.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = arrayMove(localProjectOrder, oldIndex, newIndex);
    
    // Update local state immediately for instant UI feedback
    setLocalProjectOrder(newOrder);
    
    // Update database after render
    requestAnimationFrame(() => {
      updateProjectOrderInDB(newOrder);
    });
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setOverlayStyle(undefined);
  };

  const handleUpdateStatus = (projectId: string, newStatus: Project['stage']) => {
    // Update project phase in database
    updateProjectMutation.mutate({
      id: projectId,
      input: { phase: newStatus },
    });
  };

  const handleProjectColorChange = (projectId: string, color: 'default' | 'red' | 'yellow') => {
    const updatedColors = {
      ...projectColors,
      [projectId]: color,
    };
    setProjectColors(updatedColors);

    // Save to workspace metadata
    const metadata = (workspaceSettings?.metadata || {}) as WorkspaceMetadata;
    const updatedMetadata: WorkspaceMetadata = {
      ...metadata,
      projectColors: updatedColors,
    };

    updateSettingsMutation.mutate({
      workspaceId,
      input: { metadata: updatedMetadata as Record<string, unknown> },
    });
  };

  const orderedProjects = useMemo(() => {
    if (sortBy === 'started') {
      return [...activeProjects].sort((a, b) => {
        return new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime();
      });
    }

    if (sortBy === 'status') {
      const statusOrder = { 'Pre-Design': 1, Design: 2, Permit: 3, Build: 4 };
      return [...activeProjects].sort((a, b) => {
        return statusOrder[a.stage] - statusOrder[b.stage];
      });
    }

    // Priority sort: use local project order for immediate feedback
    return localProjectOrder
      .map((id) => activeProjects.find((p) => p.id === id))
      .filter(Boolean) as Project[];
  }, [activeProjects, localProjectOrder, sortBy]);

  const activeProject = activeId ? activeProjects.find((p) => p.id === activeId) : null;

  if (isLoadingProjects) {
    return (
      <div ref={containerRef} className="flex gap-4 lg:gap-6 relative">
        <div className="flex-1 rounded-xl border border-neutral-200 bg-white/60 flex flex-col min-w-0 min-h-0 max-h-[400px] lg:max-h-[calc(100vh-14rem)] lg:h-full overflow-hidden">
          <div className="flex items-center justify-between px-3 md:px-4 pt-3 md:pt-4 pb-3 border-b border-neutral-100">
            <h3 className="text-xs md:text-[13px] font-semibold text-[#202020]">Active Projects</h3>
            <SortDropdown sortBy={sortBy} onSortChange={setSortBy} />
          </div>
          <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide min-w-0">
            <div className="p-3">
              <div className="space-y-2">
                {[0, 1, 2, 3].map((idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 sm:py-3 bg-white border border-neutral-100 rounded-lg shadow-[0_1px_2px_rgba(0,0,0,0.04)] animate-pulse"
                  >
                    <div className="flex-shrink-0 w-4 sm:w-5 flex items-center justify-center">
                      <div className="h-6 w-2 rounded bg-neutral-200" />
                    </div>
                    <div className="flex-shrink-0 w-4 sm:w-5 flex items-center justify-center">
                      <div className="h-3 w-3 rounded bg-neutral-200" />
                    </div>
                    <div className="flex-1 min-w-0 relative flex flex-col justify-center max-w-[50%] gap-1.5">
                      <div className="h-3 w-16 rounded bg-neutral-200" />
                      <div className="h-4 w-32 sm:w-40 rounded bg-neutral-200" />
                    </div>
                    <div className="w-32 sm:w-40 md:w-48 flex-shrink-0 flex items-center justify-end">
                      <div className="h-4 w-24 sm:w-28 md:w-32 rounded bg-neutral-200" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex gap-4 lg:gap-6 relative">
      {/* Main project list */}
      <div className="flex-1 rounded-xl border border-neutral-200 bg-white/60 flex flex-col min-w-0 min-h-0 max-h-[400px] lg:max-h-[calc(100vh-14rem)] lg:h-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-3 md:px-4 pt-3 md:pt-4 pb-3 border-b border-neutral-100">
          <h3 className="text-xs md:text-[13px] font-semibold text-[#202020]">Active Projects</h3>
          <SortDropdown sortBy={sortBy} onSortChange={setSortBy} />
        </div>

        {/* Project list */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide min-w-0">
          <DndContext
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
            modifiers={[restrictToVerticalAxis, restrictToFirstScrollableAncestor]}
          >
            <SortableContext
              items={orderedProjects.map((p) => p.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="p-3">
                {orderedProjects.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-neutral-500">No active projects</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {orderedProjects.map((project, index) => (
                      <SortableProjectRow
                        key={project.id}
                        project={project}
                        allowDrag={allowDrag}
                        index={index}
                        isPriorityView={sortBy === 'priority'}
                        workspaceId={workspaceId}
                        cardColor={projectColors[project.id] || 'default'}
                        onOpenFocusList={handleOpenFocusList}
                        onUpdateStatus={handleUpdateStatus}
                        onChangeColor={handleProjectColorChange}
                      />
                    ))}
                  </div>
                )}
              </div>
            </SortableContext>

          </DndContext>
        </div>
      </div>

      {/* Focus List Panel */}
      {focusListProject && focusListAnchorRef && (
        <FocusListPanel
          project={focusListProject}
          todos={focusTodos}
          anchorRef={focusListAnchorRef}
          onClose={() => setFocusListProject(null)}
          onAddTodo={handleAddTodo}
          onToggleTodo={handleToggleTodo}
          onDeleteTodo={handleDeleteTodo}
          onUpdateTodo={handleUpdateTodo}
          onReorderTodos={handleReorderTodos}
        />
      )}
    </div>
  );
};
