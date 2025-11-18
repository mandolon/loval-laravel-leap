-- Add project_id and file_id columns to knowledge_base for project-scoped search
ALTER TABLE public.knowledge_base 
ADD COLUMN project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
ADD COLUMN file_id uuid REFERENCES public.files(id) ON DELETE CASCADE;

-- Create indexes for performance
CREATE INDEX idx_knowledge_base_project_id ON public.knowledge_base(project_id);
CREATE INDEX idx_knowledge_base_file_id ON public.knowledge_base(file_id);

-- Update search_knowledge_base function to support optional project filtering
CREATE OR REPLACE FUNCTION public.search_knowledge_base(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  filter_workspace_id uuid,
  filter_project_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  file_name text,
  file_path text,
  chunk_content text,
  chunk_index integer,
  similarity double precision
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    id,
    file_name,
    file_path,
    chunk_content,
    chunk_index,
    1 - (embedding <=> query_embedding) as similarity
  FROM public.knowledge_base
  WHERE workspace_id = filter_workspace_id
    AND deleted_at IS NULL
    AND (filter_project_id IS NULL OR project_id = filter_project_id)
    AND (1 - (embedding <=> query_embedding)) > match_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;