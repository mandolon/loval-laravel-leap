-- Create function to auto-create default role for new users
CREATE OR REPLACE FUNCTION public.auto_create_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only insert if user doesn't have any role yet
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = NEW.id) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'team'::app_role);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on users table
CREATE TRIGGER on_user_created_create_role
  AFTER INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_user_role();

-- Backfill existing users without roles
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'team'::app_role
FROM public.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
WHERE ur.user_id IS NULL
  AND u.deleted_at IS NULL;