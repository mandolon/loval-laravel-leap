# Active Projects - Developer Quick Reference

## Quick Start

### Display Active Projects
```tsx
import { ActiveProjectsList } from '@/apps/team/components/projects';

<ActiveProjectsList containerRef={myRef} />
```

The component automatically:
- Fetches current workspace from context
- Loads active projects from database
- Loads project order and todos from metadata
- Handles all CRUD operations

## Common Tasks

### 1. Add a Project to Active List
```typescript
// Project must have status = 'active'
await updateProject({
  id: projectId,
  input: { status: 'active' }
});
// Component auto-refreshes via React Query
```

### 2. Change Project Phase Programmatically
```typescript
const updateProjectMutation = useUpdateProject(workspaceId);

updateProjectMutation.mutate({
  id: projectId,
  input: { phase: 'Design' }
});
```

### 3. Access Project Todos
```typescript
const { data: settings } = useWorkspaceSettings(workspaceId);
const metadata = settings?.metadata as WorkspaceMetadata;
const todos = metadata?.projectTodos?.[projectId]?.todos || [];
```

### 4. Update Project Order
```typescript
const updateSettingsMutation = useUpdateWorkspaceSettings();

const newMetadata = {
  ...currentMetadata,
  projectOrder: {
    projectIds: ['project-id-1', 'project-id-2', 'project-id-3'],
    lastUpdated: new Date().toISOString()
  }
};

updateSettingsMutation.mutate({
  workspaceId,
  input: { metadata: newMetadata }
});
```

### 5. Bulk Update Todos
```typescript
const newMetadata = {
  ...currentMetadata,
  projectTodos: {
    [projectId]: {
      todos: [
        { id: 't1', text: 'Task 1', completed: false, createdAt: '...' },
        { id: 't2', text: 'Task 2', completed: true, createdAt: '...' }
      ],
      lastUpdated: new Date().toISOString()
    }
  }
};

updateSettingsMutation.mutate({
  workspaceId,
  input: { metadata: newMetadata }
});
```

## Type Definitions

### Project (UI Type)
```typescript
interface Project {
  id: string;
  name: string;                               // Display name
  stage: 'Pre-Design' | 'Design' | 'Permit' | 'Build';
  nextLabel: string | null;                   // First incomplete todo
  startedAt: string;                          // ISO timestamp
}
```

### ProjectTodo (UI Type)
```typescript
interface ProjectTodo {
  id: string;
  text: string;
  completed: boolean;
  isEditing?: boolean;                        // Local UI state only
}
```

### WorkspaceMetadata
```typescript
interface WorkspaceMetadata {
  projectOrder?: {
    projectIds: string[];
    lastUpdated: string;
  };
  projectTodos?: {
    [projectId: string]: {
      todos: Array<{
        id: string;
        text: string;
        completed: boolean;
        createdAt: string;
      }>;
      lastUpdated: string;
    };
  };
}
```

## Component Props

### ActiveProjectsList
```typescript
interface ActiveProjectsListProps {
  containerRef?: React.Ref<HTMLDivElement>;  // Optional ref to container
}
```

### SortableProjectRow
```typescript
interface SortableProjectRowProps {
  project: Project;
  allowDrag: boolean;                         // Enable/disable drag handle
  index: number;                              // Position in list
  onOpenFocusList: (project: Project, anchorRef: React.RefObject<HTMLElement>) => void;
  onUpdateStatus: (projectId: string, newStatus: Project['stage']) => void;
}
```

### FocusListPanel
```typescript
interface FocusListPanelProps {
  project: Project;
  todos: ProjectTodo[];
  anchorRef: React.RefObject<HTMLElement>;    // Position anchor
  onClose: () => void;
  onAddTodo: () => void;
  onToggleTodo: (todoId: string) => void;
  onDeleteTodo: (todoId: string) => void;
  onUpdateTodo: (todoId: string, newText: string) => void;
  onReorderTodos: (todos: ProjectTodo[]) => void;
}
```

## Hooks Reference

### useProjects(workspaceId)
```typescript
const { 
  data: Project[], 
  isLoading: boolean,
  error: Error | null 
} = useProjects(workspaceId);
```

### useUpdateProject(workspaceId)
```typescript
const mutation = useUpdateProject(workspaceId);

mutation.mutate({
  id: string,
  input: {
    phase?: 'Pre-Design' | 'Design' | 'Permit' | 'Build',
    status?: 'pending' | 'active' | 'completed' | 'archived',
    name?: string,
    // ... other project fields
  }
});
```

### useWorkspaceSettings(workspaceId)
```typescript
const { 
  data: WorkspaceSettings,
  isLoading: boolean 
} = useWorkspaceSettings(workspaceId);
```

### useUpdateWorkspaceSettings()
```typescript
const mutation = useUpdateWorkspaceSettings();

mutation.mutate({
  workspaceId: string,
  input: {
    metadata?: Record<string, unknown>,
    companyName?: string,
    // ... other settings
  }
});
```

## State Management

### Local State (Component-level)
- `sortBy`: Current sort mode
- `activeId`: Currently dragged project ID
- `focusListProject`: Project with open todo panel
- `focusTodos`: Todos in open panel (temporary)
- `focusListAnchorRef`: DOM reference for popover positioning

### Server State (React Query)
- `dbProjects`: All projects from database
- `workspaceSettings`: Workspace metadata including order/todos
- Mutations automatically invalidate and refetch

### Derived State (useMemo)
- `activeProjects`: Filtered and transformed projects
- `projectOrder`: Saved order or default
- `orderedProjects`: Sorted by current mode

## Performance Tips

1. **Batch metadata updates**: Collect multiple changes before saving
2. **Memoize callbacks**: Use `useCallback` for event handlers
3. **Debounce saves**: Don't save on every keystroke
4. **Filter early**: Filter to active projects before transformation
5. **Lazy load**: Only load todos when panel opens

## Debugging

### Check Project Loading
```typescript
console.log('DB Projects:', dbProjects);
console.log('Active Projects:', activeProjects);
console.log('Workspace ID:', workspaceId);
```

### Inspect Metadata
```typescript
const metadata = workspaceSettings?.metadata as WorkspaceMetadata;
console.log('Project Order:', metadata?.projectOrder);
console.log('All Todos:', metadata?.projectTodos);
console.log('Specific Todos:', metadata?.projectTodos?.[projectId]);
```

### Monitor Mutations
```typescript
console.log('Update Project Status:', updateProjectMutation.status);
console.log('Update Settings Status:', updateSettingsMutation.status);
console.log('Is Loading:', updateProjectMutation.isLoading);
console.log('Error:', updateProjectMutation.error);
```

## Common Issues

### Projects Not Showing
- Check project `status` is `'active'`
- Verify `workspace_id` matches current workspace
- Check `workspaceId` is not empty string

### Todos Not Saving
- Verify `workspaceId` is provided to mutation
- Check metadata structure matches type definition
- Look for mutation errors in console

### Drag Not Working
- Ensure `sortBy === 'priority'`
- Check `allowDrag` prop is true
- Verify activation constraint (8px movement)

### Popover Positioning Wrong
- Check anchor ref is attached to correct element
- Verify element has rendered before opening
- Test with different viewport sizes

## Best Practices

1. **Always filter active projects**: Don't show pending/completed/archived
2. **Validate metadata structure**: Type-check before saving
3. **Handle missing data**: Use fallbacks for empty states
4. **Preserve user order**: Don't override saved project order
5. **Auto-save carefully**: Balance UX with server load
6. **Show loading states**: Never show stale data
7. **Handle errors gracefully**: Toast notifications for failures

## Migration Guide

### From Seed Data to Database

**Before** (seed data):
```typescript
const [projects, setProjects] = useState(seedProjects);
```

**After** (database):
```typescript
const { data: dbProjects } = useProjects(workspaceId);
const activeProjects = useMemo(() => 
  dbProjects.filter(p => p.status === 'active')
, [dbProjects]);
```

### From Local State to Metadata

**Before** (component state):
```typescript
const [userOrder, setUserOrder] = useState(['id1', 'id2']);
```

**After** (metadata):
```typescript
const metadata = workspaceSettings?.metadata as WorkspaceMetadata;
const projectOrder = metadata?.projectOrder?.projectIds || [];
```

---

**Last Updated**: December 2024  
**Maintainer**: Active Projects Team  
**Status**: Production Ready ✅
