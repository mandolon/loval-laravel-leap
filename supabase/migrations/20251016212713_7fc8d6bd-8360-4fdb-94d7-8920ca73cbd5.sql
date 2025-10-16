-- ============================================================================
-- Disable RLS on New Tables (Lightweight MVP - No RLS)
-- ============================================================================

ALTER TABLE public.user_preferences DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_chat_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_chat_threads DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_chat_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.links DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;