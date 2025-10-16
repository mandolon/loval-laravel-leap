-- Create workspaces table
CREATE TABLE public.workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  icon text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create clients table
CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  company text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create projects table
CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'active',
  phase text NOT NULL DEFAULT 'Design',
  address jsonb NOT NULL DEFAULT '{}',
  budget numeric(12,2),
  due_date date,
  progress int DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create tasks table
CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'todo',
  priority text NOT NULL DEFAULT 'medium',
  assignees uuid[] DEFAULT '{}',
  due_date date,
  estimated_time int,
  actual_time int,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create workspace_members table (for future use)
CREATE TABLE public.workspace_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, user_id)
);

-- Indexes for performance
CREATE INDEX projects_workspace_idx ON public.projects(workspace_id);
CREATE INDEX projects_workspace_status_idx ON public.projects(workspace_id, status);
CREATE INDEX tasks_project_idx ON public.tasks(project_id);
CREATE INDEX tasks_project_status_idx ON public.tasks(project_id, status);
CREATE INDEX clients_workspace_idx ON public.clients(workspace_id);
CREATE INDEX workspace_members_workspace_idx ON public.workspace_members(workspace_id);
CREATE INDEX workspace_members_user_idx ON public.workspace_members(user_id);

-- Enable RLS
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for workspaces (admins can manage, members can view)
CREATE POLICY "Admins can manage workspaces"
ON public.workspaces FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Members can view their workspaces"
ON public.workspaces FOR SELECT
USING (
  id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  )
);

-- RLS Policies for workspace_members
CREATE POLICY "Admins can manage workspace members"
ON public.workspace_members FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view workspace members in their workspaces"
ON public.workspace_members FOR SELECT
USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  )
);

-- RLS Policies for clients (scoped to workspace members)
CREATE POLICY "Workspace members can manage clients"
ON public.clients FOR ALL
USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  )
);

-- RLS Policies for projects (scoped to workspace members)
CREATE POLICY "Workspace members can manage projects"
ON public.projects FOR ALL
USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  )
);

-- RLS Policies for tasks (scoped to project workspace members)
CREATE POLICY "Workspace members can manage tasks"
ON public.tasks FOR ALL
USING (
  project_id IN (
    SELECT p.id FROM public.projects p
    INNER JOIN public.workspace_members wm ON wm.workspace_id = p.workspace_id
    WHERE wm.user_id = auth.uid()
  )
);

-- Triggers for updated_at
CREATE TRIGGER update_workspaces_updated_at
BEFORE UPDATE ON public.workspaces
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clients_updated_at
BEFORE UPDATE ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
BEFORE UPDATE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();