-- ============================================
-- Phase 1: Create Missing Triggers for short_id
-- ============================================

-- Trigger for detail_library_categories
CREATE TRIGGER set_category_short_id
  BEFORE INSERT ON public.detail_library_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.set_detail_library_category_short_id();

-- Trigger for detail_library_files
CREATE TRIGGER set_file_short_id
  BEFORE INSERT ON public.detail_library_files
  FOR EACH ROW
  EXECUTE FUNCTION public.set_detail_library_file_short_id();

-- Trigger for detail_library_items
CREATE TRIGGER set_item_short_id
  BEFORE INSERT ON public.detail_library_items
  FOR EACH ROW
  EXECUTE FUNCTION public.set_detail_library_item_short_id();

-- ============================================
-- Phase 2: Fix Storage Bucket Policies
-- ============================================

-- Drop old workspace-based policies
DROP POLICY IF EXISTS "Users can upload detail library files to their workspace" ON storage.objects;
DROP POLICY IF EXISTS "Users can view detail library files in their workspace" ON storage.objects;
DROP POLICY IF EXISTS "Users can update detail library files in their workspace" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete detail library files in their workspace" ON storage.objects;

-- Create new universal policies for authenticated users
CREATE POLICY "Authenticated users can upload to detail-library"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'detail-library'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can view detail-library files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'detail-library'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can update detail-library files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'detail-library'
  AND auth.role() = 'authenticated'
)
WITH CHECK (
  bucket_id = 'detail-library'
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can delete detail-library files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'detail-library'
  AND auth.role() = 'authenticated'
);