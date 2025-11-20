-- Add last_page_visited column to users table
-- This tracks the last main page/section the user visited (e.g., home, projects, tasks, chat)

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS last_page_visited TEXT;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_users_last_page_visited 
ON public.users(last_page_visited) 
WHERE last_page_visited IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.users.last_page_visited 
IS 'Last main page/section user visited (e.g., home, projects, tasks, chat, files, notes)';
