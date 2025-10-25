// TypeScript interfaces for Phase 1 MVP - 11 Core Tables

// ============= Core Entities =============

// Detail Library Types
export type DetailColorTag = 'slate' | 'green' | 'amber' | 'violet' | 'pink' | 'cyan';

export interface DetailLibraryCategory {
  id: string;
  shortId: string;
  name: string;
  slug: string;
  isSystemCategory: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface DetailLibrarySubfolder {
  id: string;
  shortId: string;
  categoryId: string;
  name: string;
  sortOrder: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface DetailLibraryFile {
  id: string;
  shortId: string;
  categoryId: string;
  subfolderId?: string;
  title: string;
  filename: string;
  filesize: number;
  mimetype: string;
  storagePath: string;
  colorTag: DetailColorTag;
  description?: string;
  authorName?: string;
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface DetailLibraryItem {
  id: string;
  shortId: string;
  parentFileId: string;
  title: string;
  filename: string;
  filesize: number;
  mimetype: string;
  storagePath: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

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

// User with workspace assignments (for admin user management)
export interface UserWithWorkspaces {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  isAdmin: boolean;
  title?: string;
  role: 'team' | 'consultant' | 'client' | null;
  workspaces: Array<{
    membershipId: string;
    workspaceId: string;
    workspaceName: string;
  }>;
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
  createdAt: string;
  deletedAt?: string;
  deletedBy?: string;
  userName: string;
  userEmail: string;
  userAvatarUrl: string | null;
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
  assessorParcelInfo?: {
    parcelNumber?: string;
    occupancyClass?: string;
    zoningDesignation?: string;
    construction?: string;
    stories?: string;
    plateHeight?: string;
    roofHeight?: string;
    yearBuilt?: string;
    lotArea?: string;
    acres?: string;
  };
  estimatedAmount?: number; // Design fee
  dueDate?: string;
  progress: number;
  totalTasks: number;
  completedTasks: number;
  teamMemberCount: number;
  unreadChatCount?: number; // Count of unread AI chat messages
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
    address?: {
      streetNumber: string;
      streetName: string;
      city: string;
      state: string;
      zipCode: string;
    };
  };
  secondaryClient?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    address?: {
      streetNumber: string;
      streetName: string;
      city: string;
      state: string;
      zipCode: string;
    };
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
  assessorParcelInfo?: {
    parcelNumber?: string;
    occupancyClass?: string;
    zoningDesignation?: string;
    construction?: string;
    stories?: string;
    plateHeight?: string;
    roofHeight?: string;
    yearBuilt?: string;
    lotArea?: string;
    acres?: string;
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

// ============= TIME ENTRIES =============

export interface TimeEntry {
  id: string;
  shortId: string;
  projectId: string;
  taskId?: string;
  userId: string;
  durationHours: number;
  description?: string;
  entryDate: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface CreateTimeEntryInput {
  projectId: string;
  taskId?: string;
  userId: string;
  durationHours: number;
  description?: string;
  entryDate: string;
}

export interface UpdateTimeEntryInput {
  durationHours?: number;
  description?: string;
  entryDate?: string;
  taskId?: string;
}

// ============= LINKS =============

export interface Link {
  id: string;
  shortId: string;
  projectId: string;
  title: string;
  description?: string;
  url: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  deletedBy?: string;
}

export interface CreateLinkInput {
  projectId: string;
  title: string;
  description?: string;
  url: string;
}

export interface UpdateLinkInput {
  title?: string;
  description?: string;
  url?: string;
}

// ============= PROJECT CHAT =============

export interface ProjectChatMessage {
  id: string;
  shortId: string;
  projectId: string;
  userId: string;
  content: string;
  referencedFiles: string[];
  referencedTasks: string[];
  replyToMessageId?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  deletedBy?: string;
}

export interface CreateMessageInput {
  projectId: string;
  content: string;
  referencedFiles?: string[];
  referencedTasks?: string[];
  replyToMessageId?: string;
}

export interface UpdateMessageInput {
  content: string;
}

// ============= NOTIFICATIONS =============

export interface Notification {
  id: string;
  shortId: string;
  userId: string;
  workspaceId?: string;
  projectId?: string;
  type: string;
  title: string;
  content?: string;
  isRead: boolean;
  readAt?: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

// ============= USER PREFERENCES =============

export interface UserPreferences {
  id: string;
  userId: string;
  theme: 'light' | 'dark' | 'system';
  notificationsEnabled: boolean;
  emailDigest: boolean;
  sidebarCollapsed: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateUserPreferencesInput {
  theme?: 'light' | 'dark' | 'system';
  notificationsEnabled?: boolean;
  emailDigest?: boolean;
  sidebarCollapsed?: boolean;
  metadata?: Record<string, unknown>;
}

// ============= WORKSPACE SETTINGS =============

export interface WorkspaceSettings {
  id: string;
  workspaceId: string;
  defaultInvoiceTerms: number;
  companyName?: string;
  companyLogoUrl?: string;
  taxId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateWorkspaceSettingsInput {
  defaultInvoiceTerms?: number;
  companyName?: string;
  companyLogoUrl?: string;
  taxId?: string;
  metadata?: Record<string, unknown>;
}
