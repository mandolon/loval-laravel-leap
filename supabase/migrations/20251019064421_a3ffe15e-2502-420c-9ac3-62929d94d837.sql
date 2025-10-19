-- 1. Create role enum
CREATE TYPE public.app_role AS ENUM ('team', 'consultant', 'client');

-- 2. Create user_roles table (enforces one global role per user)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (user_id)
);

CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);

-- 3. Migrate existing roles from workspace_members to user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT DISTINCT ON (user_id) 
  user_id, 
  role::app_role
FROM public.workspace_members
WHERE deleted_at IS NULL 
  AND role IS NOT NULL
ORDER BY user_id, created_at ASC
ON CONFLICT (user_id) DO NOTHING;

-- 4. Remove role from workspace_members
ALTER TABLE public.workspace_members 
DROP COLUMN IF EXISTS role;

-- 5. Create helper function for role lookups
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id
$$;

-- 6. Create trigger to update updated_at
CREATE TRIGGER update_user_roles_updated_at
BEFORE UPDATE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();