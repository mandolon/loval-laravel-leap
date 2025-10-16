-- Add assessor_parcel_info to projects table
ALTER TABLE projects ADD COLUMN assessor_parcel_info jsonb DEFAULT '{}'::jsonb;