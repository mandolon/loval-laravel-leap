-- Fix hard delete for users with workspace chat messages
-- Drop the existing constraint without CASCADE
ALTER TABLE public.workspace_chat_messages
DROP CONSTRAINT IF EXISTS workspace_chat_messages_user_id_fkey;

-- Re-add the constraint with CASCADE delete
ALTER TABLE public.workspace_chat_messages
ADD CONSTRAINT workspace_chat_messages_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;