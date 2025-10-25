-- Detail Library Schema Migration

-- Create detail_library_categories table
CREATE TABLE IF NOT EXISTS public.detail_library_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  short_id TEXT UNIQUE NOT NULL,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  is_system_category BOOLEAN DEFAULT false,
  sort_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, slug)
);

-- Create detail_library_files table
CREATE TABLE IF NOT EXISTS public.detail_library_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  short_id TEXT UNIQUE NOT NULL,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.detail_library_categories(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  filename TEXT NOT NULL,
  filesize BIGINT NOT NULL,
  mimetype TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  color_tag TEXT NOT NULL CHECK (color_tag IN ('slate', 'green', 'amber', 'violet', 'pink', 'cyan')),
  description TEXT,
  author_name TEXT,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID
);

-- Create detail_library_items table (sub-details within a file)
CREATE TABLE IF NOT EXISTS public.detail_library_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  short_id TEXT UNIQUE NOT NULL,
  parent_file_id UUID NOT NULL REFERENCES public.detail_library_files(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  filename TEXT NOT NULL,
  filesize BIGINT NOT NULL,
  mimetype TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.detail_library_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detail_library_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.detail_library_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for detail_library_categories
CREATE POLICY "Users can view categories for their workspaces"
  ON public.detail_library_categories FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert categories for their workspaces"
  ON public.detail_library_categories FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for detail_library_files
CREATE POLICY "Users can view non-deleted files for their workspaces"
  ON public.detail_library_files FOR SELECT
  USING (
    deleted_at IS NULL AND
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert files for their workspaces"
  ON public.detail_library_files FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update files for their workspaces"
  ON public.detail_library_files FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for detail_library_items
CREATE POLICY "Users can view items for accessible files"
  ON public.detail_library_items FOR SELECT
  USING (
    parent_file_id IN (
      SELECT id FROM public.detail_library_files 
      WHERE deleted_at IS NULL AND workspace_id IN (
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert items for accessible files"
  ON public.detail_library_items FOR INSERT
  WITH CHECK (
    parent_file_id IN (
      SELECT id FROM public.detail_library_files 
      WHERE workspace_id IN (
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete items for accessible files"
  ON public.detail_library_items FOR DELETE
  USING (
    parent_file_id IN (
      SELECT id FROM public.detail_library_files 
      WHERE workspace_id IN (
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
      )
    )
  );

-- Function to generate short IDs
CREATE OR REPLACE FUNCTION generate_detail_library_short_id(prefix TEXT)
RETURNS TEXT AS $$
DECLARE
  new_id TEXT;
  exists_check INTEGER;
BEGIN
  LOOP
    new_id := prefix || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    
    IF prefix = 'DLC' THEN
      SELECT COUNT(*) INTO exists_check FROM public.detail_library_categories WHERE short_id = new_id;
    ELSIF prefix = 'DLF' THEN
      SELECT COUNT(*) INTO exists_check FROM public.detail_library_files WHERE short_id = new_id;
    ELSIF prefix = 'DLI' THEN
      SELECT COUNT(*) INTO exists_check FROM public.detail_library_items WHERE short_id = new_id;
    END IF;
    
    EXIT WHEN exists_check = 0;
  END LOOP;
  
  RETURN new_id;
END;
$$ LANGUAGE plpgsql;

-- Triggers for short_id generation
CREATE OR REPLACE FUNCTION set_detail_library_category_short_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.short_id IS NULL OR NEW.short_id = '' THEN
    NEW.short_id := generate_detail_library_short_id('DLC');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_detail_library_file_short_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.short_id IS NULL OR NEW.short_id = '' THEN
    NEW.short_id := generate_detail_library_short_id('DLF');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_detail_library_item_short_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.short_id IS NULL OR NEW.short_id = '' THEN
    NEW.short_id := generate_detail_library_short_id('DLI');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_category_short_id
  BEFORE INSERT ON public.detail_library_categories
  FOR EACH ROW EXECUTE FUNCTION set_detail_library_category_short_id();

CREATE TRIGGER trigger_set_file_short_id
  BEFORE INSERT ON public.detail_library_files
  FOR EACH ROW EXECUTE FUNCTION set_detail_library_file_short_id();

CREATE TRIGGER trigger_set_item_short_id
  BEFORE INSERT ON public.detail_library_items
  FOR EACH ROW EXECUTE FUNCTION set_detail_library_item_short_id();

-- Trigger for updated_at
CREATE TRIGGER update_detail_library_categories_updated_at
  BEFORE UPDATE ON public.detail_library_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_detail_library_files_updated_at
  BEFORE UPDATE ON public.detail_library_files
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_detail_library_items_updated_at
  BEFORE UPDATE ON public.detail_library_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed system categories for existing workspaces
INSERT INTO public.detail_library_categories (workspace_id, name, slug, is_system_category, sort_order, short_id)
SELECT 
  w.id,
  category.name,
  category.slug,
  true,
  category.sort_order,
  ''
FROM public.workspaces w
CROSS JOIN (
  VALUES 
    ('Foundation', 'foundation', 1),
    ('Wall', 'wall', 2),
    ('Floor/Ceiling', 'floor-ceiling', 3),
    ('Roof', 'roof', 4),
    ('Stair', 'stair', 5),
    ('Finish', 'finish', 6)
) AS category(name, slug, sort_order)
ON CONFLICT (workspace_id, slug) DO NOTHING;