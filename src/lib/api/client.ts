// Centralized API Client - Using Supabase Database

import { supabase } from '@/integrations/supabase/client';
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

// Helper to get current user ID
const getCurrentUserId = async (): Promise<string> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  
  // Get the user's ID from the users table
  const { data: userData } = await supabase
    .from('users')
    .select('id')
    .eq('auth_id', user.id)
    .single();
  
  if (!userData) throw new Error('User not found');
  return userData.id;
};

// Helper to map database rows to API types
const mapProject = (row: any): Project => ({
  id: row.id,
  shortId: row.short_id,
  workspaceId: row.workspace_id,
  name: row.name,
  description: row.description,
  status: row.status,
  phase: row.phase,
  address: row.address,
  primaryClient: {
    firstName: row.primary_client_first_name,
    lastName: row.primary_client_last_name,
    email: row.primary_client_email,
    phone: row.primary_client_phone,
    address: row.primary_client_address,
  },
  secondaryClient: row.secondary_client_first_name ? {
    firstName: row.secondary_client_first_name,
    lastName: row.secondary_client_last_name,
    email: row.secondary_client_email,
    phone: row.secondary_client_phone,
    address: row.secondary_client_address,
  } : undefined,
  assessorParcelInfo: row.assessor_parcel_info,
  estimatedAmount: row.estimated_amount,
  dueDate: row.due_date,
  progress: row.progress,
  totalTasks: row.total_tasks,
  completedTasks: row.completed_tasks,
  teamMemberCount: row.team_member_count,
  createdBy: row.created_by,
  createdAt: row.created_at,
  updatedBy: row.updated_by,
  updatedAt: row.updated_at,
  deletedBy: row.deleted_by,
  deletedAt: row.deleted_at,
});

const mapTask = (row: any): Task => ({
  id: row.id,
  shortId: row.short_id,
  projectId: row.project_id,
  title: row.title,
  description: row.description,
  status: row.status,
  priority: row.priority,
  assignees: row.assignees || [],
  attachedFiles: row.attached_files || [],
  dueDate: row.due_date,
  estimatedTime: row.estimated_time,
  actualTime: row.actual_time,
  sortOrder: row.sort_order,
  createdBy: row.created_by,
  createdAt: row.created_at,
  updatedBy: row.updated_by,
  updatedAt: row.updated_at,
  deletedBy: row.deleted_by,
  deletedAt: row.deleted_at,
});

const mapUser = (row: any): User => ({
  id: row.id,
  shortId: row.short_id,
  authId: row.auth_id,
  name: row.name,
  email: row.email,
  phone: row.phone,
  avatarUrl: row.avatar_url,
  lastActiveAt: row.last_active_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  deletedBy: row.deleted_by,
  deletedAt: row.deleted_at,
});

const mapWorkspace = (row: any): Workspace => ({
  id: row.id,
  shortId: row.short_id,
  name: row.name,
  description: row.description,
  icon: row.icon,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapFolder = (row: any): Folder => ({
  id: row.id,
  shortId: row.short_id,
  projectId: row.project_id,
  parentFolderId: row.parent_folder_id,
  name: row.name,
  path: row.path,
  isSystemFolder: row.is_system_folder,
  createdBy: row.created_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  deletedBy: row.deleted_by,
  deletedAt: row.deleted_at,
});

const mapFile = (row: any): File => ({
  id: row.id,
  shortId: row.short_id,
  projectId: row.project_id,
  folderId: row.folder_id,
  taskId: row.task_id,
  filename: row.filename,
  storagePath: row.storage_path,
  mimetype: row.mimetype,
  filesize: row.filesize,
  parentFileId: row.parent_file_id,
  versionNumber: row.version_number,
  downloadCount: row.download_count,
  isShareable: row.is_shareable,
  shareToken: row.share_token,
  uploadedBy: row.uploaded_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  deletedBy: row.deleted_by,
  deletedAt: row.deleted_at,
});

const mapNote = (row: any): Note => ({
  id: row.id,
  shortId: row.short_id,
  projectId: row.project_id,
  content: row.content,
  createdBy: row.created_by,
  createdAt: row.created_at,
  updatedBy: row.updated_by,
  updatedAt: row.updated_at,
  deletedBy: row.deleted_by,
  deletedAt: row.deleted_at,
});

const mapInvoice = (row: any): Invoice => ({
  id: row.id,
  shortId: row.short_id,
  projectId: row.project_id,
  invoiceNumber: row.invoice_number,
  submittedToNames: row.submitted_to_names || [],
  invoiceDate: row.invoice_date,
  dueDate: row.due_date,
  subtotal: row.subtotal,
  processingFeePercent: row.processing_fee_percent,
  processingFeeAmount: row.processing_fee_amount,
  total: row.total,
  paidAmount: row.paid_amount,
  paidDate: row.paid_date,
  paymentMethod: row.payment_method,
  paymentReference: row.payment_reference,
  status: row.status,
  notes: row.notes,
  createdBy: row.created_by,
  createdAt: row.created_at,
  updatedBy: row.updated_by,
  updatedAt: row.updated_at,
  deletedBy: row.deleted_by,
  deletedAt: row.deleted_at,
});

const mapInvoiceLineItem = (row: any): InvoiceLineItem => ({
  id: row.id,
  shortId: row.short_id,
  invoiceId: row.invoice_id,
  phase: row.phase,
  description: row.description,
  amount: row.amount,
  sortOrder: row.sort_order,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapProjectMember = (row: any): ProjectMember => ({
  id: row.id,
  shortId: row.short_id,
  projectId: row.project_id,
  userId: row.user_id,
  title: row.title,
  createdAt: row.created_at,
  deletedBy: row.deleted_by,
  deletedAt: row.deleted_at,
});

// Projects API
const projects = {
  list: async (workspaceId?: string): Promise<Project[]> => {
    let query = supabase
      .from('projects')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    
    if (workspaceId) {
      query = query.eq('workspace_id', workspaceId);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(mapProject);
  },

  get: async (id: string): Promise<Project | null> => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle();
    
    if (error) throw error;
    return data ? mapProject(data) : null;
  },

  create: async (input: CreateProjectInput): Promise<Project> => {
    const userId = await getCurrentUserId();
    
    const { data, error } = await supabase
      .from('projects')
      .insert({
        workspace_id: input.workspaceId,
        name: input.name,
        description: input.description,
        address: input.address,
        primary_client_first_name: input.primaryClient?.firstName,
        primary_client_last_name: input.primaryClient?.lastName,
        primary_client_email: input.primaryClient?.email,
        primary_client_phone: input.primaryClient?.phone,
        primary_client_address: input.primaryClient?.address,
        secondary_client_first_name: input.secondaryClient?.firstName,
        secondary_client_last_name: input.secondaryClient?.lastName,
        secondary_client_email: input.secondaryClient?.email,
        secondary_client_phone: input.secondaryClient?.phone,
        secondary_client_address: input.secondaryClient?.address,
        status: input.status || 'pending',
        phase: input.phase || 'Pre-Design',
        due_date: input.dueDate,
        estimated_amount: input.estimatedAmount,
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw error;
    return mapProject(data);
  },

  update: async (id: string, input: UpdateProjectInput): Promise<Project | null> => {
    const userId = await getCurrentUserId();
    
    const updateData: any = {
      updated_by: userId,
    };
    
    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.phase !== undefined) updateData.phase = input.phase;
    if (input.address !== undefined) updateData.address = input.address;
    if (input.dueDate !== undefined) updateData.due_date = input.dueDate;
    if (input.estimatedAmount !== undefined) updateData.estimated_amount = input.estimatedAmount;
    if (input.progress !== undefined) updateData.progress = input.progress;
    
    if (input.primaryClient) {
      if (input.primaryClient.firstName !== undefined) updateData.primary_client_first_name = input.primaryClient.firstName;
      if (input.primaryClient.lastName !== undefined) updateData.primary_client_last_name = input.primaryClient.lastName;
      if (input.primaryClient.email !== undefined) updateData.primary_client_email = input.primaryClient.email;
      if (input.primaryClient.phone !== undefined) updateData.primary_client_phone = input.primaryClient.phone;
    }
    
    if (input.secondaryClient) {
      if (input.secondaryClient.firstName !== undefined) updateData.secondary_client_first_name = input.secondaryClient.firstName;
      if (input.secondaryClient.lastName !== undefined) updateData.secondary_client_last_name = input.secondaryClient.lastName;
      if (input.secondaryClient.email !== undefined) updateData.secondary_client_email = input.secondaryClient.email;
      if (input.secondaryClient.phone !== undefined) updateData.secondary_client_phone = input.secondaryClient.phone;
    }
    
    if (input.assessorParcelInfo !== undefined) updateData.assessor_parcel_info = input.assessorParcelInfo;

    const { data, error } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) throw error;
    return data ? mapProject(data) : null;
  },

  delete: async (id: string): Promise<boolean> => {
    const userId = await getCurrentUserId();
    
    const { error } = await supabase
      .from('projects')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: userId,
      })
      .eq('id', id);

    if (error) throw error;
    return true;
  },
};

// Tasks API
const tasks = {
  list: async (projectId?: string): Promise<Task[]> => {
    let query = supabase
      .from('tasks')
      .select('*')
      .is('deleted_at', null)
      .order('sort_order', { ascending: true });
    
    if (projectId) {
      query = query.eq('project_id', projectId);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(mapTask);
  },

  get: async (id: string): Promise<Task | null> => {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle();
    
    if (error) throw error;
    return data ? mapTask(data) : null;
  },

  create: async (input: CreateTaskInput): Promise<Task> => {
    const userId = await getCurrentUserId();
    
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        project_id: input.projectId,
        title: input.title,
        description: input.description,
        assignees: input.assignees || [],
        attached_files: input.attachedFiles || [],
        status: input.status || 'task_redline',
        priority: input.priority || 'medium',
        due_date: input.dueDate,
        estimated_time: input.estimatedTime,
        sort_order: input.sortOrder || 0,
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw error;
    return mapTask(data);
  },

  update: async (id: string, input: UpdateTaskInput): Promise<Task | null> => {
    const userId = await getCurrentUserId();
    
    const updateData: any = {
      updated_by: userId,
    };
    
    if (input.title !== undefined) updateData.title = input.title;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.priority !== undefined) updateData.priority = input.priority;
    if (input.assignees !== undefined) updateData.assignees = input.assignees;
    if (input.attachedFiles !== undefined) updateData.attached_files = input.attachedFiles;
    if (input.dueDate !== undefined) updateData.due_date = input.dueDate;
    if (input.estimatedTime !== undefined) updateData.estimated_time = input.estimatedTime;
    if (input.actualTime !== undefined) updateData.actual_time = input.actualTime;
    if (input.sortOrder !== undefined) updateData.sort_order = input.sortOrder;

    const { data, error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) throw error;
    return data ? mapTask(data) : null;
  },

  delete: async (id: string): Promise<boolean> => {
    const userId = await getCurrentUserId();
    
    const { error } = await supabase
      .from('tasks')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: userId,
      })
      .eq('id', id);

    if (error) throw error;
    return true;
  },
};

// Users API
const users = {
  list: async (): Promise<User[]> => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .is('deleted_at', null)
      .order('name', { ascending: true });
    
    if (error) throw error;
    return (data || []).map(mapUser);
  },

  get: async (id: string): Promise<User | null> => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle();
    
    if (error) throw error;
    return data ? mapUser(data) : null;
  },

  create: async (input: CreateUserInput): Promise<User> => {
    const { data, error } = await supabase
      .from('users')
      .insert({
        name: input.name,
        email: input.email,
      })
      .select()
      .single();

    if (error) throw error;
    return mapUser(data);
  },
};

// Project Members API
const projectMembers = {
  list: async (projectId: string): Promise<ProjectMember[]> => {
    const { data, error } = await supabase
      .from('project_members')
      .select('*')
      .eq('project_id', projectId)
      .is('deleted_at', null);
    
    if (error) throw error;
    return (data || []).map(mapProjectMember);
  },

  create: async (projectId: string, userId: string, title?: string): Promise<ProjectMember> => {
    const { data, error } = await supabase
      .from('project_members')
      .insert({
        project_id: projectId,
        user_id: userId,
        title,
      })
      .select()
      .single();

    if (error) throw error;
    return mapProjectMember(data);
  },

  remove: async (id: string): Promise<boolean> => {
    const userId = await getCurrentUserId();
    
    const { error } = await supabase
      .from('project_members')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: userId,
      })
      .eq('id', id);

    if (error) throw error;
    return true;
  },
};

// Folders API
const folders = {
  list: async (projectId: string): Promise<Folder[]> => {
    const { data, error } = await supabase
      .from('folders')
      .select('*')
      .eq('project_id', projectId)
      .is('deleted_at', null);
    
    if (error) throw error;
    return (data || []).map(mapFolder);
  },

  get: async (id: string): Promise<Folder | null> => {
    const { data, error } = await supabase
      .from('folders')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle();
    
    if (error) throw error;
    return data ? mapFolder(data) : null;
  },

  create: async (projectId: string, name: string, parentId?: string): Promise<Folder> => {
    const userId = await getCurrentUserId();
    
    const { data, error } = await supabase
      .from('folders')
      .insert({
        project_id: projectId,
        parent_folder_id: parentId,
        name,
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw error;
    return mapFolder(data);
  },

  delete: async (id: string): Promise<boolean> => {
    const userId = await getCurrentUserId();
    
    const { error } = await supabase
      .from('folders')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: userId,
      })
      .eq('id', id);

    if (error) throw error;
    return true;
  },
};

// Files API
const files = {
  listByFolder: async (folderId: string): Promise<File[]> => {
    const { data, error } = await supabase
      .from('files')
      .select('*')
      .eq('folder_id', folderId)
      .is('deleted_at', null);
    
    if (error) throw error;
    return (data || []).map(mapFile);
  },

  listByProject: async (projectId: string): Promise<File[]> => {
    const { data, error } = await supabase
      .from('files')
      .select('*')
      .eq('project_id', projectId)
      .is('deleted_at', null);
    
    if (error) throw error;
    return (data || []).map(mapFile);
  },

  get: async (id: string): Promise<File | null> => {
    const { data, error } = await supabase
      .from('files')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle();
    
    if (error) throw error;
    return data ? mapFile(data) : null;
  },

  upload: async (projectId: string, folderId: string, file: any): Promise<File> => {
    const userId = await getCurrentUserId();
    
    // Upload to Supabase Storage
    const filePath = `${projectId}/${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from('project-files')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    // Create file record
    const { data, error } = await supabase
      .from('files')
      .insert({
        project_id: projectId,
        folder_id: folderId,
        filename: file.name,
        storage_path: filePath,
        mimetype: file.type,
        filesize: file.size,
        uploaded_by: userId,
      })
      .select()
      .single();

    if (error) throw error;
    return mapFile(data);
  },

  delete: async (id: string): Promise<boolean> => {
    const userId = await getCurrentUserId();
    
    const { error } = await supabase
      .from('files')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: userId,
      })
      .eq('id', id);

    if (error) throw error;
    return true;
  },

  generateShareLink: async (fileId: string): Promise<string | null> => {
    const { data, error } = await supabase
      .from('files')
      .update({
        is_shareable: true,
      })
      .eq('id', fileId)
      .select('share_token')
      .single();

    if (error) throw error;
    return data?.share_token ? `/share/${data.share_token}` : null;
  },

  revokeShareLink: async (fileId: string): Promise<boolean> => {
    const { error } = await supabase
      .from('files')
      .update({
        is_shareable: false,
      })
      .eq('id', fileId);

    if (error) throw error;
    return true;
  },

  getVersionHistory: async (fileId: string): Promise<File[]> => {
    const versions: File[] = [];
    let currentFileId: string | null = fileId;

    while (currentFileId) {
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .eq('id', currentFileId)
        .maybeSingle();

      if (error || !data) break;
      
      versions.push(mapFile(data));
      currentFileId = data.parent_file_id;
    }

    return versions;
  },
};

// Notes API
const notes = {
  list: async (projectId: string): Promise<Note[]> => {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return (data || []).map(mapNote);
  },

  get: async (id: string): Promise<Note | null> => {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle();
    
    if (error) throw error;
    return data ? mapNote(data) : null;
  },

  create: async (input: CreateNoteInput): Promise<Note> => {
    const userId = await getCurrentUserId();
    
    const { data, error } = await supabase
      .from('notes')
      .insert({
        project_id: input.projectId,
        content: input.content,
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw error;
    return mapNote(data);
  },

  update: async (id: string, input: UpdateNoteInput): Promise<Note | null> => {
    const userId = await getCurrentUserId();
    
    const { data, error } = await supabase
      .from('notes')
      .update({
        content: input.content,
        updated_by: userId,
      })
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) throw error;
    return data ? mapNote(data) : null;
  },

  delete: async (id: string): Promise<boolean> => {
    const userId = await getCurrentUserId();
    
    const { error } = await supabase
      .from('notes')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: userId,
      })
      .eq('id', id);

    if (error) throw error;
    return true;
  },
};

// Invoices API
const invoices = {
  list: async (projectId: string): Promise<Invoice[]> => {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('project_id', projectId)
      .is('deleted_at', null)
      .order('invoice_date', { ascending: false });
    
    if (error) throw error;
    return (data || []).map(mapInvoice);
  },

  get: async (id: string): Promise<Invoice | null> => {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle();
    
    if (error) throw error;
    return data ? mapInvoice(data) : null;
  },

  create: async (input: CreateInvoiceInput): Promise<Invoice> => {
    const userId = await getCurrentUserId();
    
    const { data, error } = await supabase
      .from('invoices')
      .insert({
        project_id: input.projectId,
        invoice_number: input.invoiceNumber,
        submitted_to_names: input.submittedToNames,
        invoice_date: input.invoiceDate,
        due_date: input.dueDate,
        subtotal: input.subtotal,
        processing_fee_percent: input.processingFeePercent || 3.5,
        processing_fee_amount: input.processingFeeAmount,
        total: input.total,
        status: input.status || 'draft',
        notes: input.notes,
        created_by: userId,
      })
      .select()
      .single();

    if (error) throw error;
    return mapInvoice(data);
  },

  update: async (id: string, input: UpdateInvoiceInput): Promise<Invoice | null> => {
    const userId = await getCurrentUserId();
    
    const updateData: any = {
      updated_by: userId,
    };
    
    if (input.invoiceNumber !== undefined) updateData.invoice_number = input.invoiceNumber;
    if (input.submittedToNames !== undefined) updateData.submitted_to_names = input.submittedToNames;
    if (input.invoiceDate !== undefined) updateData.invoice_date = input.invoiceDate;
    if (input.dueDate !== undefined) updateData.due_date = input.dueDate;
    if (input.subtotal !== undefined) updateData.subtotal = input.subtotal;
    if (input.processingFeePercent !== undefined) updateData.processing_fee_percent = input.processingFeePercent;
    if (input.processingFeeAmount !== undefined) updateData.processing_fee_amount = input.processingFeeAmount;
    if (input.total !== undefined) updateData.total = input.total;
    if (input.paidAmount !== undefined) updateData.paid_amount = input.paidAmount;
    if (input.paidDate !== undefined) updateData.paid_date = input.paidDate;
    if (input.paymentMethod !== undefined) updateData.payment_method = input.paymentMethod;
    if (input.paymentReference !== undefined) updateData.payment_reference = input.paymentReference;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.notes !== undefined) updateData.notes = input.notes;

    const { data, error } = await supabase
      .from('invoices')
      .update(updateData)
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) throw error;
    return data ? mapInvoice(data) : null;
  },

  delete: async (id: string): Promise<boolean> => {
    const userId = await getCurrentUserId();
    
    const { error } = await supabase
      .from('invoices')
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: userId,
      })
      .eq('id', id);

    if (error) throw error;
    return true;
  },

  addLineItem: async (input: CreateInvoiceLineItemInput): Promise<InvoiceLineItem> => {
    const { data, error } = await supabase
      .from('invoice_line_items')
      .insert({
        invoice_id: input.invoiceId,
        phase: input.phase,
        description: input.description,
        amount: input.amount,
        sort_order: input.sortOrder || 0,
      })
      .select()
      .single();

    if (error) throw error;
    return mapInvoiceLineItem(data);
  },

  listLineItems: async (invoiceId: string): Promise<InvoiceLineItem[]> => {
    const { data, error } = await supabase
      .from('invoice_line_items')
      .select('*')
      .eq('invoice_id', invoiceId)
      .order('sort_order', { ascending: true });
    
    if (error) throw error;
    return (data || []).map(mapInvoiceLineItem);
  },

  removeLineItem: async (id: string): Promise<boolean> => {
    const { error } = await supabase
      .from('invoice_line_items')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  },
};

// Workspaces API
const workspaces = {
  list: async (): Promise<Workspace[]> => {
    const { data, error } = await supabase
      .from('workspaces')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return (data || []).map(mapWorkspace);
  },

  get: async (id: string): Promise<Workspace | null> => {
    const { data, error } = await supabase
      .from('workspaces')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    
    if (error) throw error;
    return data ? mapWorkspace(data) : null;
  },

  create: async (input: CreateWorkspaceInput): Promise<Workspace> => {
    const { data, error } = await supabase
      .from('workspaces')
      .insert({
        name: input.name,
        description: input.description,
        icon: input.icon || '🏢',
      })
      .select()
      .single();

    if (error) throw error;
    return mapWorkspace(data);
  },

  update: async (id: string, input: UpdateWorkspaceInput): Promise<Workspace | null> => {
    const updateData: any = {};
    
    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.icon !== undefined) updateData.icon = input.icon;

    const { data, error } = await supabase
      .from('workspaces')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data ? mapWorkspace(data) : null;
  },

  delete: async (id: string): Promise<boolean> => {
    const { error } = await supabase
      .from('workspaces')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  },

  getCurrentWorkspaceId: (): string | null => {
    return localStorage.getItem('current_workspace_id');
  },

  setCurrentWorkspaceId: (id: string): void => {
    localStorage.setItem('current_workspace_id', id);
  },
};

// Export unified API
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
