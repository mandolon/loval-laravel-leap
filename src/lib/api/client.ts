// Centralized API Client - Updated for Phase 1 MVP Schema (11 Core Tables)

import type { 
  Project, 
  Task,
  User,
  Workspace,
  ProjectMember,
  Folder,
  File,
  Note,
  Invoice,
  InvoiceLineItem,
  CreateProjectInput, 
  CreateTaskInput,
  CreateUserInput,
  CreateNoteInput,
  CreateInvoiceInput,
  CreateInvoiceLineItemInput,
  CreateWorkspaceInput,
  UpdateProjectInput,
  UpdateTaskInput,
  UpdateNoteInput,
  UpdateInvoiceInput,
  UpdateWorkspaceInput
} from './types';

// Helper to generate IDs
const generateId = () => crypto.randomUUID();

// Helper to generate short IDs
const generateShortId = (prefix: string): string => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = prefix + '-';
  for (let i = 0; i < 4; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
};

// Helper to get timestamp
const timestamp = () => new Date().toISOString();

// localStorage keys - NO MORE CLIENTS
const STORAGE_KEYS = {
  PROJECTS: 'projects',
  TASKS: 'tasks',
  USERS: 'users',
  WORKSPACES: 'workspaces',
  PROJECT_MEMBERS: 'project_members',
  FOLDERS: 'folders',
  FILES: 'files',
  NOTES: 'notes',
  INVOICES: 'invoices',
  INVOICE_LINE_ITEMS: 'invoice_line_items',
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
      shortId: 'W-abc1',
      name: 'Main Workspace',
      description: 'Primary architecture projects',
      icon: '🏢',
      createdAt: '2024-01-01T10:00:00Z',
      updatedAt: '2024-01-01T10:00:00Z',
    },
  ];

  // Sample users
  const sampleUsers: User[] = [
    {
      id: '1',
      shortId: 'U-xyz1',
      name: 'Alex Morgan',
      email: 'alex.morgan@example.com',
      avatarUrl: 'linear-gradient(135deg, hsl(280, 70%, 60%) 0%, hsl(320, 80%, 65%) 100%)',
      createdAt: '2024-01-01T10:00:00Z',
      updatedAt: '2024-01-01T10:00:00Z',
    },
    {
      id: '2',
      shortId: 'U-xyz2',
      name: 'Sarah Chen',
      email: 'sarah@example.com',
      avatarUrl: 'linear-gradient(135deg, hsl(200, 80%, 55%) 0%, hsl(250, 75%, 65%) 100%)',
      createdAt: '2024-01-01T10:00:00Z',
      updatedAt: '2024-01-01T10:00:00Z',
    },
  ];

  // Sample projects with EMBEDDED clients
  const sampleProjects: Project[] = [
    {
      id: '1',
      shortId: 'P-abc1',
      workspaceId: '1',
      name: 'Modern Family Home',
      description: 'Contemporary 3-bedroom home with open concept living',
      status: 'active',
      phase: 'Design',
      address: {
        streetNumber: '123',
        streetName: 'Oak Street',
        city: 'Portland',
        state: 'OR',
        zipCode: '97201'
      },
      primaryClient: {
        firstName: 'John',
        lastName: 'Smith',
        email: 'john.smith@example.com',
        phone: '(503) 555-0123',
      },
      estimatedAmount: 45000,
      dueDate: '2024-06-15',
      progress: 25,
      totalTasks: 2,
      completedTasks: 0,
      teamMemberCount: 2,
      createdBy: '1',
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-20T14:30:00Z',
    },
    {
      id: '2',
      shortId: 'P-xyz2',
      workspaceId: '1',
      name: 'Downtown Office Renovation',
      description: '5,000 sq ft office space renovation',
      status: 'active',
      phase: 'Permit',
      address: {
        streetNumber: '456',
        streetName: 'Pine Avenue',
        city: 'Seattle',
        state: 'WA',
        zipCode: '98101'
      },
      primaryClient: {
        firstName: 'Emily',
        lastName: 'Davis',
        email: 'emily.davis@example.com',
        phone: '(206) 555-0456',
      },
      estimatedAmount: 75000,
      dueDate: '2024-12-31',
      progress: 60,
      totalTasks: 1,
      completedTasks: 0,
      teamMemberCount: 1,
      createdBy: '1',
      createdAt: '2024-01-10T09:00:00Z',
      updatedAt: '2024-01-22T16:45:00Z',
    },
  ];

  // Sample tasks
  const sampleTasks: Task[] = [
    {
      id: '1',
      shortId: 'T-abc1',
      title: 'Create initial floor plans',
      description: 'Design 3-bedroom layout with open concept kitchen',
      projectId: '1',
      status: 'progress_update',
      priority: 'high',
      assignees: ['1'],
      attachedFiles: [],
      dueDate: '2024-02-15',
      estimatedTime: 40,
      sortOrder: 0,
      createdBy: '1',
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-20T14:30:00Z',
    },
    {
      id: '2',
      shortId: 'T-xyz2',
      title: 'Submit permit application',
      description: 'Prepare and submit all required documents',
      projectId: '2',
      status: 'task_redline',
      priority: 'urgent',
      assignees: ['2'],
      attachedFiles: [],
      dueDate: '2024-02-01',
      estimatedTime: 16,
      sortOrder: 0,
      createdBy: '1',
      createdAt: '2024-01-10T09:00:00Z',
      updatedAt: '2024-01-22T16:45:00Z',
    },
  ];

  localStorage.setItem(STORAGE_KEYS.WORKSPACES, JSON.stringify(sampleWorkspaces));
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(sampleUsers));
  localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(sampleProjects));
  localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(sampleTasks));
  localStorage.setItem(STORAGE_KEYS.PROJECT_MEMBERS, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.FOLDERS, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.FILES, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.INVOICE_LINE_ITEMS, JSON.stringify([]));
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
      shortId: generateShortId('P'),
      workspaceId: input.workspaceId,
      name: input.name,
      description: input.description,
      address: input.address,
      primaryClient: input.primaryClient,
      secondaryClient: input.secondaryClient,
      status: input.status || 'pending',
      phase: input.phase || 'Pre-Design',
      dueDate: input.dueDate,
      estimatedAmount: input.estimatedAmount,
      progress: 0,
      totalTasks: 0,
      completedTasks: 0,
      teamMemberCount: 0,
      createdBy: '1', // TODO: Get from auth
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
    const currentUserId = '1'; // TODO: Get from auth
    
    const newTask: Task = {
      id: generateId(),
      shortId: generateShortId('T'),
      title: input.title,
      description: input.description,
      projectId: input.projectId,
      assignees: input.assignees || [],
      attachedFiles: input.attachedFiles || [],
      status: input.status || 'task_redline',
      priority: input.priority || 'medium',
      dueDate: input.dueDate,
      estimatedTime: input.estimatedTime,
      sortOrder: input.sortOrder || 0,
      createdBy: currentUserId,
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
      shortId: generateShortId('U'),
      name: input.name,
      email: input.email,
      createdAt: timestamp(),
      updatedAt: timestamp(),
    };

    const allUsers = users.list();
    allUsers.push(newUser);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(allUsers));

    return newUser;
  },
};

// Project Members API
const projectMembers = {
  list: (projectId: string): ProjectMember[] => {
    const data = localStorage.getItem(STORAGE_KEYS.PROJECT_MEMBERS);
    const all = data ? JSON.parse(data) : [];
    return all.filter((pm: ProjectMember) => pm.projectId === projectId && !pm.deletedAt);
  },

  create: (projectId: string, userId: string, title?: string): ProjectMember => {
    const newMember: ProjectMember = {
      id: generateId(),
      shortId: generateShortId('PM'),
      projectId,
      userId,
      title,
      createdAt: timestamp(),
    };

    const all = projectMembers.list(projectId);
    all.push(newMember);
    localStorage.setItem(STORAGE_KEYS.PROJECT_MEMBERS, JSON.stringify(all));

    return newMember;
  },

  remove: (id: string): boolean => {
    const data = localStorage.getItem(STORAGE_KEYS.PROJECT_MEMBERS);
    const all = data ? JSON.parse(data) : [];
    const index = all.findIndex((pm: ProjectMember) => pm.id === id);
    
    if (index === -1) return false;

    all[index].deletedAt = timestamp();
    localStorage.setItem(STORAGE_KEYS.PROJECT_MEMBERS, JSON.stringify(all));
    return true;
  },
};

// Folders API
const folders = {
  list: (projectId: string): Folder[] => {
    const data = localStorage.getItem(STORAGE_KEYS.FOLDERS);
    const all = data ? JSON.parse(data) : [];
    return all.filter((f: Folder) => f.projectId === projectId && !f.deletedAt);
  },

  get: (id: string): Folder | null => {
    const data = localStorage.getItem(STORAGE_KEYS.FOLDERS);
    const all = data ? JSON.parse(data) : [];
    return all.find((f: Folder) => f.id === id) || null;
  },

  create: (projectId: string, name: string, parentId?: string): Folder => {
    const newFolder: Folder = {
      id: generateId(),
      shortId: generateShortId('FD'),
      projectId,
      parentFolderId: parentId,
      name,
      isSystemFolder: false,
      createdBy: '1', // TODO: Get from auth
      createdAt: timestamp(),
      updatedAt: timestamp(),
    };

    const data = localStorage.getItem(STORAGE_KEYS.FOLDERS);
    const all = data ? JSON.parse(data) : [];
    all.push(newFolder);
    localStorage.setItem(STORAGE_KEYS.FOLDERS, JSON.stringify(all));

    return newFolder;
  },

  delete: (id: string): boolean => {
    const data = localStorage.getItem(STORAGE_KEYS.FOLDERS);
    const all = data ? JSON.parse(data) : [];
    const index = all.findIndex((f: Folder) => f.id === id);
    
    if (index === -1) return false;

    all[index].deletedAt = timestamp();
    localStorage.setItem(STORAGE_KEYS.FOLDERS, JSON.stringify(all));
    return true;
  },
};

// Files API
const files = {
  listByFolder: (folderId: string): File[] => {
    const data = localStorage.getItem(STORAGE_KEYS.FILES);
    const all = data ? JSON.parse(data) : [];
    return all.filter((f: File) => f.folderId === folderId && !f.deletedAt);
  },

  listByProject: (projectId: string): File[] => {
    const data = localStorage.getItem(STORAGE_KEYS.FILES);
    const all = data ? JSON.parse(data) : [];
    return all.filter((f: File) => f.projectId === projectId && !f.deletedAt);
  },

  get: (id: string): File | null => {
    const data = localStorage.getItem(STORAGE_KEYS.FILES);
    const all = data ? JSON.parse(data) : [];
    return all.find((f: File) => f.id === id) || null;
  },

  upload: (projectId: string, folderId: string, file: any): File => {
    const newFile: File = {
      id: generateId(),
      shortId: generateShortId('F'),
      projectId,
      folderId,
      filename: file.name,
      versionNumber: 1,
      filesize: file.size,
      mimetype: file.type,
      storagePath: `/files/${projectId}/${file.name}`,
      downloadCount: 0,
      isShareable: false,
      uploadedBy: '1', // TODO: Get from auth
      createdAt: timestamp(),
      updatedAt: timestamp(),
    };

    const data = localStorage.getItem(STORAGE_KEYS.FILES);
    const all = data ? JSON.parse(data) : [];
    all.push(newFile);
    localStorage.setItem(STORAGE_KEYS.FILES, JSON.stringify(all));

    return newFile;
  },

  delete: (id: string): boolean => {
    const data = localStorage.getItem(STORAGE_KEYS.FILES);
    const all = data ? JSON.parse(data) : [];
    const index = all.findIndex((f: File) => f.id === id);
    
    if (index === -1) return false;

    all[index].deletedAt = timestamp();
    localStorage.setItem(STORAGE_KEYS.FILES, JSON.stringify(all));
    return true;
  },

  generateShareLink: (fileId: string): string | null => {
    const data = localStorage.getItem(STORAGE_KEYS.FILES);
    const all = data ? JSON.parse(data) : [];
    const index = all.findIndex((f: File) => f.id === fileId);
    
    if (index === -1) return null;

    all[index].isShareable = true;
    all[index].shareToken = crypto.randomUUID().replace(/-/g, '');
    localStorage.setItem(STORAGE_KEYS.FILES, JSON.stringify(all));

    return `/share/${all[index].shareToken}`;
  },

  revokeShareLink: (fileId: string): boolean => {
    const data = localStorage.getItem(STORAGE_KEYS.FILES);
    const all = data ? JSON.parse(data) : [];
    const index = all.findIndex((f: File) => f.id === fileId);
    
    if (index === -1) return false;

    all[index].isShareable = false;
    all[index].shareToken = undefined;
    localStorage.setItem(STORAGE_KEYS.FILES, JSON.stringify(all));
    return true;
  },

  getVersionHistory: (fileId: string): File[] => {
    const data = localStorage.getItem(STORAGE_KEYS.FILES);
    const all = data ? JSON.parse(data) : [];
    const versions: File[] = [];
    let currentFile = all.find((f: File) => f.id === fileId);

    while (currentFile) {
      versions.push(currentFile);
      if (currentFile.parentFileId) {
        currentFile = all.find((f: File) => f.id === currentFile.parentFileId);
      } else {
        break;
      }
    }

    return versions;
  },
};

// Notes API
const notes = {
  list: (projectId: string): Note[] => {
    const data = localStorage.getItem(STORAGE_KEYS.NOTES);
    const all = data ? JSON.parse(data) : [];
    return all.filter((n: Note) => n.projectId === projectId && !n.deletedAt);
  },

  get: (id: string): Note | null => {
    const data = localStorage.getItem(STORAGE_KEYS.NOTES);
    const all = data ? JSON.parse(data) : [];
    return all.find((n: Note) => n.id === id) || null;
  },

  create: (input: CreateNoteInput): Note => {
    const newNote: Note = {
      id: generateId(),
      shortId: generateShortId('N'),
      projectId: input.projectId,
      content: input.content,
      createdBy: '1', // TODO: Get from auth
      createdAt: timestamp(),
      updatedAt: timestamp(),
    };

    const data = localStorage.getItem(STORAGE_KEYS.NOTES);
    const all = data ? JSON.parse(data) : [];
    all.push(newNote);
    localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(all));

    return newNote;
  },

  update: (id: string, input: UpdateNoteInput): Note | null => {
    const data = localStorage.getItem(STORAGE_KEYS.NOTES);
    const all = data ? JSON.parse(data) : [];
    const index = all.findIndex((n: Note) => n.id === id);
    
    if (index === -1) return null;

    all[index] = {
      ...all[index],
      ...input,
      updatedAt: timestamp(),
      updatedBy: '1', // TODO: Get from auth
    };

    localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(all));
    return all[index];
  },

  delete: (id: string): boolean => {
    const data = localStorage.getItem(STORAGE_KEYS.NOTES);
    const all = data ? JSON.parse(data) : [];
    const index = all.findIndex((n: Note) => n.id === id);
    
    if (index === -1) return false;

    all[index].deletedAt = timestamp();
    localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(all));
    return true;
  },
};

// Invoices API
const invoices = {
  list: (projectId: string): Invoice[] => {
    const data = localStorage.getItem(STORAGE_KEYS.INVOICES);
    const all = data ? JSON.parse(data) : [];
    return all.filter((i: Invoice) => i.projectId === projectId && !i.deletedAt);
  },

  get: (id: string): Invoice | null => {
    const data = localStorage.getItem(STORAGE_KEYS.INVOICES);
    const all = data ? JSON.parse(data) : [];
    return all.find((i: Invoice) => i.id === id) || null;
  },

  create: (input: CreateInvoiceInput): Invoice => {
    const newInvoice: Invoice = {
      id: generateId(),
      shortId: generateShortId('INV'),
      invoiceNumber: input.invoiceNumber,
      projectId: input.projectId,
      submittedToNames: input.submittedToNames,
      invoiceDate: input.invoiceDate,
      dueDate: input.dueDate,
      subtotal: input.subtotal,
      processingFeePercent: input.processingFeePercent || 3.5,
      processingFeeAmount: input.processingFeeAmount,
      total: input.total,
      status: input.status || 'draft',
      notes: input.notes,
      createdBy: '1', // TODO: Get from auth
      createdAt: timestamp(),
      updatedAt: timestamp(),
    };

    const data = localStorage.getItem(STORAGE_KEYS.INVOICES);
    const all = data ? JSON.parse(data) : [];
    all.push(newInvoice);
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(all));

    return newInvoice;
  },

  update: (id: string, input: UpdateInvoiceInput): Invoice | null => {
    const data = localStorage.getItem(STORAGE_KEYS.INVOICES);
    const all = data ? JSON.parse(data) : [];
    const index = all.findIndex((i: Invoice) => i.id === id);
    
    if (index === -1) return null;

    all[index] = {
      ...all[index],
      ...input,
      updatedAt: timestamp(),
      updatedBy: '1', // TODO: Get from auth
    };

    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(all));
    return all[index];
  },

  delete: (id: string): boolean => {
    const data = localStorage.getItem(STORAGE_KEYS.INVOICES);
    const all = data ? JSON.parse(data) : [];
    const index = all.findIndex((i: Invoice) => i.id === id);
    
    if (index === -1) return false;

    all[index].deletedAt = timestamp();
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(all));
    return true;
  },

  addLineItem: (input: CreateInvoiceLineItemInput): InvoiceLineItem => {
    const newItem: InvoiceLineItem = {
      id: generateId(),
      shortId: generateShortId('ILI'),
      invoiceId: input.invoiceId,
      phase: input.phase,
      description: input.description,
      amount: input.amount,
      sortOrder: input.sortOrder || 0,
      createdAt: timestamp(),
      updatedAt: timestamp(),
    };

    const data = localStorage.getItem(STORAGE_KEYS.INVOICE_LINE_ITEMS);
    const all = data ? JSON.parse(data) : [];
    all.push(newItem);
    localStorage.setItem(STORAGE_KEYS.INVOICE_LINE_ITEMS, JSON.stringify(all));

    return newItem;
  },

  listLineItems: (invoiceId: string): InvoiceLineItem[] => {
    const data = localStorage.getItem(STORAGE_KEYS.INVOICE_LINE_ITEMS);
    const all = data ? JSON.parse(data) : [];
    return all.filter((i: InvoiceLineItem) => i.invoiceId === invoiceId);
  },

  removeLineItem: (id: string): boolean => {
    const data = localStorage.getItem(STORAGE_KEYS.INVOICE_LINE_ITEMS);
    const all = data ? JSON.parse(data) : [];
    const filtered = all.filter((i: InvoiceLineItem) => i.id !== id);
    
    if (filtered.length === all.length) return false;

    localStorage.setItem(STORAGE_KEYS.INVOICE_LINE_ITEMS, JSON.stringify(filtered));
    return true;
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
      shortId: generateShortId('W'),
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

// Export unified API - NO MORE CLIENTS
export const api = {
  projects,
  tasks,
  users,
  projectMembers,
  folders,
  files,
  notes,
  invoices,
  workspaces,
};
