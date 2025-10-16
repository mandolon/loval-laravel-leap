-- ============================================================================
-- Disable RLS on ALL Tables (Lightweight MVP - No RLS)
-- ============================================================================

-- Disable RLS on existing tables to fix infinite recursion errors
ALTER TABLE public.workspaces DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.folders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.files DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_line_items DISABLE ROW LEVEL SECURITY;