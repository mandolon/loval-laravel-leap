-- ============================================================================
-- Drop All RLS Policies (Lightweight MVP - No RLS)
-- ============================================================================

-- Drop policies on workspaces
DROP POLICY IF EXISTS "Admins can manage workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Members can view their workspaces" ON public.workspaces;

-- Drop policies on workspace_members
DROP POLICY IF EXISTS "Admins can manage workspace members" ON public.workspace_members;
DROP POLICY IF EXISTS "Users can view workspace members in their workspaces" ON public.workspace_members;

-- Drop policies on users
DROP POLICY IF EXISTS "Users can view workspace members" ON public.users;

-- Drop policies on user_roles
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

-- Drop policies on projects
DROP POLICY IF EXISTS "Users can create projects" ON public.projects;
DROP POLICY IF EXISTS "Users can update workspace projects" ON public.projects;
DROP POLICY IF EXISTS "Users can view workspace projects" ON public.projects;

-- Drop policies on project_members
DROP POLICY IF EXISTS "Users can add team members to projects" ON public.project_members;
DROP POLICY IF EXISTS "Users can remove team members from projects" ON public.project_members;
DROP POLICY IF EXISTS "Users can update project team members" ON public.project_members;
DROP POLICY IF EXISTS "Users can view project team members" ON public.project_members;

-- Drop policies on tasks
DROP POLICY IF EXISTS "Users can create tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can view project tasks" ON public.tasks;

-- Drop policies on folders
DROP POLICY IF EXISTS "Users can view project folders" ON public.folders;

-- Drop policies on files
DROP POLICY IF EXISTS "Users can create files" ON public.files;
DROP POLICY IF EXISTS "Users can view project files" ON public.files;

-- Drop policies on notes
DROP POLICY IF EXISTS "Users can view project notes" ON public.notes;

-- Drop policies on invoices
DROP POLICY IF EXISTS "Users can view project invoices" ON public.invoices;

-- Drop policies on invoice_line_items
DROP POLICY IF EXISTS "Users can add invoice line items" ON public.invoice_line_items;
DROP POLICY IF EXISTS "Users can delete invoice line items" ON public.invoice_line_items;
DROP POLICY IF EXISTS "Users can update invoice line items" ON public.invoice_line_items;
DROP POLICY IF EXISTS "Users can view invoice line items" ON public.invoice_line_items;