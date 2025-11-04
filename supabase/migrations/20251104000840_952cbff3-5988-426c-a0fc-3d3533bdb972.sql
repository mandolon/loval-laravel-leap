-- Add foreign key constraint for files.deleted_by -> users.id
ALTER TABLE files
ADD CONSTRAINT files_new_deleted_by_fkey
FOREIGN KEY (deleted_by) REFERENCES users(id);

-- Add foreign key constraint for folders.deleted_by -> users.id
ALTER TABLE folders
ADD CONSTRAINT folders_new_deleted_by_fkey
FOREIGN KEY (deleted_by) REFERENCES users(id);