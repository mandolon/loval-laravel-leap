-- Add soft delete columns to drawing_pages table
ALTER TABLE public.drawing_pages
ADD COLUMN deleted_at timestamp with time zone,
ADD COLUMN deleted_by uuid REFERENCES public.users(id);

-- Create index for soft delete queries
CREATE INDEX idx_drawing_pages_deleted_at ON public.drawing_pages(deleted_at) WHERE deleted_at IS NULL;

COMMENT ON COLUMN public.drawing_pages.deleted_at IS 'Timestamp when the drawing page was soft deleted';
COMMENT ON COLUMN public.drawing_pages.deleted_by IS 'User who soft deleted the drawing page';