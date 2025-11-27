import React, { useState, useMemo, useEffect } from 'react';
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { restrictToVerticalAxis, restrictToParentElement } from '@dnd-kit/modifiers';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { Project, ProjectTodo, SortOption } from './types';
import { SortableProjectRow } from './SortableProjectRow';
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

interface ProjectTodosData {
  [projectId: string]: {
    todos: ProjectTodoData[];
    lastUpdated: string;
  };
}

interface WorkspaceMetadata {
  projectOrder?: ProjectOrderData;
  projectTodos?: ProjectTodosData;
}

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
  const [focusListProject, setFocusListProject] = useState<Project | null>(null);
  const [focusTodos, setFocusTodos] = useState<ProjectTodo[]>([]);
  const [focusListAnchorRef, setFocusListAnchorRef] = useState<React.RefObject<HTMLElement> | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

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

        const metadata = (workspaceSettings?.metadata || {}) as WorkspaceMetadata;
        const projectTodoData = metadata.projectTodos?.[p.id];
        const firstIncompleteTodo = projectTodoData?.todos?.find((t: ProjectTodoData) => !t.completed);

        return {
          id: p.id,
          name: displayName,
          stage: p.phase,
          nextLabel: firstIncompleteTodo?.text || null,
          startedAt: p.createdAt,
        };
      });
  }, [dbProjects, workspaceSettings]);

  // Get project order from metadata or default to DB order
  const projectOrder = useMemo(() => {
    const metadata = (workspaceSettings?.metadata || {}) as WorkspaceMetadata;
    const savedOrder = metadata.projectOrder?.projectIds || [];
    
    // If we have saved order, use it; otherwise use order from DB
    if (savedOrder.length > 0) {
      // Filter to only include projects that still exist
      return savedOrder.filter((id) => activeProjects.some((p) => p.id === id));
    }
    
    return activeProjects.map((p) => p.id);
  }, [activeProjects, workspaceSettings]);

  // Update project order when active projects change
  useEffect(() => {
    const metadata = (workspaceSettings?.metadata || {}) as WorkspaceMetadata;
    const savedOrder = metadata.projectOrder?.projectIds || [];
    
    // If there are active projects but no saved order, initialize it
    if (activeProjects.length > 0 && savedOrder.length === 0) {
      const initialOrder = activeProjects.map((p) => p.id);
      updateProjectOrderInDB(initialOrder);
    }
  }, [activeProjects]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Persist todos to database
  const updateTodosInDB = async (projectId: string, todos: ProjectTodo[]) => {
    if (!workspaceId) return;

    const metadata = (workspaceSettings?.metadata || {}) as WorkspaceMetadata;
    const currentTodos = metadata.projectTodos || {};
    
    const updatedMetadata: WorkspaceMetadata = {
      ...metadata,
      projectTodos: {
        ...currentTodos,
        [projectId]: {
          todos: todos.map((t) => ({
            id: t.id,
            text: t.text,
            completed: t.completed,
            createdAt: new Date().toISOString(),
          })),
          lastUpdated: new Date().toISOString(),
        },
      },
    };

    updateSettingsMutation.mutate({
      workspaceId,
      input: { metadata: updatedMetadata as Record<string, unknown> },
    });
  };

  const handleOpenFocusList = (project: Project, anchorRef: React.RefObject<HTMLElement>) => {
    setFocusListProject(project);
    setFocusListAnchorRef(anchorRef);

    // Load todos from metadata
    const metadata = (workspaceSettings?.metadata || {}) as WorkspaceMetadata;
    const projectTodoData = metadata.projectTodos?.[project.id];
    
    const loadedTodos: ProjectTodo[] = projectTodoData?.todos?.map((t: ProjectTodoData) => ({
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
    
    if (focusListProject) {
      updateTodosInDB(focusListProject.id, updatedTodos);
    }
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
    const updatedTodos = focusTodos.map((todo) =>
      todo.id === todoId ? { ...todo, text: newText, isEditing: false } : todo
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

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event: any) => {
    setActiveId(null);
    if (!allowDrag) return;

    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = projectOrder.indexOf(active.id);
    const newIndex = projectOrder.indexOf(over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = arrayMove(projectOrder, oldIndex, newIndex);
    updateProjectOrderInDB(newOrder);
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const handleUpdateStatus = (projectId: string, newStatus: Project['stage']) => {
    // Update project phase in database
    updateProjectMutation.mutate({
      id: projectId,
      input: { phase: newStatus },
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

    // Priority sort: use saved project order
    return projectOrder
      .map((id) => activeProjects.find((p) => p.id === id))
      .filter(Boolean) as Project[];
  }, [activeProjects, projectOrder, sortBy]);

  const activeProject = activeId ? activeProjects.find((p) => p.id === activeId) : null;

  if (isLoadingProjects) {
    return (
      <div ref={containerRef} className="flex gap-4 lg:gap-6 relative">
        <div className="flex-1 rounded-xl border border-neutral-200 bg-white/60 flex flex-col min-w-0 min-h-0 max-h-[400px] lg:max-h-[calc(100vh-14rem)] lg:h-full overflow-hidden">
          <div className="flex items-center justify-between gap-2 sm:gap-4 px-3 sm:px-4 py-2 sm:py-3 border-b border-neutral-100">
            <h2 className="text-xs sm:text-sm font-semibold text-neutral-900">Active Projects</h2>
            <SortDropdown sortBy={sortBy} onSortChange={setSortBy} />
          </div>
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-[#4c75d1] border-r-transparent"></div>
              <p className="mt-2 text-xs text-neutral-500">Loading projects...</p>
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
        <div className="flex items-center justify-between gap-2 sm:gap-4 px-3 sm:px-4 py-2 sm:py-3 border-b border-neutral-100">
          <h2 className="text-xs sm:text-sm font-semibold text-neutral-900">Active Projects</h2>
          <SortDropdown sortBy={sortBy} onSortChange={setSortBy} />
        </div>

        {/* Project list */}
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
            modifiers={[restrictToVerticalAxis, restrictToParentElement]}
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
                  orderedProjects.map((project, index) => (
                    <SortableProjectRow
                      key={project.id}
                      project={project}
                      allowDrag={allowDrag}
                      index={index}
                      onOpenFocusList={handleOpenFocusList}
                      onUpdateStatus={handleUpdateStatus}
                    />
                  ))
                )}
              </div>
            </SortableContext>

            <DragOverlay>
              {activeProject && (
                <div className="bg-white border border-neutral-200 shadow-[0_4px_12px_rgba(0,0,0,0.15)] rounded-lg overflow-hidden">
                  <SortableProjectRow
                    project={activeProject}
                    allowDrag={true}
                    index={orderedProjects.findIndex((p) => p.id === activeProject.id)}
                    onOpenFocusList={() => {}}
                    onUpdateStatus={() => {}}
                  />
                </div>
              )}
            </DragOverlay>
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
