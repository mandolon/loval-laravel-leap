-- Create model_versions table
CREATE TABLE IF NOT EXISTS public.model_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  version_number TEXT NOT NULL,
  is_current BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  short_id TEXT NOT NULL DEFAULT generate_short_id('MV'::text),
  UNIQUE(project_id, version_number)
);

-- Create model_files table
CREATE TABLE IF NOT EXISTS public.model_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  version_id UUID NOT NULL REFERENCES public.model_versions(id) ON DELETE CASCADE,
  file_id UUID REFERENCES public.files(id) ON DELETE SET NULL,
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  filesize BIGINT NOT NULL,
  mimetype TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  short_id TEXT NOT NULL DEFAULT generate_short_id('MF'::text)
);

-- Create model_settings table
CREATE TABLE IF NOT EXISTS public.model_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  version_id UUID NOT NULL REFERENCES public.model_versions(id) ON DELETE CASCADE,
  background TEXT NOT NULL DEFAULT 'light',
  show_grid BOOLEAN NOT NULL DEFAULT true,
  show_axes BOOLEAN NOT NULL DEFAULT true,
  layers JSONB NOT NULL DEFAULT '{"structure": true, "walls": true, "roof": true, "floor": true, "windows": true}'::jsonb,
  notes TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(version_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_model_versions_project_id ON public.model_versions(project_id);
CREATE INDEX IF NOT EXISTS idx_model_versions_is_current ON public.model_versions(is_current) WHERE is_current = true;
CREATE INDEX IF NOT EXISTS idx_model_files_version_id ON public.model_files(version_id);
CREATE INDEX IF NOT EXISTS idx_model_settings_version_id ON public.model_settings(version_id);

-- Add trigger for updated_at on model_versions
CREATE TRIGGER update_model_versions_updated_at
  BEFORE UPDATE ON public.model_versions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add trigger for updated_at on model_settings
CREATE TRIGGER update_model_settings_updated_at
  BEFORE UPDATE ON public.model_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();