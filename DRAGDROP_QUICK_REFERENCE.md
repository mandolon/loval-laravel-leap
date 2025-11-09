# Drag-and-Drop Quick Reference Guide

## At a Glance

The project file management system now supports full drag-and-drop with database persistence.

---

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/api/hooks/useProjectFolderDragDrop.ts` | Folder drag-drop mutations |
| `src/lib/api/hooks/useProjectFiles.ts` | File/folder CRUD mutations |
| `src/apps/team/components/ProjectPanel.tsx` | Main UI component |

---

## Quick Code Examples

### Move File Between Folders
```typescript
const moveFile = useMoveProjectFile(projectId);

moveFile.mutate({
  fileId: 'file-uuid',
  newFolderId: 'target-folder-uuid'
});
```

### Rename Folder
```typescript
const renameFolder = useRenameFolder(projectId);

renameFolder.mutate({
  folderId: 'folder-uuid',
  newName: 'New Folder Name'
});
```

### Reorder Folders
```typescript
const { reorderFoldersMutation } = useProjectFolderDragDrop(projectId);

reorderFoldersMutation.mutate({
  folderId: 'folder-uuid',
  newIndex: 0,
  parentFolderId: null
});
```

### Rename File
```typescript
const renameFile = useRenameProjectFile(projectId);

renameFile.mutate({
  fileId: 'file-uuid',
  newName: 'new-filename.pdf'
});
```

### Delete File/Folder
```typescript
const deleteFile = useDeleteProjectFile(projectId);
const deleteFolder = useDeleteFolder(projectId);

deleteFile.mutate({ fileId: 'id', projectId: 'id' });
deleteFolder.mutate({ folderId: 'id', projectId: 'id' });
```

---

## Features Implemented

| Feature | Status | Hook/Mutation |
|---------|--------|---------------|
| Drag folders to reorder | ✅ | `reorderFoldersMutation` |
| Drag files between folders | ✅ | `moveFile` |
| Drag separator to partition | ✅ | localStorage |
| Inline rename folder | ✅ | `renameFolder` |
| Inline rename file | ✅ | `renameFile` |
| Delete file/folder | ✅ | `deleteFile`/`deleteFolder` |
| Create new folder | ✅ | `useCreateFolder` (existing) |
| Search filtering | ✅ | Component logic |

---

## Mutation Return Types

All mutations return:
```typescript
{
  mutate: (variables) => void
  mutateAsync: (variables) => Promise<void>
  isLoading: boolean
  isError: boolean
  error: Error | null
  status: 'idle' | 'pending' | 'success' | 'error'
}
```

---

## Error Handling

### Default Behavior
All mutations automatically show error toast:
```
Error
Failed to move file: Folder not found
```

### Custom Error Handling
```typescript
moveFile.mutate(
  { fileId, newFolderId },
  {
    onError: (error) => console.error('Custom:', error),
    onSuccess: () => console.log('Done!')
  }
);
```

---

## State Management

### Local State (Component)
```typescript
const [localSections, setLocalSections] = useState([])  // Folders
const [localLists, setLocalLists] = useState({})         // Files per folder
const [dragState, setDragState] = useState(null)         // Drag context
const [separatorIndex, setSeparatorIndex] = useState(-1) // Partition
const [editing, setEditing] = useState(null)             // Rename mode
```

### Remote State (Database)
```
folders → name, parent_folder_id, updated_at
files → filename, folder_id, updated_at
```

---

## Common Patterns

### Drag Between Folders
```typescript
// Drop handler for files
handleItemDrop = (targetFolderId, fileId) => {
  moveFile.mutate({ fileId, newFolderId: targetFolderId })
}
```

### Rename with Validation
```typescript
const handleRename = (itemId, newName) => {
  if (!newName.trim()) return; // Validate
  
  renameFile.mutate({
    fileId: itemId,
    newName: newName.trim()
  });
};
```

### Delete with Confirmation
```typescript
const handleDelete = (fileId) => {
  if (confirm('Delete this file?')) {
    deleteFile.mutate({ fileId, projectId })
  }
}
```

---

## UI Components

### SectionHeader (Folder)
- Displays folder name
- Toggle expand/collapse
- Context menu (Rename, Delete, New Folder)
- Draggable for reordering

### ItemRow (File)
- Displays filename
- Drag to move between folders
- Context menu (Rename, Delete)
- Selection highlight

### SeparatorLine
- Visual divider between folder sections
- Draggable (mouse-based)
- Persists to localStorage

---

## Database Query Keys

```typescript
projectFilesKeys = {
  all: ['project-files'],
  folders: (projectId) => [..., 'folders', projectId],
  files: (projectId) => [..., 'files', projectId],
}
```

### Invalidation
```typescript
// After mutation, these keys auto-invalidate:
- Folder mutations → projectFilesKeys.folders(projectId)
- File mutations → projectFilesKeys.files(projectId)
```

---

## Browser Storage

### localStorage Key
```
project-folders-arrangement-{projectId}
```

### Content
```json
{
  "order": ["folder-id-1", "folder-id-2", "folder-id-3"],
  "separatorIndex": 1
}
```

---

## Testing Scenarios

### Basic Operations
- [ ] Drag folder A above folder B
- [ ] Drag file X from folder A to folder B
- [ ] Right-click folder → Rename → Enter
- [ ] Right-click file → Rename → Escape
- [ ] Delete folder (soft delete)

### Separator
- [ ] Drag separator line up
- [ ] Drag separator line down
- [ ] Refresh page → Position persists
- [ ] Clear localStorage → Reset to center

### Edge Cases
- [ ] Drag file to same folder (no-op)
- [ ] Rename with same name (no-op)
- [ ] Move file to deleted folder (error)
- [ ] Offline → Try mutation → Error toast

---

## Debugging Commands

### Check Cache
```typescript
import { useQueryClient } from '@tanstack/react-query';
const qc = useQueryClient();
console.log(qc.getQueryData(['project-files', 'files', projectId]));
```

### Invalidate Cache
```typescript
queryClient.invalidateQueries({
  queryKey: projectFilesKeys.files(projectId)
});
```

### Clear localStorage
```typescript
localStorage.removeItem(`project-folders-arrangement-${projectId}`);
```

### Check Mutations Status
```typescript
console.log(moveFile.isLoading, moveFile.error, moveFile.status);
```

---

## Performance Tips

### ✅ DO
- Use optimistic updates for immediate feedback
- Cache queries with React Query
- Debounce rapid operations
- Validate before sending mutation

### ❌ DON'T
- Invalidate all queries (`{}`)
- Make synchronous calls in render
- Rename without trimming
- Send duplicate mutations

---

## Troubleshooting Quick Fixes

| Problem | Solution |
|---------|----------|
| File won't move | Check folder_id in DB, verify permissions |
| Rename doesn't save | Check browser console for errors |
| Separator resets | Enable localStorage, check privacy mode |
| Drag feedback missing | Check CSS z-index, browser zoom |
| Error toast not showing | Verify useToast() hook is available |

---

## Related Documentation

📘 **Full API Reference**: `DRAGDROP_API_DOCUMENTATION.md`  
📋 **Testing Guide**: `DRAGDROP_TESTING_GUIDE.md`  
📚 **Implementation Details**: `DRAGDROP_IMPLEMENTATION_SUMMARY.md`  
📖 **Complete README**: `DRAGDROP_README.md`  

---

## What's Next?

### Immediate
1. Run test scenarios from testing guide
2. Verify mutations work in your environment
3. Test error cases (network errors, permissions)

### Short-term
1. Add more elaborate test cases
2. Performance profiling
3. Accessibility audit

### Long-term
1. Nested folder UI support
2. Persistent folder ordering (display_order column)
3. Multi-select drag-and-drop
4. Undo/Redo functionality

---

## Help & Support

**For questions about**:
- **API Usage** → See `DRAGDROP_API_DOCUMENTATION.md`
- **Testing** → See `DRAGDROP_TESTING_GUIDE.md`
- **Architecture** → See `DRAGDROP_IMPLEMENTATION_SUMMARY.md`
- **Getting Started** → See `DRAGDROP_README.md`

