// TypeScript interfaces - these become your Laravel API contract!

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'team' | 'consultant' | 'client';
  initials: string;
  avatar?: string;
  isActive: boolean;
  createdAt: string;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  company?: string;
  phone?: string;
  address?: string;
  createdAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  status: 'active' | 'archived' | 'on_hold';
  phase: 'design' | 'permit' | 'build' | 'completed';
  address: string;
  clientId: string;
  teamIds: string[];
  createdAt: string;
  updatedAt: string;
  dueDate?: string;
  budget?: number;
  progress: number;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  projectId: string;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigneeIds: string[];
  createdById: string;
  createdAt: string;
  updatedAt: string;
  dueDate?: string;
  estimatedTime?: number;
  actualTime?: number;
}

export interface CreateProjectInput {
  workspaceId: string;
  name: string;
  description: string;
  address: string;
  clientId: string;
  teamIds?: string[];
  status?: 'active' | 'archived' | 'on_hold';
  phase?: 'design' | 'permit' | 'build' | 'completed';
  dueDate?: string;
  budget?: number;
}

export interface CreateTaskInput {
  title: string;
  description: string;
  projectId: string;
  assigneeIds?: string[];
  status?: 'todo' | 'in_progress' | 'done';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string;
  estimatedTime?: number;
}

export interface UpdateProjectInput {
  workspaceId?: string;
  name?: string;
  description?: string;
  address?: string;
  clientId?: string;
  teamIds?: string[];
  status?: 'active' | 'archived' | 'on_hold';
  phase?: 'design' | 'permit' | 'build' | 'completed';
  dueDate?: string;
  budget?: number;
  progress?: number;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  assigneeIds?: string[];
  status?: 'todo' | 'in_progress' | 'done';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string;
  estimatedTime?: number;
  actualTime?: number;
}

export interface CreateUserInput {
  name: string;
  email: string;
  role: 'admin' | 'team' | 'consultant' | 'client';
}

export interface CreateClientInput {
  name: string;
  email: string;
  company?: string;
  phone?: string;
  address?: string;
}

export interface CreateWorkspaceInput {
  name: string;
  description?: string;
  icon?: string;
}

export interface UpdateWorkspaceInput {
  name?: string;
  description?: string;
  icon?: string;
}
