-- Phase 1: Fix Critical Missing Fields

-- 1.1 Add missing fields to ai_chat_messages table
ALTER TABLE public.ai_chat_messages 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

-- 1.2 Update user_preferences defaults to match schema
ALTER TABLE public.user_preferences 
ALTER COLUMN theme SET DEFAULT 'system',
ALTER COLUMN email_digest SET DEFAULT 'daily';

-- Add comment for clarity
COMMENT ON COLUMN ai_chat_messages.deleted_at IS 'Soft delete timestamp for chat messages';
COMMENT ON COLUMN ai_chat_messages.deleted_by IS 'User who deleted this message';