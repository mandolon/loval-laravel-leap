# Drag-and-Drop Implementation Testing Guide

## Overview
The drag-and-drop system has been implemented for the Project Files panel with the following features:
- **Folder reordering** within and across sections
- **Separator-based partitioning** of folders (above/below)
- **File movement** between folders
- **Inline renaming** with database persistence
- **Optimistic UI updates** with database synchronization

## Component Structure

### ProjectPanel.tsx
- **Tabs**: Files, Whiteboards, Info, Settings
- **Files Tab Features**:
  - Tree view with folders (sections) and files (items)
  - Separator line dividing folders into "above" and "below" sections
  - Search filtering with auto-expand
  - Context menu for rename/delete/create operations
  - Drag-and-drop for folders and files

### useProjectFiles.ts (Hooks)
Database mutations and queries:
- `useProjectFolders()` - Fetch all folders for a project
- `useProjectFiles()` - Fetch all files for a project
- `useMoveProjectFile()` - Move file to different folder
- `useRenameFolder()` - Rename a folder
- `useRenameProjectFile()` - Rename a file
- `useDeleteProjectFile()` - Soft delete file
- `useDeleteFolder()` - Soft delete folder

### useProjectFolderDragDrop.ts (New Hook)
Specialized drag-and-drop mutations:
- `reorderFoldersMutation` - Update folder position
- `moveFolderAcrossSectionsMutation` - Move folder between sections
- `batchUpdateFoldersMutation` - Update multiple folders

## Testing Scenarios

### Test 1: Basic Folder Drag-and-Drop Within Section
**Steps**:
1. Open a project with multiple folders
2. Drag Folder A above Folder B within the same section
3. Release and observe the visual reordering

**Expected Results**:
- ✅ Folder A moves visually above Folder B
- ✅ Blue drop indicator shows above Folder B during drag
- ✅ Database updates reflect new order
- ✅ No toast error appears

---

### Test 2: Folder Movement Across Separator
**Steps**:
1. Folder A is above the separator, Folder B is below
2. Drag Folder A below the separator to where Folder B is
3. Release the drag

**Expected Results**:
- ✅ Folder A moves below the separator
- ✅ Separator position adjusts if needed
- ✅ Drop indicator shows correct position
- ✅ Database reflects the change

---

### Test 3: Separator Dragging
**Steps**:
1. Position mouse over the separator line
2. Cursor should change to `ns-resize` (north-south resize)
3. Click and drag the separator upward or downward
4. Release

**Expected Results**:
- ✅ Separator line highlights (thicker, blue)
- ✅ "Separator" label appears during drag
- ✅ New separator position is saved to localStorage
- ✅ Folders above/below separator are correctly partitioned
- ✅ On page refresh, separator position persists

---

### Test 4: File Movement Between Folders
**Steps**:
1. Expand two folders (e.g., "Design" and "Documents")
2. Drag File X from "Design" to "Documents"
3. Release

**Expected Results**:
- ✅ File X moves from "Design" to "Documents"
- ✅ Blue drop indicator shows above/below target file
- ✅ `moveFile` mutation triggers
- ✅ Database `folder_id` updates for the file

---

### Test 5: Search Filtering with Drag-and-Drop
**Steps**:
1. Type "design" in the search box
2. Folders containing matching files auto-expand
3. Drag a file from one folder to another
4. Clear search

**Expected Results**:
- ✅ Filtered folders remain expanded during search
- ✅ Drag-and-drop works within filtered results
- ✅ On clear, folder expand/collapse state is restored

---

### Test 6: Inline Rename - Folder
**Steps**:
1. Right-click on a folder
2. Click "Rename" in context menu
3. Type a new name (e.g., "New Design Folder")
4. Press Enter

**Expected Results**:
- ✅ Input field appears with text selected
- ✅ On Enter, folder renames and saves to database
- ✅ On Escape, rename is cancelled
- ✅ Folder expand/collapse still works during rename

---

### Test 7: Inline Rename - File
**Steps**:
1. Right-click on a file
2. Click "Rename" in context menu
3. Type a new name (e.g., "layout-v2.pdf")
4. Press Enter

**Expected Results**:
- ✅ Input field appears with filename selected
- ✅ On Enter, file renames and saves to database
- ✅ On Escape, rename is cancelled
- ✅ File selection is not affected

---

### Test 8: Delete Operations
**Steps**:
1. Right-click on a file → Click "Delete"
2. Verify success toast appears

**Alternative**:
1. Right-click on a folder → Click "Delete"
2. Verify folder is soft-deleted in database

**Expected Results**:
- ✅ Success toast: "File moved to trash"
- ✅ Item disappears from UI
- ✅ Database `deleted_at` is set
- ✅ `deleted_by` user ID is recorded

---

### Test 9: Create New Folder
**Steps**:
1. Right-click in the Files panel background
2. Click "New Folder…"
3. Type folder name (e.g., "Archive")
4. Press Enter

**Expected Results**:
- ✅ New folder appears in the tree
- ✅ Folder is created in database
- ✅ Folder is added above separator by default
- ✅ Inline editing is active

---

### Test 10: Context Menu - New Folder in Section
**Steps**:
1. Right-click on a folder header
2. Click "New Folder…"
3. Name it (e.g., "Q1-2024")
4. Press Enter

**Expected Results**:
- ✅ New folder is added at the top of the list
- ✅ Editing mode is active
- ✅ Folder inherits parent context if applicable

---

### Test 11: Folder Order Persistence
**Steps**:
1. Create 3 folders: A, B, C
2. Drag them to order: C, A, B
3. Refresh the page (F5)
4. Wait for data to load

**Expected Results**:
- ✅ Folder order persists as C, A, B
- ✅ Separator position is restored
- ✅ No database queries are repeated unnecessarily

---

### Test 12: Concurrent Operations
**Steps**:
1. Drag Folder A while a delete mutation is pending
2. Drag File X before rename completes
3. Observe UI behavior

**Expected Results**:
- ✅ Optimistic updates show immediately
- ✅ No duplicate mutations are sent
- ✅ Errors are gracefully handled with toast
- ✅ UI reverts on error

---

## Key Implementation Details

### Local vs. Database State
- **Local State** (React): Immediate visual feedback
- **Database** (Supabase): Persisted state
- **Flow**: User action → Optimistic UI update → API call → Database update

### Folder Partitioning
- **Above Separator** (Business folders, Active projects)
- **Separator Line** (Draggable divider)
- **Below Separator** (Archive, Templates)
- **localStorage Key**: `project-folders-arrangement-{projectId}`

### Drag Indicators
- **Item Drag**: Thin line above/below target
- **Section Drag**: Thicker line with blue accent
- **Separator Drag**: Full-height highlight + label

### Error Handling
- All mutations include error toast notifications
- Failed operations log to console in development
- Optimistic UI updates revert on error
- Query cache invalidation triggers fresh data fetch

---

## Debugging Tips

### Console Logs
- Set breakpoints in mutation handlers
- Check `reorderFoldersMutation.mutate()` calls
- Verify database updates in Supabase dashboard

### Network Tab
- Monitor API requests to Supabase
- Check for failed mutations (HTTP 4xx/5xx)
- Inspect request/response payloads

### React DevTools
- Check `ProjectPanel` component state
- Inspect `localSections`, `localLists` arrays
- Monitor `dragState`, `dragOverState`

### Database Verification
```sql
SELECT id, name, parent_folder_id, created_at, updated_at
FROM folders
WHERE project_id = '{projectId}'
ORDER BY updated_at DESC
LIMIT 20;
```

---

## Known Limitations

1. **Nested Folders**: Currently not supported in UI (folders can have parent_folder_id but UI treats them flat)
2. **Bulk Operations**: Delete multiple folders at once not implemented
3. **Drag Between Projects**: Not applicable (project-specific UI)
4. **Keyboard Shortcuts**: Rename via keyboard shortcut not implemented

---

## Future Enhancements

1. Add `display_order` column to `folders` table for explicit ordering
2. Support nested folder hierarchies in UI
3. Batch update optimizations for large folder reorganizations
4. Undo/Redo for drag-and-drop operations
5. Drag files directly to new folder creation
6. Multi-select drag for batch operations

---

## Browser Compatibility

- ✅ Chrome/Chromium (v90+)
- ✅ Firefox (v88+)
- ✅ Safari (v14+)
- ✅ Edge (v90+)

## Performance Considerations

- **Throttling**: Separator drag uses direct DOM queries (optimized)
- **Debouncing**: None needed for drag-and-drop
- **Query Caching**: React Query handles invalidation
- **Render Optimization**: useCallback prevents handler recreation

