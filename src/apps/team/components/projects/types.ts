export interface Project {
  id: string;
  name: string;
  stage: 'Pre-Design' | 'Design' | 'Permit' | 'Build';
  nextLabel: string | null;
  startedAt: string;
}

export interface ProjectTodo {
  id: string;
  text: string;
  completed: boolean;
  isEditing?: boolean;
}

export type SortOption = 'priority' | 'status' | 'started';
