# Active Projects Database Integration

## Summary
Successfully wired the Active Projects panel in the Team Home Page to the database schema with full CRUD functionality.

## Implementation Date
December 2024

## Features Implemented

### ✅ Database Integration
- **Projects**: Fetches all active projects from `projects` table filtered by `status = 'active'`
- **Workspace Settings**: Uses `workspace_settings.metadata` JSONB column to store:
  - Project order (priority sorting)
  - Project todos (per-project task lists)

### ✅ Project Display
- Shows all active projects for current workspace
- Displays project name (street address if available, falls back to project name)
- Shows current phase: Pre-Design, Design, Permit, Build
- Displays next milestone (first incomplete todo)
- Loading skeleton while fetching data
- Empty state message when no active projects exist

### ✅ Phase Management
- Click on colored phase badge to open popover
- Toggle between 4 phases: Pre-Design → Design → Permit → Build
- Updates persist to database via `useUpdateProject` mutation
- Real-time UI updates using React Query cache invalidation

### ✅ Todo List Management
- Click "Next Milestone" button to open focus list popover
- Add new todos with inline editing
- Toggle completion status (checkbox)
- Edit todo text inline
- Delete individual todos
- Drag to reorder todos (vertical only)
- All changes auto-save to `workspace_settings.metadata`
- First incomplete todo becomes the "Next Milestone" label

### ✅ Drag & Drop Reordering
- **Vertical-only dragging** using `verticalListSortingStrategy`
- **Priority mode only**: Drag handle disabled in Status/Started sort modes
- Reorder saves to `workspace_settings.metadata.projectOrder`
- Smooth drag overlay with shadow effect
- 8px activation threshold to prevent accidental drags

### ✅ Sort Options
1. **Priority** (default): User-defined order via drag & drop
2. **Status**: Sorts by phase (Pre-Design → Design → Permit → Build)
3. **Started**: Sorts by `createdAt` date ascending

## Technical Architecture

### Component Structure
```
src/apps/team/components/projects/
├── ActiveProjectsList.tsx       # Main container (database-connected)
├── SortableProjectRow.tsx      # Individual project row
├── SortableTodoItem.tsx        # Individual todo item
├── FocusListPanel.tsx          # Floating popover for todos
├── SortDropdown.tsx            # Sort mode selector
├── types.ts                    # TypeScript interfaces
└── index.ts                    # Barrel exports
```

### Data Flow

#### 1. Fetching Projects
```typescript
const { data: dbProjects } = useProjects(workspaceId);
const activeProjects = dbProjects.filter(p => p.status === 'active');
```

#### 2. Loading Project Order
```typescript
const metadata = workspaceSettings?.metadata as WorkspaceMetadata;
const projectOrder = metadata.projectOrder?.projectIds || [];
```

#### 3. Loading Todos
```typescript
const projectTodos = metadata.projectTodos?.[projectId]?.todos || [];
```

#### 4. Updating Phase
```typescript
updateProjectMutation.mutate({
  id: projectId,
  input: { phase: 'Design' }
});
```

#### 5. Saving Project Order
```typescript
const updatedMetadata = {
  ...metadata,
  projectOrder: {
    projectIds: newOrder,
    lastUpdated: new Date().toISOString()
  }
};

updateSettingsMutation.mutate({
  workspaceId,
  input: { metadata: updatedMetadata }
});
```

#### 6. Saving Todos
```typescript
const updatedMetadata = {
  ...metadata,
  projectTodos: {
    ...currentTodos,
    [projectId]: {
      todos: [...updatedTodos],
      lastUpdated: new Date().toISOString()
    }
  }
};

updateSettingsMutation.mutate({
  workspaceId,
  input: { metadata: updatedMetadata }
});
```

### Database Schema

#### projects table
```sql
- id (uuid, primary key)
- workspace_id (uuid, foreign key)
- name (text)
- phase (enum: 'Pre-Design', 'Design', 'Permit', 'Build')
- status (enum: 'pending', 'active', 'completed', 'archived')
- address (jsonb)
- created_at (timestamp)
```

#### workspace_settings table
```sql
- id (uuid, primary key)
- workspace_id (uuid, foreign key)
- metadata (jsonb)
```

#### metadata structure
```typescript
{
  projectOrder: {
    projectIds: string[];      // Ordered array of project IDs
    lastUpdated: string;       // ISO timestamp
  },
  projectTodos: {
    [projectId: string]: {
      todos: Array<{
        id: string;
        text: string;
        completed: boolean;
        createdAt: string;
      }>;
      lastUpdated: string;
    }
  }
}
```

### API Hooks Used

#### useProjects(workspaceId)
- **Source**: `@/lib/api/hooks/useProjects`
- **Returns**: `{ data: Project[], isLoading: boolean }`
- **Purpose**: Fetches all projects for workspace

#### useUpdateProject(workspaceId)
- **Source**: `@/lib/api/hooks/useProjects`
- **Returns**: Mutation function
- **Purpose**: Updates project fields (phase, status, etc.)

#### useWorkspaceSettings(workspaceId)
- **Source**: `@/lib/api/hooks/useWorkspaceSettings`
- **Returns**: `{ data: WorkspaceSettings }`
- **Purpose**: Fetches workspace settings including metadata

#### useUpdateWorkspaceSettings()
- **Source**: `@/lib/api/hooks/useWorkspaceSettings`
- **Returns**: Mutation function
- **Purpose**: Updates workspace settings metadata

### React Query Integration
- All mutations automatically invalidate relevant query caches
- UI updates instantly via optimistic updates
- Error handling with toast notifications
- Automatic retry on network failures

## User Experience

### Loading States
- Skeleton loader while projects fetch: "Loading projects..."
- Smooth transitions on data updates
- No flash of empty content

### Empty States
- "No active projects" message when no projects match filter
- Clear call-to-action (future: add "Create Project" button)

### Error Handling
- Toast notifications on mutation failures
- Failed updates revert to previous state
- Network errors retry automatically

### Performance
- Debounced metadata updates (no save on every keystroke)
- Memoized computed values (`useMemo` for sorted projects)
- Lazy todo loading (only fetch when focus list opens)
- Virtualization-ready structure (future enhancement)

## Integration Points

### Parent Component
- **File**: `src/apps/team/components/calendar/CalendarDashboardContent.tsx`
- **Usage**: `<ActiveProjectsList containerRef={activityCardRef} />`
- **Context**: Uses `useWorkspaces()` hook to get current workspace

### Design System
- Follows existing Tailwind conventions
- Matches calendar card styling
- Consistent with AddEventPopover design (pointer arrow)
- Neutral color palette with blue accents

## Future Enhancements

### Potential Improvements
1. **Real-time sync**: Use Supabase subscriptions for live updates
2. **Assignees**: Add user assignments to todos
3. **Due dates**: Add deadline tracking to todos
4. **Filters**: Filter by phase, search by project name
5. **Bulk actions**: Select multiple projects for batch operations
6. **Activity log**: Show recent changes to projects
7. **Templates**: Pre-defined todo lists for each phase
8. **Notifications**: Alert on approaching deadlines
9. **Mobile gestures**: Swipe actions for quick edits
10. **Keyboard shortcuts**: Power user navigation

### Known Limitations
1. No pagination (assumes reasonable number of active projects)
2. No conflict resolution for concurrent edits
3. Metadata size not validated (JSONB has 1GB limit)
4. No audit trail for todo changes

## Testing Checklist

### Manual Testing
- [x] Projects load from database
- [x] Active projects filter correctly
- [x] Phase toggle updates database
- [x] Drag reorder saves to metadata
- [x] Todos persist across sessions
- [x] Todo CRUD operations work
- [x] Loading states display
- [x] Empty state shows correctly
- [x] Sort modes function properly
- [x] Popover positioning correct
- [x] Drag only works in Priority mode

### Edge Cases
- [x] No workspace selected (shows loading)
- [x] Empty projects array (shows "No active projects")
- [x] No saved metadata (initializes defaults)
- [x] Invalid project IDs in order (filters them out)
- [x] Rapid mutations (React Query handles)

## Dependencies
- `@dnd-kit/core@6.1.0` - Drag and drop
- `@dnd-kit/sortable@8.0.0` - Sortable lists
- `@dnd-kit/utilities@3.2.2` - Utilities
- `@tanstack/react-query` - Data fetching
- `lucide-react` - Icons
- React 18+
- TypeScript 5+

## Related Documentation
- `DRAGDROP_README.md` - Drag & drop system overview
- `DESIGN_SYSTEM.md` - UI design patterns
- `API_CONTRACT.md` - Database schema details
- `IMPLEMENTATION_COMPLETE.md` - Original feature spec

---

**Status**: ✅ **COMPLETE** - Fully integrated with database, all CRUD operations functional, tested and working.
