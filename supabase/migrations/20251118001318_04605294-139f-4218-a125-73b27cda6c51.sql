-- Create search function for knowledge base using vector similarity
CREATE OR REPLACE FUNCTION public.search_knowledge_base(
  query_embedding vector(768),
  match_threshold float,
  match_count int,
  filter_workspace_id uuid
)
RETURNS TABLE (
  id uuid,
  file_name text,
  file_path text,
  chunk_content text,
  chunk_index int,
  similarity float
)
LANGUAGE sql STABLE
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
    AND (1 - (embedding <=> query_embedding)) > match_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;