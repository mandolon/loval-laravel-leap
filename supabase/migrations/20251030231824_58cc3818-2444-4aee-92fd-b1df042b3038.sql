-- 1. drawings: Version container (v2.0, v1.5, v1.0)
CREATE TABLE public.drawings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  short_id text NOT NULL DEFAULT generate_short_id('DRW'),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id),
  name text NOT NULL,
  version_number text NOT NULL DEFAULT 'v1.0',
  description text,
  created_by uuid REFERENCES public.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  deleted_by uuid REFERENCES public.users(id)
);

-- 2. drawing_pages: Individual sheets per version
CREATE TABLE public.drawing_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  short_id text NOT NULL DEFAULT generate_short_id('DRP'),
  drawing_id uuid NOT NULL REFERENCES public.drawings(id) ON DELETE CASCADE,
  page_number integer NOT NULL,
  name text NOT NULL DEFAULT 'Page 1',
  excalidraw_data jsonb NOT NULL DEFAULT '{"elements":[],"appState":{},"files":{}}'::jsonb,
  background_image_path text,
  thumbnail_storage_path text,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. drawing_scales: Calibration data per page
CREATE TABLE public.drawing_scales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drawing_page_id uuid NOT NULL REFERENCES public.drawing_pages(id) ON DELETE CASCADE,
  scale_name text NOT NULL,
  inches_per_scene_unit numeric NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_drawings_project_id ON public.drawings(project_id);
CREATE INDEX idx_drawings_workspace_id ON public.drawings(workspace_id);
CREATE INDEX idx_drawings_version ON public.drawings(version_number);
CREATE INDEX idx_drawing_pages_drawing_id ON public.drawing_pages(drawing_id);
CREATE INDEX idx_drawing_scales_page_id ON public.drawing_scales(drawing_page_id);

-- Comment for documentation
COMMENT ON TABLE drawing_pages IS 'Stores Excalidraw drawing data. Background images up to 60MB stored in drawing-images bucket.';

-- NO RLS initially (can add later if needed)
ALTER TABLE public.drawings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.drawing_pages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.drawing_scales DISABLE ROW LEVEL SECURITY;

-- 4. Storage bucket for 60MB files
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('drawing-images', 'drawing-images', false, 60000000)
ON CONFLICT (id) DO NOTHING;

-- Policies: authenticated users can upload/read
CREATE POLICY "Authenticated users can upload drawing images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'drawing-images');

CREATE POLICY "Authenticated users can read drawing images"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'drawing-images');