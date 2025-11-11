-- Add scale column to detail_library_files table
ALTER TABLE detail_library_files 
ADD COLUMN scale text;

-- Add a comment to document the column
COMMENT ON COLUMN detail_library_files.scale IS 'Scale information for the detail (e.g., NTS, 1/4 inch = 1 foot)';