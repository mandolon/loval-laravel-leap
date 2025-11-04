-- Fix foreign key relationship for workspace_chat_messages to reference users.auth_id
-- Drop existing foreign key constraints
ALTER TABLE workspace_chat_messages 
DROP CONSTRAINT IF EXISTS workspace_chat_messages_user_id_fkey;

ALTER TABLE workspace_chat_messages 
DROP CONSTRAINT IF EXISTS workspace_chat_messages_deleted_by_fkey;

-- Add correct foreign key constraints pointing to users.auth_id
ALTER TABLE workspace_chat_messages
ADD CONSTRAINT workspace_chat_messages_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(auth_id);

ALTER TABLE workspace_chat_messages
ADD CONSTRAINT workspace_chat_messages_deleted_by_fkey 
FOREIGN KEY (deleted_by) REFERENCES users(auth_id);