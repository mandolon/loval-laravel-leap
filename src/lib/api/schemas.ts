import { z } from 'zod'

// Address schema
export const AddressSchema = z.object({
  streetNumber: z.string().min(1, 'Street number required'),
  streetName: z.string().min(1, 'Street name required'),
  unit: z.string().optional(),
  city: z.string().min(1, 'City required'),
  state: z.string().min(2, 'State required'),
  zipCode: z.string().min(3, 'ZIP code required'),
  fullAddress: z.string().min(3, 'Full address required'),
})

// Workspace schema
export const WorkspaceSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Name required'),
  description: z.string().optional(),
  icon: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

// Project schema
export const ProjectSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  name: z.string().min(1, 'Name required'),
  description: z.string(),
  status: z.enum(['active', 'archived', 'on_hold']),
  phase: z.enum(['design', 'permit', 'build', 'completed']),
  address: z.string().min(1, 'Address required'),
  clientId: z.string(),
  teamIds: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
  dueDate: z.string().optional(),
  budget: z.number().optional(),
  progress: z.number().min(0).max(100),
})

// Task schema
export const TaskSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1, 'Title required'),
  description: z.string(),
  projectId: z.string().uuid(),
  status: z.enum(['task_redline', 'progress_update', 'complete']),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  assigneeIds: z.array(z.string()),
  createdById: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  dueDate: z.string().optional(),
  estimatedTime: z.number().optional(),
  actualTime: z.number().optional(),
  trackedTime: z.number().optional(),
})

// User schema
export const UserSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Name required'),
  email: z.string().email('Valid email required'),
  role: z.enum(['admin', 'team', 'consultant', 'client']),
  initials: z.string().length(2),
  avatar: z.string().optional(),
  isActive: z.boolean(),
  createdAt: z.string(),
})

// Client schema
export const ClientSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Name required'),
  email: z.string().email('Valid email required'),
  company: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  createdAt: z.string(),
})

// Input schemas (for create/update operations)
export const CreateProjectInputSchema = ProjectSchema.omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
}).partial({
  status: true,
  phase: true,
  dueDate: true,
  budget: true,
})

export const UpdateProjectInputSchema = ProjectSchema.partial().omit({
  id: true,
  createdAt: true,
})

export const CreateTaskInputSchema = TaskSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).partial({
  assigneeIds: true,
  status: true,
  priority: true,
  dueDate: true,
  estimatedTime: true,
})

export const UpdateTaskInputSchema = TaskSchema.partial().omit({
  id: true,
  createdAt: true,
})

export const CreateWorkspaceInputSchema = WorkspaceSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})

export const UpdateWorkspaceInputSchema = WorkspaceSchema.partial().omit({
  id: true,
  createdAt: true,
})

// Export inferred types
export type Workspace = z.infer<typeof WorkspaceSchema>
export type Project = z.infer<typeof ProjectSchema>
export type Task = z.infer<typeof TaskSchema>
export type User = z.infer<typeof UserSchema>
export type Client = z.infer<typeof ClientSchema>
export type CreateProjectInput = z.infer<typeof CreateProjectInputSchema>
export type UpdateProjectInput = z.infer<typeof UpdateProjectInputSchema>
export type CreateTaskInput = z.infer<typeof CreateTaskInputSchema>
export type UpdateTaskInput = z.infer<typeof UpdateTaskInputSchema>
export type CreateWorkspaceInput = z.infer<typeof CreateWorkspaceInputSchema>
export type UpdateWorkspaceInput = z.infer<typeof UpdateWorkspaceInputSchema>
