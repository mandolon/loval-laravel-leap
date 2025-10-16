// TypeScript interfaces for Phase 1 MVP - 11 Core Tables

// ============= Core Entities =============

// User entity (replaces profiles)
export interface User {
  id: string;
  shortId: string;
  authId?: string;
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  lastActiveAt?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  deletedBy?: string;
}

// Workspace entity
export interface Workspace {
  id: string;
  shortId: string;
  name: string;
  description?: string;
  icon?: string;
  createdAt: string;
  updatedAt: string;
}

// Workspace member entity
export interface WorkspaceMember {
  id: string;
  shortId: string;
  workspaceId: string;
  userId: string;
  role: string;
  createdAt: string;
  deletedAt?: string;
  deletedBy?: string;
}

// Project entity (NO MORE CLIENT TABLE - clients embedded)
export interface Project {
  id: string;
  shortId: string;
  workspaceId: string;
  name: string;
  description?: string;
  status: 'pending' | 'active' | 'completed' | 'archived';
  phase: 'Pre-Design' | 'Design' | 'Permit' | 'Build';
  address: {
    streetNumber?: string;
    streetName?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
  primaryClient: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    address?: any;
  };
  secondaryClient?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    address?: any;
  };
  estimatedAmount?: number; // Design fee
  dueDate?: string;
  progress: number;
  totalTasks: number;
  completedTasks: number;
  teamMemberCount: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  updatedBy?: string;
  deletedAt?: string;
  deletedBy?: string;
}

// Project member entity
export interface ProjectMember {
  id: string;
  shortId: string;
  projectId: string;
  userId: string;
  title?: string;
  createdAt: string;
  deletedAt?: string;
  deletedBy?: string;
}

// Task entity
export interface Task {
  id: string;
  shortId: string;
  projectId: string;
  title: string;
  description?: string;
  status: 'task_redline' | 'progress_update' | 'done_completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignees: string[]; // user IDs
  attachedFiles: string[]; // file IDs
  dueDate?: string;
  estimatedTime?: number;
  actualTime?: number;
  sortOrder: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  updatedBy?: string;
  deletedAt?: string;
  deletedBy?: string;
}

// Folder entity
export interface Folder {
  id: string;
  shortId: string;
  projectId: string;
  parentFolderId?: string;
  name: string;
  isSystemFolder: boolean;
  path?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  deletedBy?: string;
}

// File entity with versioning + public sharing
export interface File {
  id: string;
  shortId: string;
  projectId: string;
  folderId: string;
  taskId?: string;
  parentFileId?: string;
  filename: string;
  versionNumber: number;
  filesize?: number;
  mimetype?: string;
  storagePath: string;
  downloadCount: number;
  shareToken?: string;
  isShareable: boolean;
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  deletedBy?: string;
}

// Note entity
export interface Note {
  id: string;
  shortId: string;
  projectId: string;
  content: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  updatedBy?: string;
  deletedAt?: string;
  deletedBy?: string;
}

// Invoice entity with payment tracking
export interface Invoice {
  id: string;
  shortId: string;
  invoiceNumber: string;
  projectId: string;
  submittedToNames: string[];
  invoiceDate: string;
  dueDate: string;
  paidDate?: string;
  paymentMethod?: string;
  paymentReference?: string;
  paidAmount?: number;
  subtotal: number;
  processingFeePercent: number;
  processingFeeAmount?: number;
  total: number;
  status: 'draft' | 'pending' | 'paid' | 'overdue' | 'cancelled';
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  updatedBy?: string;
  deletedAt?: string;
  deletedBy?: string;
}

// Invoice line item entity
export interface InvoiceLineItem {
  id: string;
  shortId: string;
  invoiceId: string;
  phase?: 'Pre-Design' | 'Design' | 'Permit' | 'Build';
  description: string;
  amount: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// ============= Input Types =============

export interface CreateProjectInput {
  workspaceId: string;
  name: string;
  description?: string;
  status?: 'pending' | 'active' | 'completed' | 'archived';
  phase?: 'Pre-Design' | 'Design' | 'Permit' | 'Build';
  address: {
    streetNumber: string;
    streetName: string;
    city: string;
    state: string;
    zipCode: string;
  };
  primaryClient: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  secondaryClient?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  };
  estimatedAmount?: number;
  dueDate?: string;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  status?: 'pending' | 'active' | 'completed' | 'archived';
  phase?: 'Pre-Design' | 'Design' | 'Permit' | 'Build';
  address?: {
    streetNumber?: string;
    streetName?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
  primaryClient?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  };
  secondaryClient?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  };
  estimatedAmount?: number;
  dueDate?: string;
  progress?: number;
  // Note: totalTasks, completedTasks, teamMemberCount are read-only (auto-managed by triggers)
}

export interface CreateTaskInput {
  projectId: string;
  title: string;
  description?: string;
  status?: 'task_redline' | 'progress_update' | 'done_completed';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  assignees?: string[];
  attachedFiles?: string[];
  dueDate?: string;
  estimatedTime?: number;
  sortOrder?: number;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: 'task_redline' | 'progress_update' | 'done_completed';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  assignees?: string[];
  attachedFiles?: string[];
  dueDate?: string;
  estimatedTime?: number;
  actualTime?: number;
  sortOrder?: number;
}

export interface CreateUserInput {
  name: string;
  email: string;
  password?: string;
}

export interface CreateNoteInput {
  projectId: string;
  content: string;
}

export interface UpdateNoteInput {
  content?: string;
}

export interface CreateInvoiceInput {
  projectId: string;
  invoiceNumber: string;
  submittedToNames: string[];
  invoiceDate: string;
  dueDate: string;
  subtotal: number;
  processingFeePercent?: number;
  processingFeeAmount?: number;
  total: number;
  status?: 'draft' | 'pending' | 'paid' | 'overdue' | 'cancelled';
  notes?: string;
}

export interface UpdateInvoiceInput {
  invoiceNumber?: string;
  submittedToNames?: string[];
  invoiceDate?: string;
  dueDate?: string;
  paidDate?: string;
  paymentMethod?: string;
  paymentReference?: string;
  paidAmount?: number;
  subtotal?: number;
  processingFeePercent?: number;
  processingFeeAmount?: number;
  total?: number;
  status?: 'draft' | 'pending' | 'paid' | 'overdue' | 'cancelled';
  notes?: string;
}

export interface CreateInvoiceLineItemInput {
  invoiceId: string;
  phase?: 'Pre-Design' | 'Design' | 'Permit' | 'Build';
  description: string;
  amount: number;
  sortOrder?: number;
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
