-- Enable pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Create building_codes table with pgvector support
CREATE TABLE IF NOT EXISTS public.building_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  short_id TEXT NOT NULL DEFAULT generate_short_id('BC'),
  content TEXT NOT NULL,
  embedding vector(768),
  code_type TEXT NOT NULL,
  title TEXT,
  chapter TEXT,
  section TEXT NOT NULL,
  year TEXT NOT NULL,
  jurisdiction TEXT DEFAULT 'california',
  source_file TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_building_codes_embedding ON public.building_codes 
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_building_codes_code_type ON public.building_codes (code_type);
CREATE INDEX IF NOT EXISTS idx_building_codes_year ON public.building_codes (year);
CREATE INDEX IF NOT EXISTS idx_building_codes_jurisdiction ON public.building_codes (jurisdiction);
CREATE INDEX IF NOT EXISTS idx_building_codes_section ON public.building_codes (section);
CREATE INDEX IF NOT EXISTS idx_building_codes_deleted_at ON public.building_codes (deleted_at);

-- Full text search index for hybrid search
ALTER TABLE public.building_codes ADD COLUMN IF NOT EXISTS fts tsvector 
  GENERATED ALWAYS AS (to_tsvector('english', content)) STORED;
CREATE INDEX IF NOT EXISTS idx_building_codes_fts ON public.building_codes USING gin (fts);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_building_codes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_building_codes_updated_at
  BEFORE UPDATE ON public.building_codes
  FOR EACH ROW
  EXECUTE FUNCTION update_building_codes_updated_at();