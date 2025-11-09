# Drag-and-Drop API Documentation

## Overview
Complete API documentation for the project file management drag-and-drop system. This covers all hooks, mutations, and their usage patterns.

---

## Hooks Reference

### useProjectFolders
**Purpose**: Fetch all folders for a project

**Usage**:
```typescript
const { data: folders, isLoading } = useProjectFolders(projectId);
```

**Returns**:
```typescript
{
  data: Folder[],
  isLoading: boolean,
  error: Error | null
}
```

**Folder Interface**:
```typescript
interface Folder {
  id: string
  short_id: string
  project_id: string
  name: string
  parent_folder_id: string | null
  is_system_folder: boolean
  path: string | null
  created_at: string
  updated_at: string
}
```

---

### useProjectFiles
**Purpose**: Fetch all files for a project

**Usage**:
```typescript
const { data: files, isLoading } = useProjectFiles(projectId);
```

**Returns**:
```typescript
{
  data: ProjectFile[],
  isLoading: boolean,
  error: Error | null
}
```

**ProjectFile Interface**:
```typescript
interface ProjectFile {
  id: string
  short_id: string
  project_id: string
  folder_id: string
  task_id: string | null
  parent_file_id: string | null
  filename: string
  version_number: number
  filesize: number | null
  mimetype: string | null
  storage_path: string
  download_count: number
  share_token: string | null
  is_shareable: boolean
  uploaded_by: string
  created_at: string
  updated_at: string
  deleted_at: string | null
  deleted_by: string | null
}
```

---

## Mutations

### useMoveProjectFile
**Purpose**: Move a file to a different folder

**Usage**:
```typescript
const moveFile = useMoveProjectFile(projectId);

// In component
moveFile.mutate({
  fileId: 'file-uuid',
  newFolderId: 'folder-uuid'
});
```

**Parameters**:
```typescript
{
  fileId: string      // UUID of file to move
  newFolderId: string // UUID of target folder
}
```

**Behavior**:
- Updates `files.folder_id` in database
- Sets `updated_at` timestamp
- Invalidates `projectFilesKeys.files(projectId)` cache
- Shows success/error toast

**Example**:
```typescript
const moveFile = useMoveProjectFile(projectId);

const handleMoveToArchive = (fileId: string, archiveFolderId: string) => {
  moveFile.mutate(
    { fileId, newFolderId: archiveFolderId },
    {
      onSuccess: () => {
        console.log('File moved to archive');
      },
      onError: (error) => {
        console.error('Move failed:', error);
      }
    }
  );
};
```

---

### useRenameFolder
**Purpose**: Rename a folder

**Usage**:
```typescript
const renameFolder = useRenameFolder(projectId);

renameFolder.mutate({
  folderId: 'folder-uuid',
  newName: 'New Folder Name'
});
```

**Parameters**:
```typescript
{
  folderId: string  // UUID of folder to rename
  newName: string   // New folder name
}
```

**Behavior**:
- Updates `folders.name` in database
- Sets `updated_at` timestamp
- Invalidates `projectFilesKeys.folders(projectId)` cache
- Shows success/error toast

**Validation**:
- Name is trimmed before update
- Empty names are rejected by component
- Names are case-sensitive

**Example**:
```typescript
const renameFolder = useRenameFolder(projectId);

const handleRename = (folderId: string, newName: string) => {
  const trimmed = newName.trim();
  if (!trimmed) return; // Reject empty names
  
  renameFolder.mutate(
    { folderId, newName: trimmed },
    {
      onSuccess: () => {
        setEditing(null); // Exit edit mode
      }
    }
  );
};
```

---

### useRenameProjectFile
**Purpose**: Rename a file

**Usage**:
```typescript
const renameFile = useRenameProjectFile(projectId);

renameFile.mutate({
  fileId: 'file-uuid',
  newName: 'new-filename.pdf'
});
```

**Parameters**:
```typescript
{
  fileId: string  // UUID of file to rename
  newName: string // New filename
}
```

**Behavior**:
- Updates `files.filename` in database
- Sets `updated_at` timestamp
- Invalidates `projectFilesKeys.files(projectId)` cache
- Shows success/error toast

**Validation**:
- Name is trimmed before update
- Empty names are rejected by component
- File extension is preserved

**Example**:
```typescript
const renameFile = useRenameProjectFile(projectId);

const handleFileRename = (fileId: string, newName: string) => {
  const trimmed = newName.trim();
  const oldName = files.find(f => f.id === fileId)?.filename;
  
  if (trimmed && trimmed !== oldName) {
    renameFile.mutate({
      fileId,
      newName: trimmed
    });
  }
};
```

---

### useDeleteProjectFile
**Purpose**: Soft delete a file (mark as deleted)

**Usage**:
```typescript
const deleteFile = useDeleteProjectFile(projectId);

deleteFile.mutate({
  fileId: 'file-uuid',
  projectId: 'project-uuid'
});
```

**Parameters**:
```typescript
{
  fileId: string
  projectId: string
}
```

**Behavior**:
- Sets `files.deleted_at` to current timestamp
- Records deleting user in `files.deleted_by`
- Soft delete (data recoverable)
- Invalidates cache and shows toast

---

### useDeleteFolder
**Purpose**: Soft delete a folder

**Usage**:
```typescript
const deleteFolder = useDeleteFolder(projectId);

deleteFolder.mutate({
  folderId: 'folder-uuid',
  projectId: 'project-uuid'
});
```

**Parameters**:
```typescript
{
  folderId: string
  projectId: string
}
```

**Behavior**:
- Sets `folders.deleted_at` to current timestamp
- Records deleting user in `folders.deleted_by`
- Soft delete (data recoverable)
- Invalidates cache and shows toast

**Note**: Files within deleted folder are NOT automatically deleted

---

### useProjectFolderDragDrop

#### reorderFoldersMutation
**Purpose**: Update folder order/position

**Usage**:
```typescript
const { reorderFoldersMutation } = useProjectFolderDragDrop(projectId);

reorderFoldersMutation.mutate({
  folderId: 'folder-uuid',
  newIndex: 0,
  parentFolderId: null
});
```

**Parameters**:
```typescript
{
  folderId: string           // UUID of folder being moved
  newIndex: number           // New position in list (0-based)
  parentFolderId: string | null // Parent folder ID (null = top-level)
}
```

**Behavior**:
- Updates `folders.parent_folder_id` if provided
- Sets `updated_at` timestamp
- Invalidates folder cache
- Current implementation doesn't persist position (see Enhancement note)

**Enhancement Note**:
For persistent ordering, add `display_order` column to folders table:
```sql
ALTER TABLE folders ADD COLUMN display_order INTEGER DEFAULT 0;
```
Then update mutations to use it.

---

#### moveFolderAcrossSectionsMutation
**Purpose**: Move folder between sections (above/below separator)

**Usage**:
```typescript
const { moveFolderAcrossSectionsMutation } = useProjectFolderDragDrop(projectId);

moveFolderAcrossSectionsMutation.mutate({
  folderId: 'folder-uuid',
  newParentId: null,
  newIndex: 2
});
```

**Parameters**:
```typescript
{
  folderId: string           // UUID of folder being moved
  newParentId: string | null // New parent folder
  newIndex: number           // New position
}
```

**Behavior**:
- Updates `parent_folder_id` to move between sections
- Updates separator position if crossing boundary
- Invalidates cache
- Shows error toast on failure

---

#### batchUpdateFoldersMutation
**Purpose**: Update multiple folders in one operation

**Usage**:
```typescript
const { batchUpdateFoldersMutation } = useProjectFolderDragDrop(projectId);

batchUpdateFoldersMutation.mutate({
  updates: [
    { id: 'folder-1', parentFolderId: null },
    { id: 'folder-2', parentFolderId: 'folder-parent' },
    { id: 'folder-3', parentFolderId: null }
  ]
});
```

**Parameters**:
```typescript
{
  updates: Array<{
    id: string                // Folder UUID
    parentFolderId: string | null // New parent folder
  }>
}
```

**Behavior**:
- Sends individual update queries (can be optimized)
- All-or-nothing: if any fails, all fail (with error)
- Invalidates folder cache once
- Shows error toast with count of failed updates

---

## Query Keys

All queries use React Query's key system for caching:

```typescript
projectFilesKeys = {
  all: ['project-files'],
  folders: (projectId) => [...projectFilesKeys.all, 'folders', projectId],
  files: (projectId) => [...projectFilesKeys.all, 'files', projectId],
}
```

**Example Cache Invalidation**:
```typescript
// Invalidate all files for a project
queryClient.invalidateQueries({ 
  queryKey: projectFilesKeys.files(projectId) 
})

// Invalidate all project-files queries
queryClient.invalidateQueries({ 
  queryKey: projectFilesKeys.all 
})
```

---

## Error Handling

### Default Error Behavior
All mutations automatically:
1. Show error toast with mutation context
2. Log error to console (development)
3. Revert optimistic UI updates
4. Trigger cache invalidation

### Custom Error Handling
```typescript
const moveFile = useMoveProjectFile(projectId);

moveFile.mutate(
  { fileId, newFolderId },
  {
    onError: (error: Error) => {
      if (error.message.includes('not authenticated')) {
        // Handle auth error
      } else if (error.message.includes('folder not found')) {
        // Handle validation error
      } else {
        // Handle generic error
      }
    }
  }
);
```

### Toast Notifications
```typescript
// Success
toast({
  title: 'Success',
  description: 'File moved successfully'
})

// Error
toast({
  title: 'Error',
  description: 'Failed to move file: Folder not found',
  variant: 'destructive'
})
```

---

## Common Patterns

### Moving File Between Folders
```typescript
const moveFile = useMoveProjectFile(projectId);

const handleFileMove = (fileId: string, targetFolderId: string) => {
  moveFile.mutate({
    fileId,
    newFolderId: targetFolderId
  });
};
```

### Renaming with Validation
```typescript
const renameFile = useRenameProjectFile(projectId);

const handleRename = (fileId: string, newName: string) => {
  const trimmed = newName.trim();
  const file = files.find(f => f.id === fileId);
  
  // Validation
  if (!trimmed) {
    toast({ title: 'Error', description: 'Name cannot be empty' });
    return;
  }
  
  if (trimmed === file?.filename) {
    return; // No change needed
  }
  
  // Check for duplicates in same folder
  const duplicate = files.some(
    f => f.folder_id === file?.folder_id && f.filename === trimmed
  );
  
  if (duplicate) {
    toast({ title: 'Error', description: 'File already exists' });
    return;
  }
  
  renameFile.mutate({ fileId, newName: trimmed });
};
```

### Batch Folder Organization
```typescript
const { batchUpdateFoldersMutation } = useProjectFolderDragDrop(projectId);

const organizeByType = (folders: Folder[], files: ProjectFile[]) => {
  // Group files by type
  const design = files.filter(f => f.mimetype?.includes('image'));
  const documents = files.filter(f => f.mimetype?.includes('pdf'));
  
  // Create target folders
  const designFolderId = folders.find(f => f.name === 'Design')?.id;
  const docsFolderId = folders.find(f => f.name === 'Documents')?.id;
  
  // Move files
  design.forEach(file => {
    moveFile.mutate({ fileId: file.id, newFolderId: designFolderId });
  });
  
  documents.forEach(file => {
    moveFile.mutate({ fileId: file.id, newFolderId: docsFolderId });
  });
};
```

---

## Performance Considerations

### Optimistic Updates
Keep UI responsive by updating state before server confirmation:
```typescript
// Good: Update UI immediately
setLocalLists(prev => ({
  ...prev,
  [fromFolder]: prev[fromFolder].filter(f => f.id !== fileId)
}));

// Then mutate (background)
moveFile.mutate({ fileId, newFolderId });
```

### Cache Invalidation
Avoid unnecessary re-fetches:
```typescript
// Only invalidate specific query key
queryClient.invalidateQueries({
  queryKey: projectFilesKeys.files(projectId)
})

// NOT this (invalidates everything):
queryClient.invalidateQueries({})
```

### Debouncing
For rapid operations, consider debouncing mutations:
```typescript
const debouncedRename = useCallback(
  debounce((folderId, name) => {
    renameFolder.mutate({ folderId, newName: name });
  }, 500),
  [renameFolder]
);
```

---

## TypeScript Definitions

**Complete Hook Type Definitions**:
```typescript
// useProjectFiles
export const useProjectFolders: (projectId: string) => 
  UseQueryResult<Folder[], Error>

export const useProjectFiles: (projectId: string) => 
  UseQueryResult<ProjectFile[], Error>

export const useMoveProjectFile: (projectId: string) => 
  UseMutationResult<void, Error, { fileId: string; newFolderId: string }>

export const useRenameFolder: (projectId: string) => 
  UseMutationResult<void, Error, { folderId: string; newName: string }>

export const useRenameProjectFile: (projectId: string) => 
  UseMutationResult<void, Error, { fileId: string; newName: string }>

// useProjectFolderDragDrop
export const useProjectFolderDragDrop: (projectId: string) => {
  reorderFoldersMutation: UseMutationResult<...>
  moveFolderAcrossSectionsMutation: UseMutationResult<...>
  batchUpdateFoldersMutation: UseMutationResult<...>
}
```

---

## Debugging

### Enable Mutation Logging
```typescript
import { UseMutationOptions } from '@tanstack/react-query';

const moveFile = useMoveProjectFile(projectId);

moveFile.mutate(
  { fileId, newFolderId },
  {
    onMutate: (data) => console.log('Mutate:', data),
    onSuccess: () => console.log('Success'),
    onError: (err) => console.error('Error:', err),
  }
);
```

### Check Cache State
```typescript
// In browser console:
import { useQueryClient } from '@tanstack/react-query';
const queryClient = useQueryClient();
console.log(queryClient.getQueryData(['project-files', 'files', projectId]));
```

### Network Inspection
- Open DevTools → Network tab
- Look for Supabase requests (*.supabase.co)
- Check request/response payloads
- Verify authentication headers

---

## Migration Guide

If upgrading from previous version:

1. **Update Hooks Import**:
```typescript
// Before
import { useDeleteProjectFile } from '...'

// After
import { 
  useDeleteProjectFile,
  useMoveProjectFile,
  useRenameFolder,
  useRenameProjectFile
} from '...'
```

2. **Add New Hook Import**:
```typescript
import { useProjectFolderDragDrop } from '@/lib/api/hooks/useProjectFolderDragDrop'
```

3. **Update Component Props** (if needed):
```typescript
// No breaking changes - all new mutations optional
```

4. **Test Coverage**:
- File movement between folders
- Folder reordering
- Inline rename operations
- Error handling (offline, permissions)

