// Centralized API Client - localStorage for now, easy to swap to Laravel later!

import type { 
  Project, 
  Task, 
  CreateProjectInput, 
  CreateTaskInput,
  UpdateProjectInput,
  UpdateTaskInput 
} from './types';

// Helper to generate IDs
const generateId = () => crypto.randomUUID();

// Helper to get timestamp
const timestamp = () => new Date().toISOString();

// localStorage keys
const STORAGE_KEYS = {
  PROJECTS: 'projects',
  TASKS: 'tasks',
};

// Projects API
const projects = {
  list: (): Project[] => {
    const data = localStorage.getItem(STORAGE_KEYS.PROJECTS);
    return data ? JSON.parse(data) : [];
  },

  get: (id: string): Project | null => {
    const allProjects = projects.list();
    return allProjects.find(p => p.id === id) || null;
  },

  create: (input: CreateProjectInput): Project => {
    const newProject: Project = {
      id: generateId(),
      name: input.name,
      description: input.description,
      status: input.status || 'active',
      created_at: timestamp(),
      updated_at: timestamp(),
    };

    const allProjects = projects.list();
    allProjects.push(newProject);
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(allProjects));

    return newProject;
  },

  update: (id: string, input: UpdateProjectInput): Project | null => {
    const allProjects = projects.list();
    const index = allProjects.findIndex(p => p.id === id);
    
    if (index === -1) return null;

    allProjects[index] = {
      ...allProjects[index],
      ...input,
      updated_at: timestamp(),
    };

    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(allProjects));
    return allProjects[index];
  },

  delete: (id: string): boolean => {
    const allProjects = projects.list();
    const filtered = allProjects.filter(p => p.id !== id);
    
    if (filtered.length === allProjects.length) return false;

    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(filtered));
    
    // Also delete all tasks for this project
    const allTasks = tasks.list();
    const filteredTasks = allTasks.filter(t => t.project_id !== id);
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(filteredTasks));

    return true;
  },
};

// Tasks API
const tasks = {
  list: (projectId?: string): Task[] => {
    const data = localStorage.getItem(STORAGE_KEYS.TASKS);
    const allTasks = data ? JSON.parse(data) : [];
    
    if (projectId) {
      return allTasks.filter((t: Task) => t.project_id === projectId);
    }
    
    return allTasks;
  },

  get: (id: string): Task | null => {
    const allTasks = tasks.list();
    return allTasks.find(t => t.id === id) || null;
  },

  create: (input: CreateTaskInput): Task => {
    const newTask: Task = {
      id: generateId(),
      title: input.title,
      description: input.description,
      project_id: input.project_id,
      status: input.status || 'todo',
      priority: input.priority || 'medium',
      created_at: timestamp(),
      updated_at: timestamp(),
    };

    const allTasks = tasks.list();
    allTasks.push(newTask);
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(allTasks));

    return newTask;
  },

  update: (id: string, input: UpdateTaskInput): Task | null => {
    const allTasks = tasks.list();
    const index = allTasks.findIndex(t => t.id === id);
    
    if (index === -1) return null;

    allTasks[index] = {
      ...allTasks[index],
      ...input,
      updated_at: timestamp(),
    };

    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(allTasks));
    return allTasks[index];
  },

  delete: (id: string): boolean => {
    const allTasks = tasks.list();
    const filtered = allTasks.filter(t => t.id !== id);
    
    if (filtered.length === allTasks.length) return false;

    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(filtered));
    return true;
  },
};

// Export unified API
export const api = {
  projects,
  tasks,
};
