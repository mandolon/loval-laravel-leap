// Centralized API Client - localStorage for now, easy to swap to Laravel later!

import type { 
  Project, 
  Task,
  User,
  Client,
  Workspace,
  CreateProjectInput, 
  CreateTaskInput,
  CreateUserInput,
  CreateClientInput,
  CreateWorkspaceInput,
  UpdateProjectInput,
  UpdateTaskInput,
  UpdateWorkspaceInput
} from './types';

// Helper to generate IDs
const generateId = () => crypto.randomUUID();

// Helper to get timestamp
const timestamp = () => new Date().toISOString();

// Helper to generate initials
const generateInitials = (name: string) => {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

// localStorage keys
const STORAGE_KEYS = {
  PROJECTS: 'projects',
  TASKS: 'tasks',
  USERS: 'users',
  CLIENTS: 'clients',
  WORKSPACES: 'workspaces',
  CURRENT_WORKSPACE: 'current_workspace_id',
  INITIALIZED: 'data_initialized',
};

// Initialize with sample data
const initializeSampleData = () => {
  if (localStorage.getItem(STORAGE_KEYS.INITIALIZED)) {
    return;
  }

  // Sample workspaces
  const sampleWorkspaces: Workspace[] = [
    {
      id: '1',
      name: 'Workspace 1',
      description: 'Main workspace for projects',
      icon: '🏢',
      createdAt: '2024-01-01T10:00:00Z',
      updatedAt: '2024-01-01T10:00:00Z',
    },
    {
      id: '2',
      name: 'Personal Projects',
      description: 'Personal construction projects',
      icon: '🏠',
      createdAt: '2024-01-01T10:00:00Z',
      updatedAt: '2024-01-01T10:00:00Z',
    },
  ];

  // Sample users
  const sampleUsers: User[] = [
    {
      id: '1',
      name: 'Sarah Johnson',
      email: 'sarah@example.com',
      role: 'admin',
      initials: 'SJ',
      isActive: true,
      createdAt: '2024-01-01T10:00:00Z',
    },
    {
      id: '2',
      name: 'Mike Chen',
      email: 'mike@example.com',
      role: 'team',
      initials: 'MC',
      isActive: true,
      createdAt: '2024-01-01T10:00:00Z',
    },
    {
      id: '3',
      name: 'Alex Rodriguez',
      email: 'alex@example.com',
      role: 'consultant',
      initials: 'AR',
      isActive: true,
      createdAt: '2024-01-01T10:00:00Z',
    },
  ];

  // Sample clients
  const sampleClients: Client[] = [
    {
      id: '1',
      name: 'John Smith',
      email: 'john@example.com',
      company: 'Smith Family Trust',
      phone: '(503) 555-0123',
      address: '123 Oak Street, Portland, OR 97201',
      createdAt: '2024-01-01T10:00:00Z',
    },
    {
      id: '2',
      name: 'Emily Davis',
      email: 'emily@example.com',
      company: 'Davis Development LLC',
      phone: '(206) 555-0456',
      address: '456 Pine Avenue, Seattle, WA 98101',
      createdAt: '2024-01-01T10:00:00Z',
    },
  ];

  // Sample projects
  const sampleProjects: Project[] = [
    {
      id: '1',
      workspaceId: '1',
      name: 'Modern Family Home',
      description: 'Contemporary 3-bedroom home with open concept living, high ceilings, and sustainable materials',
      status: 'active',
      phase: 'design',
      address: '123 Oak Street, Portland, OR 97201',
      clientId: '1',
      teamIds: ['1', '2'],
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-20T14:30:00Z',
      dueDate: '2024-06-15T00:00:00Z',
      budget: 450000,
      progress: 25,
    },
    {
      id: '2',
      workspaceId: '1',
      name: 'Luxury Condo Complex',
      description: 'High-end residential complex with 20 units, rooftop amenities, and underground parking',
      status: 'active',
      phase: 'permit',
      address: '456 Pine Avenue, Seattle, WA 98101',
      clientId: '2',
      teamIds: ['1', '3'],
      createdAt: '2024-01-10T09:00:00Z',
      updatedAt: '2024-01-22T16:45:00Z',
      dueDate: '2024-12-31T00:00:00Z',
      budget: 2500000,
      progress: 40,
    },
    {
      id: '3',
      workspaceId: '1',
      name: 'Downtown Office Renovation',
      description: 'Complete interior renovation of 5,000 sq ft office space with modern finishes',
      status: 'active',
      phase: 'build',
      address: '789 Main Street, Portland, OR 97204',
      clientId: '1',
      teamIds: ['2', '3'],
      createdAt: '2024-02-01T08:00:00Z',
      updatedAt: '2024-02-05T11:20:00Z',
      dueDate: '2024-04-30T00:00:00Z',
      budget: 180000,
      progress: 65,
    },
  ];

  // Sample tasks
  const sampleTasks: Task[] = [
    {
      id: '1',
      title: 'Create initial floor plans',
      description: 'Design 3-bedroom layout with open concept kitchen and living area. Include multiple bathroom options.',
      projectId: '1',
      status: 'progress_update',
      priority: 'high',
      assigneeIds: ['1'],
      createdById: '1',
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-20T14:30:00Z',
      dueDate: '2024-02-15T00:00:00Z',
      estimatedTime: 40,
      trackedTime: 12,
    },
    {
      id: '2',
      title: 'Select exterior materials',
      description: 'Review and finalize exterior cladding, roofing, and window selections with client',
      projectId: '1',
      status: 'task_redline',
      priority: 'medium',
      assigneeIds: ['2'],
      createdById: '1',
      createdAt: '2024-01-16T09:00:00Z',
      updatedAt: '2024-01-16T09:00:00Z',
      dueDate: '2024-02-20T00:00:00Z',
      estimatedTime: 16,
      trackedTime: 0,
    },
    {
      id: '3',
      title: 'Submit permit application',
      description: 'Prepare and submit all required documents to city planning department including drawings, surveys, and fees',
      projectId: '2',
      status: 'progress_update',
      priority: 'urgent',
      assigneeIds: ['3'],
      createdById: '1',
      createdAt: '2024-01-10T09:00:00Z',
      updatedAt: '2024-01-22T16:45:00Z',
      dueDate: '2024-02-01T00:00:00Z',
      estimatedTime: 16,
      trackedTime: 8,
    },
    {
      id: '4',
      title: 'Foundation inspection',
      description: 'Schedule and coordinate foundation inspection with city inspector',
      projectId: '3',
      status: 'complete',
      priority: 'high',
      assigneeIds: ['2'],
      createdById: '2',
      createdAt: '2024-02-01T08:00:00Z',
      updatedAt: '2024-02-05T11:20:00Z',
      dueDate: '2024-02-10T00:00:00Z',
      estimatedTime: 8,
      actualTime: 6,
      trackedTime: 6,
    },
    {
      id: '5',
      title: 'Install electrical systems',
      description: 'Complete all rough electrical work including panel, circuits, and fixture boxes',
      projectId: '3',
      status: 'progress_update',
      priority: 'high',
      assigneeIds: ['3'],
      createdById: '2',
      createdAt: '2024-02-03T10:00:00Z',
      updatedAt: '2024-02-05T14:00:00Z',
      dueDate: '2024-02-25T00:00:00Z',
      estimatedTime: 80,
      trackedTime: 20,
    },
  ];

  localStorage.setItem(STORAGE_KEYS.WORKSPACES, JSON.stringify(sampleWorkspaces));
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(sampleUsers));
  localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(sampleClients));
  localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(sampleProjects));
  localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(sampleTasks));
  localStorage.setItem(STORAGE_KEYS.CURRENT_WORKSPACE, '1');
  localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
};

// Initialize on load
initializeSampleData();

// Projects API
const projects = {
  list: (workspaceId?: string): Project[] => {
    const data = localStorage.getItem(STORAGE_KEYS.PROJECTS);
    const allProjects = data ? JSON.parse(data) : [];
    
    if (workspaceId) {
      return allProjects.filter((p: Project) => p.workspaceId === workspaceId);
    }
    
    return allProjects;
  },

  get: (id: string): Project | null => {
    const allProjects = projects.list();
    return allProjects.find(p => p.id === id) || null;
  },

  create: (input: CreateProjectInput): Project => {
    const newProject: Project = {
      id: generateId(),
      workspaceId: input.workspaceId,
      name: input.name,
      description: input.description,
      address: input.address,
      clientId: input.clientId,
      teamIds: input.teamIds || [],
      status: input.status || 'active',
      phase: input.phase || 'design',
      dueDate: input.dueDate,
      budget: input.budget,
      progress: 0,
      createdAt: timestamp(),
      updatedAt: timestamp(),
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
      updatedAt: timestamp(),
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
    const filteredTasks = allTasks.filter(t => t.projectId !== id);
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
      return allTasks.filter((t: Task) => t.projectId === projectId);
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
      projectId: input.projectId,
      assigneeIds: input.assigneeIds || [],
      status: input.status || 'task_redline',
      priority: input.priority || 'medium',
      dueDate: input.dueDate,
      estimatedTime: input.estimatedTime,
      createdById: '1', // Default to first user for now
      createdAt: timestamp(),
      updatedAt: timestamp(),
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
      updatedAt: timestamp(),
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

// Users API
const users = {
  list: (): User[] => {
    const data = localStorage.getItem(STORAGE_KEYS.USERS);
    return data ? JSON.parse(data) : [];
  },

  get: (id: string): User | null => {
    const allUsers = users.list();
    return allUsers.find(u => u.id === id) || null;
  },

  create: (input: CreateUserInput): User => {
    const newUser: User = {
      id: generateId(),
      name: input.name,
      email: input.email,
      role: input.role,
      initials: generateInitials(input.name),
      isActive: true,
      createdAt: timestamp(),
    };

    const allUsers = users.list();
    allUsers.push(newUser);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(allUsers));

    return newUser;
  },
};

// Clients API
const clients = {
  list: (): Client[] => {
    const data = localStorage.getItem(STORAGE_KEYS.CLIENTS);
    return data ? JSON.parse(data) : [];
  },

  get: (id: string): Client | null => {
    const allClients = clients.list();
    return allClients.find(c => c.id === id) || null;
  },

  create: (input: CreateClientInput): Client => {
    const newClient: Client = {
      id: generateId(),
      name: input.name,
      email: input.email,
      company: input.company,
      phone: input.phone,
      address: input.address,
      createdAt: timestamp(),
    };

    const allClients = clients.list();
    allClients.push(newClient);
    localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(allClients));

    return newClient;
  },
};

// Workspaces API
const workspaces = {
  list: (): Workspace[] => {
    const data = localStorage.getItem(STORAGE_KEYS.WORKSPACES);
    return data ? JSON.parse(data) : [];
  },

  get: (id: string): Workspace | null => {
    const allWorkspaces = workspaces.list();
    return allWorkspaces.find(w => w.id === id) || null;
  },

  create: (input: CreateWorkspaceInput): Workspace => {
    const newWorkspace: Workspace = {
      id: generateId(),
      name: input.name,
      description: input.description,
      icon: input.icon || '🏢',
      createdAt: timestamp(),
      updatedAt: timestamp(),
    };

    const allWorkspaces = workspaces.list();
    allWorkspaces.push(newWorkspace);
    localStorage.setItem(STORAGE_KEYS.WORKSPACES, JSON.stringify(allWorkspaces));

    return newWorkspace;
  },

  update: (id: string, input: UpdateWorkspaceInput): Workspace | null => {
    const allWorkspaces = workspaces.list();
    const index = allWorkspaces.findIndex(w => w.id === id);
    
    if (index === -1) return null;

    allWorkspaces[index] = {
      ...allWorkspaces[index],
      ...input,
      updatedAt: timestamp(),
    };

    localStorage.setItem(STORAGE_KEYS.WORKSPACES, JSON.stringify(allWorkspaces));
    return allWorkspaces[index];
  },

  delete: (id: string): boolean => {
    const allWorkspaces = workspaces.list();
    const filtered = allWorkspaces.filter(w => w.id !== id);
    
    if (filtered.length === allWorkspaces.length) return false;

    localStorage.setItem(STORAGE_KEYS.WORKSPACES, JSON.stringify(filtered));
    
    // Also delete all projects in this workspace
    const allProjects = projects.list();
    const filteredProjects = allProjects.filter(p => p.workspaceId !== id);
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(filteredProjects));

    return true;
  },

  getCurrentWorkspaceId: (): string | null => {
    return localStorage.getItem(STORAGE_KEYS.CURRENT_WORKSPACE);
  },

  setCurrentWorkspaceId: (id: string): void => {
    localStorage.setItem(STORAGE_KEYS.CURRENT_WORKSPACE, id);
  },
};

// Export unified API
export const api = {
  projects,
  tasks,
  users,
  clients,
  workspaces,
};
