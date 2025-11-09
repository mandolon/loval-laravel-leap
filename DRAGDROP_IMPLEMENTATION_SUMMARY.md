# Drag-and-Drop Implementation Summary

## What Was Implemented

### 1. **New Hook: useProjectFolderDragDrop** (`src/lib/api/hooks/useProjectFolderDragDrop.ts`)
A dedicated hook for managing folder drag-and-drop operations with three mutations:

```typescript
// Reorder folders within a section
reorderFoldersMutation.mutate({
  folderId: string,
  newIndex: number,
  parentFolderId: string | null
})

// Move folders across sections
moveFolderAcrossSectionsMutation.mutate({
  folderId: string,
  newParentId: string | null,
  newIndex: number
})

// Batch update multiple folders
batchUpdateFoldersMutation.mutate({
  updates: Array<{ id: string; parentFolderId: string | null }>
})
```

**Features**:
- Automatic query cache invalidation
- Toast notifications for success/error
- Proper error handling and logging
- Optimistic UI updates support

---

### 2. **Enhanced useProjectFiles Hook** (`src/lib/api/hooks/useProjectFiles.ts`)
Added four new mutations for file and folder operations:

#### `useMoveProjectFile(projectId)`
Move a file to a different folder. Used when dragging files between folders.
```typescript
moveFile.mutate({
  fileId: string,
  newFolderId: string
})
```

#### `useRenameFolder(projectId)`
Rename a folder with database persistence.
```typescript
renameFolder.mutate({
  folderId: string,
  newName: string
})
```

#### `useRenameProjectFile(projectId)`
Rename a file with database persistence.
```typescript
renameFile.mutate({
  fileId: string,
  newName: string
})
```

**Features**:
- All mutations trigger React Query cache invalidation
- Error toast with descriptive messages
- Preserves file metadata (filesize, mimetype, etc.)
- Updates `updated_at` timestamp

---

### 3. **Updated ProjectPanel Component** (`src/apps/team/components/ProjectPanel.tsx`)

#### Import Changes
```typescript
import { 
  useMoveProjectFile, 
  useRenameFolder, 
  useRenameProjectFile 
} from '@/lib/api/hooks/useProjectFiles';
import { useProjectFolderDragDrop } 
  from '@/lib/api/hooks/useProjectFolderDragDrop';
```

#### Hook Initialization
```typescript
const moveFile = useMoveProjectFile(projectId);
const renameFolder = useRenameFolder(projectId);
const renameFile = useRenameProjectFile(projectId);
const { 
  reorderFoldersMutation, 
  moveFolderAcrossSectionsMutation, 
  batchUpdateFoldersMutation 
} = useProjectFolderDragDrop(projectId);
```

#### Enhanced Handlers

**File Drag-and-Drop** (`handleItemDrop`):
- Optimistic UI update when dropping
- Calls `moveFile.mutate()` when moving to different folder
- Supports inter-folder movement

**Folder Drag-and-Drop** (`handleSectionDrop`):
- Calls `reorderFoldersMutation.mutate()` to persist order
- Updates separator position intelligently
- Maintains relative positioning when crossing separator

**Inline Rename - Folders** (`SectionHeader.onCommitEdit`):
- Validates trimmed name before update
- Calls `renameFolder.mutate()` with new name
- Updates UI optimistically

**Inline Rename - Files** (`ItemRow.onCommitEdit`):
- Validates trimmed filename before update
- Calls `renameFile.mutate()` with new name
- Updates UI optimistically

---

## Architecture Diagram

```
User Action (Drag/Drop/Rename)
        ↓
    ProjectPanel.tsx
    (Local State Update)
        ↓
    Mutation Hook (useProjectFiles/useProjectFolderDragDrop)
        ↓
    Supabase API Call
        ↓
    Database Update
        ↓
    React Query Cache Invalidation
        ↓
    Automatic Re-fetch & UI Sync
```

---

## Data Flow Examples

### Example 1: Dragging File to Different Folder

```
1. User drags file.pdf from "Documents" folder to "Design" folder
2. handleItemDrop() called with:
   - listId: "design-folder-id"
   - itemId: "file-id"
   - dragState.fromList: "documents-folder-id"

3. Optimistic UI Update:
   - localLists["documents-folder-id"].filter(item => item.id !== "file-id")
   - localLists["design-folder-id"].push(file)

4. Mutation Triggered:
   - moveFile.mutate({
       fileId: "file-id",
       newFolderId: "design-folder-id"
     })

5. Database Update:
   UPDATE files
   SET folder_id = "design-folder-id", updated_at = NOW()
   WHERE id = "file-id"

6. Query Invalidation:
   - Invalidates projectFilesKeys.files(projectId)
   - Triggers re-fetch of all files
   - UI remains consistent
```

### Example 2: Reordering Folders

```
1. User drags "Archive" folder above "Active" folder
2. handleSectionDrop() called with:
   - dragIndex: 1 (Archive's current position)
   - sectionDropIndex: 0 (target position)

3. Optimistic UI Update:
   - Removes folder from index 1
   - Inserts at index 0
   - Adjusts separator if needed

4. Mutation Triggered:
   - reorderFoldersMutation.mutate({
       folderId: "archive-folder-id",
       newIndex: 0,
       parentFolderId: null
     })

5. Database Update:
   UPDATE folders
   SET updated_at = NOW()
   WHERE id = "archive-folder-id"
   (Note: Actual ordering would use display_order column if added)

6. localStorage Update:
   - Saves folder arrangement for persistence
   - Key: "project-folders-arrangement-{projectId}"
```

### Example 3: Renaming a File

```
1. User right-clicks on "logo.png" → "Rename"
2. onCommitEdit("new-logo.png") called

3. Validation:
   - trimmedName = "new-logo.png"
   - Check: trimmedName !== "logo.png" ✓

4. Mutation Triggered:
   - renameFile.mutate({
       fileId: "file-123",
       newName: "new-logo.png"
     })

5. Database Update:
   UPDATE files
   SET filename = "new-logo.png", updated_at = NOW()
   WHERE id = "file-123"

6. Query Invalidation:
   - Invalidates projectFilesKeys.files(projectId)
   - Triggers automatic re-fetch

7. UI Update:
   - localLists updates reflect new name
   - Component re-renders with new filename
```

---

## State Management

### Component State
```typescript
// Local folder/file structure (cached from database)
const [localSections, setLocalSections] = useState([])
const [localLists, setLocalLists] = useState({})

// Drag-and-drop state
const [dragState, setDragState] = useState(null)      // Current drag operation
const [dragOverState, setDragOverState] = useState(null) // Drop target
const [sectionDragId, setSectionDragId] = useState(null) // Dragged folder ID

// Separator state
const [separatorIndex, setSeparatorIndex] = useState(-1)  // Divider position
const [separatorDragging, setSeparatorDragging] = useState(false)

// Editing state
const [editing, setEditing] = useState(null)          // Rename mode
const [expanded, setExpanded] = useState({})          // Open/closed folders
```

### Database State
```typescript
-- folders table
id            | UUID
project_id    | UUID (FK)
name          | STRING
parent_folder_id | UUID (nullable, for nesting)
is_system_folder | BOOLEAN
created_at    | TIMESTAMP
updated_at    | TIMESTAMP (updated by mutations)

-- files table
id            | UUID
project_id    | UUID (FK)
folder_id     | UUID (FK to folders)
filename      | STRING
storage_path  | STRING
filesize      | NUMBER
mimetype      | STRING
updated_at    | TIMESTAMP (updated by mutations)
```

---

## Performance Optimizations

### 1. **Optimistic Updates**
- UI updates immediately on user action
- Database update happens in background
- Errors revert UI to previous state

### 2. **Query Cache Invalidation**
- Uses React Query's `queryClient.invalidateQueries()`
- Only invalidates relevant query keys
- Prevents unnecessary re-fetches

### 3. **Memoization**
- `useCallback` for drag handlers (prevents recreation)
- `useMemo` for filtered items and visible sections

### 4. **Separator Persistence**
- localStorage caches separator position
- Avoids recalculating on every page load
- Falls back to center position if not found

---

## Error Handling

### Toast Notifications
```typescript
// On Success
toast({
  title: 'Success',
  description: 'File moved successfully'
})

// On Error
toast({
  title: 'Error',
  description: `Failed to move file: ${error.message}`,
  variant: 'destructive'
})
```

### Error Recovery
1. Failed mutation doesn't modify local state
2. User sees error toast with context
3. Can retry operation immediately
4. Cache invalidation triggers fresh data fetch

---

## Integration Points

### With Existing Features
- **Search**: Filtering works with drag-and-drop
- **Context Menu**: Rename/Delete integrated with mutations
- **File Selection**: Selected file persists during operations
- **Auto-expand**: Folders expand when search matches files

### With Database
- All operations use Supabase RLS policies
- Mutations respect user authentication
- Timestamp tracking for audit trails

---

## Testing Checklist

- [ ] Folder drag-and-drop within section
- [ ] File drag-and-drop between folders
- [ ] Separator dragging and persistence
- [ ] Inline rename for folders
- [ ] Inline rename for files
- [ ] Delete operations (soft delete)
- [ ] Create new folder
- [ ] Search filtering with drag-drop
- [ ] Error handling (e.g., offline)
- [ ] Page refresh persistence

---

## Migration Notes

If you have existing folder/file data:
1. Ensure `parent_folder_id` is set for all folders
2. Verify `folder_id` references are valid for all files
3. Run any pending migrations from Supabase schema
4. Clear browser localStorage if separator position conflicts

---

## Future Enhancements

1. **Nested Folders**: Add UI support for folder hierarchies
2. **Display Order**: Add `display_order` column for persistent ordering
3. **Batch Operations**: Multi-select drag-and-drop
4. **Undo/Redo**: Operation history
5. **Keyboard Shortcuts**: Quick rename/delete
6. **Drag Animation**: Smooth transitions for better UX

