-- Create knowledge_base table for storing file chunks with embeddings
CREATE TABLE IF NOT EXISTS public.knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  short_id TEXT NOT NULL DEFAULT generate_short_id('KB'),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  chunk_content TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  embedding vector(768),
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_knowledge_base_workspace ON public.knowledge_base (workspace_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_file_name ON public.knowledge_base (file_name);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_deleted_at ON public.knowledge_base (deleted_at);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_embedding ON public.knowledge_base 
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Full text search index
ALTER TABLE public.knowledge_base ADD COLUMN IF NOT EXISTS fts tsvector 
  GENERATED ALWAYS AS (to_tsvector('english', chunk_content)) STORED;
CREATE INDEX IF NOT EXISTS idx_knowledge_base_fts ON public.knowledge_base USING gin (fts);

-- Update trigger
CREATE OR REPLACE FUNCTION update_knowledge_base_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_knowledge_base_updated_at
  BEFORE UPDATE ON public.knowledge_base
  FOR EACH ROW
  EXECUTE FUNCTION update_knowledge_base_updated_at();

-- Create storage bucket for knowledge base files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('knowledge-base', 'knowledge-base', false)
ON CONFLICT (id) DO NOTHING;