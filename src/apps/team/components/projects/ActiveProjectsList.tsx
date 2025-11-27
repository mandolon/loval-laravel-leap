import React, { useState } from 'react';
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { Project, ProjectTodo, SortOption } from './types';
import { SortableProjectRow } from './SortableProjectRow';
import { SortDropdown } from './SortDropdown';
import { FocusListPanel } from './FocusListPanel';

interface ActiveProjectsListProps {
  containerRef?: React.Ref<HTMLDivElement>;
}

const seedProjects: Project[] = [
  {
    id: 'p1',
    name: '3218 4th Ave',
    stage: 'Pre-Design',
    nextLabel: 'Planning submittal',
    startedAt: '2024-09-01',
  },
  {
    id: 'p2',
    name: 'Echo Summit Cabin',
    stage: 'Design',
    nextLabel: 'DD redlines',
    startedAt: '2024-08-15',
  },
  {
    id: 'p3',
    name: '2709 T Street',
    stage: 'Permit',
    nextLabel: 'City comments round 2',
    startedAt: '2024-10-02',
  },
  {
    id: 'p4',
    name: '500-502 U Street',
    stage: 'Build',
    nextLabel: 'Framing inspection',
    startedAt: '2024-07-20',
  },
  {
    id: 'p5',
    name: 'Tahoe Retreat',
    stage: 'Design',
    nextLabel: null,
    startedAt: '2024-11-01',
  },
];

export const ActiveProjectsList: React.FC<ActiveProjectsListProps> = ({ containerRef }) => {
  const [projects, setProjects] = useState(seedProjects);
  const [userOrder, setUserOrder] = useState(seedProjects.map((p) => p.id));
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

  const allowDrag = sortBy === 'priority';

  const handleOpenFocusList = (project: Project, anchorRef: React.RefObject<HTMLElement>) => {
    setFocusListProject(project);
    setFocusListAnchorRef(anchorRef);

    const todos: ProjectTodo[] = [];

    if (project.nextLabel) {
      todos.push({
        id: 't-next',
        text: project.nextLabel,
        completed: false,
      });
    }

    // Add sample additional todos
    todos.push(
      { id: 't2', text: 'Update material specs', completed: true },
      { id: 't3', text: 'Schedule client meeting', completed: false }
    );

    setFocusTodos(todos);
  };

  const handleAddTodo = () => {
    const newTodo: ProjectTodo = {
      id: `t${Date.now()}`,
      text: 'New to-do',
      completed: false,
      isEditing: true,
    };
    setFocusTodos([...focusTodos, newTodo]);
  };

  const handleToggleTodo = (todoId: string) => {
    const updatedTodos = focusTodos.map((todo) =>
      todo.id === todoId ? { ...todo, completed: !todo.completed } : todo
    );
    setFocusTodos(updatedTodos);
    syncNextLabelFromFocusList(updatedTodos);
  };

  const handleDeleteTodo = (todoId: string) => {
    const updatedTodos = focusTodos.filter((todo) => todo.id !== todoId);
    setFocusTodos(updatedTodos);
    syncNextLabelFromFocusList(updatedTodos);
  };

  const handleUpdateTodo = (todoId: string, newText: string) => {
    const updatedTodos = focusTodos.map((todo) =>
      todo.id === todoId ? { ...todo, text: newText, isEditing: false } : todo
    );
    setFocusTodos(updatedTodos);
    syncNextLabelFromFocusList(updatedTodos);
  };

  const handleReorderTodos = (reorderedTodos: ProjectTodo[]) => {
    setFocusTodos(reorderedTodos);
    syncNextLabelFromFocusList(reorderedTodos);
  };

  const syncNextLabelFromFocusList = (todos: ProjectTodo[]) => {
    if (!focusListProject) return;

    const firstIncompleteTodo = todos.find((todo) => !todo.completed);
    const newNextLabel = firstIncompleteTodo ? firstIncompleteTodo.text : null;

    setProjects((prevProjects) =>
      prevProjects.map((p) =>
        p.id === focusListProject.id ? { ...p, nextLabel: newNextLabel } : p
      )
    );

    setFocusListProject({ ...focusListProject, nextLabel: newNextLabel });
  };

  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event: any) => {
    setActiveId(null);
    if (!allowDrag) return;

    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setUserOrder((prev) => {
      const oldIndex = prev.indexOf(active.id);
      const newIndex = prev.indexOf(over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const handleUpdateStatus = (projectId: string, newStatus: Project['stage']) => {
    setProjects((prevProjects) =>
      prevProjects.map((p) => (p.id === projectId ? { ...p, stage: newStatus } : p))
    );
  };

  const orderedProjects = (() => {
    if (sortBy === 'started') {
      return [...projects].sort((a, b) => {
        return new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime();
      });
    }

    if (sortBy === 'status') {
      const statusOrder = { 'Pre-Design': 1, Design: 2, Permit: 3, Build: 4 };
      return [...projects].sort((a, b) => {
        return statusOrder[a.stage] - statusOrder[b.stage];
      });
    }

    return userOrder.map((id) => projects.find((p) => p.id === id)).filter(Boolean) as Project[];
  })();

  const activeProject = activeId ? projects.find((p) => p.id === activeId) : null;

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
          >
            <SortableContext
              items={orderedProjects.map((p) => p.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="p-3">
                {orderedProjects.map((project, index) => (
                  <SortableProjectRow
                    key={project.id}
                    project={project}
                    allowDrag={allowDrag}
                    index={index}
                    onOpenFocusList={handleOpenFocusList}
                    onUpdateStatus={handleUpdateStatus}
                  />
                ))}
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
