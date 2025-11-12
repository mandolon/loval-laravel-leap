-- Drop existing RLS policies from chat_read_receipts
DROP POLICY IF EXISTS "Users can view their own read receipts" ON public.chat_read_receipts;
DROP POLICY IF EXISTS "Users can insert their own read receipts" ON public.chat_read_receipts;
DROP POLICY IF EXISTS "Users can update their own read receipts" ON public.chat_read_receipts;

-- Disable RLS on chat_read_receipts table
ALTER TABLE public.chat_read_receipts DISABLE ROW LEVEL SECURITY;