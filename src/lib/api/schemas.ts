import { z } from 'zod'

// ============= JSONB Field Schemas =============

// Address JSONB schema
export const AddressSchema = z.object({
  streetNumber: z.string().optional(),
  streetName: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
})

// Client info JSONB schema
export const ClientInfoSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.any().optional(),
})

// ============= Entity Schemas =============

// Workspace schema
export const WorkspaceSchema = z.object({
  id: z.string().uuid(),
  shortId: z.string(),
  name: z.string().min(1, 'Name required').max(255),
  description: z.string().optional(),
  icon: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

// Project schema with JSONB fields
export const ProjectSchema = z.object({
  id: z.string().uuid(),
  shortId: z.string(),
  workspaceId: z.string().uuid(),
  name: z.string().min(1, 'Name required').max(255),
  description: z.string().optional(),
  status: z.enum(['pending', 'active', 'completed', 'archived']),
  phase: z.enum(['Pre-Design', 'Design', 'Permit', 'Build']),
  address: AddressSchema,
  primaryClient: ClientInfoSchema,
  secondaryClient: ClientInfoSchema.optional(),
  estimatedAmount: z.number().optional(),
  dueDate: z.string().optional(),
  progress: z.number().min(0).max(100).default(0),
  // Auto-managed by triggers (read-only)
  totalTasks: z.number().default(0),
  completedTasks: z.number().default(0),
  teamMemberCount: z.number().default(0),
  createdBy: z.string().uuid(),
  createdAt: z.string(),
  updatedAt: z.string(),
  updatedBy: z.string().uuid().optional(),
  deletedAt: z.string().optional(),
  deletedBy: z.string().uuid().optional(),
})

// Task schema
export const TaskSchema = z.object({
  id: z.string().uuid(),
  shortId: z.string(),
  projectId: z.string().uuid(),
  title: z.string().min(1, 'Title required').max(500),
  description: z.string().optional(),
  status: z.enum(['task_redline', 'progress_update', 'done_completed']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  assignees: z.array(z.string().uuid()).default([]),
  attachedFiles: z.array(z.string().uuid()).default([]),
  dueDate: z.string().optional(),
  estimatedTime: z.number().optional(),
  actualTime: z.number().optional(),
  sortOrder: z.number().default(0),
  createdBy: z.string().uuid(),
  createdAt: z.string(),
  updatedAt: z.string(),
  updatedBy: z.string().uuid().optional(),
  deletedAt: z.string().optional(),
  deletedBy: z.string().uuid().optional(),
})

// User schema
export const UserSchema = z.object({
  id: z.string().uuid(),
  shortId: z.string(),
  authId: z.string().uuid().optional(),
  name: z.string().min(1, 'Name required').max(255),
  email: z.string().email('Valid email required').max(255),
  phone: z.string().optional(),
  avatarUrl: z.string().optional(),
  lastActiveAt: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().optional(),
  deletedBy: z.string().uuid().optional(),
})

// Folder schema
export const FolderSchema = z.object({
  id: z.string().uuid(),
  shortId: z.string(),
  projectId: z.string().uuid(),
  parentFolderId: z.string().uuid().optional(),
  name: z.string().min(1, 'Name required').max(255),
  isSystemFolder: z.boolean().default(false),
  path: z.string().optional(),
  createdBy: z.string().uuid(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().optional(),
  deletedBy: z.string().uuid().optional(),
})

// File schema
export const FileSchema = z.object({
  id: z.string().uuid(),
  shortId: z.string(),
  projectId: z.string().uuid(),
  folderId: z.string().uuid(),
  taskId: z.string().uuid().optional(),
  parentFileId: z.string().uuid().optional(),
  filename: z.string().min(1, 'Filename required').max(500),
  versionNumber: z.number().default(1),
  filesize: z.number().optional(),
  mimetype: z.string().optional(),
  storagePath: z.string().min(1, 'Storage path required'),
  downloadCount: z.number().default(0),
  shareToken: z.string().optional(),
  isShareable: z.boolean().default(false),
  uploadedBy: z.string().uuid(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().optional(),
  deletedBy: z.string().uuid().optional(),
})

// Note schema
export const NoteSchema = z.object({
  id: z.string().uuid(),
  shortId: z.string(),
  projectId: z.string().uuid(),
  content: z.string().min(1, 'Content required'),
  createdBy: z.string().uuid(),
  createdAt: z.string(),
  updatedAt: z.string(),
  updatedBy: z.string().uuid().optional(),
  deletedAt: z.string().optional(),
  deletedBy: z.string().uuid().optional(),
})

// Invoice schema
export const InvoiceSchema = z.object({
  id: z.string().uuid(),
  shortId: z.string(),
  invoiceNumber: z.string().min(1, 'Invoice number required').max(100),
  projectId: z.string().uuid(),
  submittedToNames: z.array(z.string()).default([]),
  invoiceDate: z.string(),
  dueDate: z.string(),
  paidDate: z.string().optional(),
  paymentMethod: z.string().optional(),
  paymentReference: z.string().optional(),
  paidAmount: z.number().optional(),
  subtotal: z.number().min(0),
  processingFeePercent: z.number().min(0).max(100).default(3.5),
  processingFeeAmount: z.number().optional(),
  total: z.number().min(0),
  status: z.enum(['draft', 'pending', 'paid', 'overdue', 'cancelled']).default('pending'),
  notes: z.string().optional(),
  createdBy: z.string().uuid(),
  createdAt: z.string(),
  updatedAt: z.string(),
  updatedBy: z.string().uuid().optional(),
  deletedAt: z.string().optional(),
  deletedBy: z.string().uuid().optional(),
})

// Invoice Line Item schema
export const InvoiceLineItemSchema = z.object({
  id: z.string().uuid(),
  shortId: z.string(),
  invoiceId: z.string().uuid(),
  phase: z.enum(['Pre-Design', 'Design', 'Permit', 'Build']).optional(),
  description: z.string().min(1, 'Description required').max(1000),
  amount: z.number(),
  sortOrder: z.number().default(0),
  createdAt: z.string(),
  updatedAt: z.string(),
})

// ============= Input Schemas (for create/update operations) =============

// Create Project Input - excludes auto-generated fields and counters
export const CreateProjectInputSchema = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().min(1, 'Name required').max(255),
  description: z.string().optional(),
  status: z.enum(['pending', 'active', 'completed', 'archived']).default('pending'),
  phase: z.enum(['Pre-Design', 'Design', 'Permit', 'Build']).default('Pre-Design'),
  address: z.object({
    streetNumber: z.string().min(1, 'Street number required'),
    streetName: z.string().min(1, 'Street name required'),
    city: z.string().min(1, 'City required'),
    state: z.string().min(1, 'State required'),
    zipCode: z.string().min(1, 'ZIP code required'),
  }),
  primaryClient: z.object({
    firstName: z.string().min(1, 'First name required'),
    lastName: z.string().min(1, 'Last name required'),
    email: z.string().email('Valid email required'),
    phone: z.string().optional(),
  }),
  secondaryClient: z.object({
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().optional(),
  }).optional(),
  estimatedAmount: z.number().optional(),
  dueDate: z.string().optional(),
})

// Update Project Input - all fields optional except what shouldn't be changed
export const UpdateProjectInputSchema = z.object({
  name: z.string().min(1, 'Name required').max(255).optional(),
  description: z.string().optional(),
  status: z.enum(['pending', 'active', 'completed', 'archived']).optional(),
  phase: z.enum(['Pre-Design', 'Design', 'Permit', 'Build']).optional(),
  address: AddressSchema.optional(),
  primaryClient: ClientInfoSchema.optional(),
  secondaryClient: ClientInfoSchema.optional(),
  estimatedAmount: z.number().optional(),
  dueDate: z.string().optional(),
  progress: z.number().min(0).max(100).optional(),
  // Note: totalTasks, completedTasks, teamMemberCount are NOT included (auto-managed by triggers)
}).strict()

// Create Task Input
export const CreateTaskInputSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(1, 'Title required').max(500),
  description: z.string().optional(),
  status: z.enum(['task_redline', 'progress_update', 'done_completed']).default('task_redline'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  assignees: z.array(z.string().uuid()).default([]),
  attachedFiles: z.array(z.string().uuid()).default([]),
  dueDate: z.string().optional(),
  estimatedTime: z.number().optional(),
  sortOrder: z.number().default(0),
})

// Update Task Input
export const UpdateTaskInputSchema = z.object({
  title: z.string().min(1, 'Title required').max(500).optional(),
  description: z.string().optional(),
  status: z.enum(['task_redline', 'progress_update', 'done_completed']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  assignees: z.array(z.string().uuid()).optional(),
  attachedFiles: z.array(z.string().uuid()).optional(),
  dueDate: z.string().optional(),
  estimatedTime: z.number().optional(),
  actualTime: z.number().optional(),
  sortOrder: z.number().optional(),
}).strict()

// Create Workspace Input
export const CreateWorkspaceInputSchema = z.object({
  name: z.string().min(1, 'Name required').max(255),
  description: z.string().optional(),
  icon: z.string().optional(),
})

// Update Workspace Input
export const UpdateWorkspaceInputSchema = z.object({
  name: z.string().min(1, 'Name required').max(255).optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
}).strict()

// Create Note Input
export const CreateNoteInputSchema = z.object({
  projectId: z.string().uuid(),
  content: z.string().min(1, 'Content required'),
})

// Update Note Input
export const UpdateNoteInputSchema = z.object({
  content: z.string().min(1, 'Content required').optional(),
}).strict()

// Create Invoice Input
export const CreateInvoiceInputSchema = z.object({
  projectId: z.string().uuid(),
  invoiceNumber: z.string().min(1, 'Invoice number required').max(100),
  submittedToNames: z.array(z.string()).default([]),
  invoiceDate: z.string(),
  dueDate: z.string(),
  subtotal: z.number().min(0),
  processingFeePercent: z.number().min(0).max(100).default(3.5),
  processingFeeAmount: z.number().optional(),
  total: z.number().min(0),
  status: z.enum(['draft', 'pending', 'paid', 'overdue', 'cancelled']).default('pending'),
  notes: z.string().optional(),
})

// Update Invoice Input
export const UpdateInvoiceInputSchema = z.object({
  invoiceNumber: z.string().min(1).max(100).optional(),
  submittedToNames: z.array(z.string()).optional(),
  invoiceDate: z.string().optional(),
  dueDate: z.string().optional(),
  paidDate: z.string().optional(),
  paymentMethod: z.string().optional(),
  paymentReference: z.string().optional(),
  paidAmount: z.number().optional(),
  subtotal: z.number().min(0).optional(),
  processingFeePercent: z.number().min(0).max(100).optional(),
  processingFeeAmount: z.number().optional(),
  total: z.number().min(0).optional(),
  status: z.enum(['draft', 'pending', 'paid', 'overdue', 'cancelled']).optional(),
  notes: z.string().optional(),
}).strict()

// Create Invoice Line Item Input
export const CreateInvoiceLineItemInputSchema = z.object({
  invoiceId: z.string().uuid(),
  phase: z.enum(['Pre-Design', 'Design', 'Permit', 'Build']).optional(),
  description: z.string().min(1, 'Description required').max(1000),
  amount: z.number(),
  sortOrder: z.number().default(0),
})

// ============= Export Inferred Types =============

export type Workspace = z.infer<typeof WorkspaceSchema>
export type Project = z.infer<typeof ProjectSchema>
export type Task = z.infer<typeof TaskSchema>
export type User = z.infer<typeof UserSchema>
export type Folder = z.infer<typeof FolderSchema>
export type File = z.infer<typeof FileSchema>
export type Note = z.infer<typeof NoteSchema>
export type Invoice = z.infer<typeof InvoiceSchema>
export type InvoiceLineItem = z.infer<typeof InvoiceLineItemSchema>

export type CreateProjectInput = z.infer<typeof CreateProjectInputSchema>
export type UpdateProjectInput = z.infer<typeof UpdateProjectInputSchema>
export type CreateTaskInput = z.infer<typeof CreateTaskInputSchema>
export type UpdateTaskInput = z.infer<typeof UpdateTaskInputSchema>
export type CreateWorkspaceInput = z.infer<typeof CreateWorkspaceInputSchema>
export type UpdateWorkspaceInput = z.infer<typeof UpdateWorkspaceInputSchema>
export type CreateNoteInput = z.infer<typeof CreateNoteInputSchema>
export type UpdateNoteInput = z.infer<typeof UpdateNoteInputSchema>
export type CreateInvoiceInput = z.infer<typeof CreateInvoiceInputSchema>
export type UpdateInvoiceInput = z.infer<typeof UpdateInvoiceInputSchema>
export type CreateInvoiceLineItemInput = z.infer<typeof CreateInvoiceLineItemInputSchema>