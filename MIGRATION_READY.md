# Migration-Ready Architecture

This codebase is now structured to easily switch from localStorage to Laravel/Supabase with minimal code changes.

## What's Been Implemented

### ✅ Foundation Layer

**1. Standardized Transport (`src/lib/api/transport.ts`)**
- `ApiOk<T>` - Success response wrapper with metadata
- `ApiErr` - Error response with code, message, details
- `ListQuery` - Standard pagination/filtering/sorting params
- Helper functions: `ok()`, `err()`, `isApiError()`, `parseSort()`

**2. Zod Validation Schemas (`src/lib/api/schemas.ts`)**
- All entities validated: Workspace, Project, Task, User, Client
- Input schemas for create/update operations
- Type-safe contracts for API boundaries
- Automatic validation on both ends

**3. Centralized Error Handling (`src/lib/api/errors.ts`)**
- Standard error codes enum
- `handleApiError()` - Extract user-friendly messages
- `createApiError()` - Build standardized errors
- `logApiError()` - Debug logging when `VITE_DEBUG_API=true`

**4. Environment Configuration (`.env.example`)**
```env
VITE_USE_LOCAL_STORAGE=true     # Toggle storage backend
VITE_API_BASE_URL=...            # Laravel/Supabase endpoint
VITE_API_VERSION=v1              # API versioning
VITE_DEBUG_API=false             # Debug logging
```

### ✅ React Query Layer

**React Query Hooks** (`src/lib/api/hooks/*`)
- `useProjects`, `useProject` - Fetch with caching
- `useCreateProject`, `useUpdateProject`, `useDeleteProject` - Mutations with optimistic updates
- `useTasks`, `useTask` - Task queries
- `useCreateTask`, `useUpdateTask`, `useDeleteTask` - Task mutations
- `useWorkspaces`, `useWorkspace` - Workspace queries
- Built-in error handling with toasts
- Query key factories for cache management
- Optimistic updates with rollback on error

## How to Switch Backends

### Current: localStorage

```typescript
// src/lib/api/client.ts (current)
export const api = {
  projects: {
    list: (workspaceId: string) => {
      // localStorage implementation
      const data = JSON.parse(localStorage.getItem('projects') || '[]')
      return data.filter(p => p.workspaceId === workspaceId)
    },
    // ... other methods
  }
}
```

### Future: Laravel/Supabase

Create a new file `src/lib/api/http-client.ts`:

```typescript
// src/lib/api/http-client.ts
const baseURL = import.meta.env.VITE_API_BASE_URL

const fetchAPI = async (path: string, opts?: RequestInit) => {
  const res = await fetch(`${baseURL}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(opts?.headers || {}),
    },
    ...opts,
  })
  
  const text = await res.text()
  const json = text ? JSON.parse(text) : null
  
  if (!res.ok) {
    throw createApiError('INTERNAL_ERROR', json?.error?.message || 'Request failed', json)
  }
  
  return json
}

export const httpApi = {
  projects: {
    list: async (workspaceId: string, q?: ListQuery) => {
      const params = new URLSearchParams({ workspace_id: workspaceId })
      if (q?.page) params.append('page', String(q.page))
      if (q?.limit) params.append('limit', String(q.limit))
      if (q?.status) params.append('status', q.status)
      if (q?.phase) params.append('phase', q.phase)
      if (q?.search) params.append('search', q.search)
      if (q?.sort) params.append('sort', q.sort)
      
      return fetchAPI(`/projects?${params}`)
    },
    
    get: async (id: string) => {
      return fetchAPI(`/projects/${id}`)
    },
    
    create: async (input: CreateProjectInput) => {
      return fetchAPI('/projects', {
        method: 'POST',
        body: JSON.stringify(input),
      })
    },
    
    update: async (id: string, input: UpdateProjectInput) => {
      return fetchAPI(`/projects/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      })
    },
    
    delete: async (id: string) => {
      return fetchAPI(`/projects/${id}`, {
        method: 'DELETE',
      })
    },
  },
  // ... same pattern for tasks, workspaces, etc.
}
```

Then update `src/lib/api/client.ts`:

```typescript
import { httpApi } from './http-client'
import { localStorageApi } from './localStorage-client' // Move current impl here

const USE_LOCAL = import.meta.env.VITE_USE_LOCAL_STORAGE === 'true'

export const api = USE_LOCAL ? localStorageApi : httpApi
```

**That's it!** All React Query hooks, components, and UI code continue working unchanged.

## Backend Requirements

### Laravel Schema

```sql
-- workspaces
CREATE TABLE workspaces (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  icon VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- projects
CREATE TABLE projects (
  id UUID PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  address VARCHAR(500) NOT NULL,
  status VARCHAR(50) NOT NULL,
  phase VARCHAR(50) NOT NULL,
  client_id UUID,
  due_date DATE,
  budget DECIMAL(12, 2),
  progress INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- tasks
CREATE TABLE tasks (
  id UUID PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL,
  priority VARCHAR(50) NOT NULL,
  created_by_id UUID NOT NULL,
  due_date DATE,
  estimated_time INTEGER,
  actual_time INTEGER,
  tracked_time INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Laravel Controller Example

```php
// app/Http/Controllers/ProjectController.php
public function index(Request $request)
{
    $query = Project::where('workspace_id', $request->workspace_id);
    
    if ($request->has('status')) {
        $query->where('status', $request->status);
    }
    
    if ($request->has('search')) {
        $query->where('name', 'like', '%' . $request->search . '%');
    }
    
    if ($request->has('sort')) {
        [$field, $order] = explode(':', $request->sort);
        $query->orderBy($field, $order);
    }
    
    $page = $request->get('page', 1);
    $limit = $request->get('limit', 20);
    
    $projects = $query->paginate($limit, ['*'], 'page', $page);
    
    return response()->json([
        'data' => $projects->items(),
        'meta' => [
            'page' => $projects->currentPage(),
            'limit' => $projects->perPage(),
            'total' => $projects->total(),
            'apiVersion' => 'v1',
        ]
    ]);
}
```

### Supabase Setup

```sql
-- Same schema as Laravel
-- Add RLS policies:

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view projects in their workspace"
  ON projects FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT id FROM workspaces
      WHERE id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can create projects in their workspace"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces
      WHERE id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
    )
  );
```

## Usage in Components

```typescript
// Before (direct api calls)
import { api } from '@/lib/api/client'

const projects = api.projects.list(workspaceId)

// After (React Query hooks) ✅
import { useProjects, useCreateProject } from '@/lib/api/hooks'

function ProjectList({ workspaceId }: { workspaceId: string }) {
  const { data: projects, isLoading, error } = useProjects(workspaceId)
  const createProject = useCreateProject(workspaceId)
  
  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {handleApiError(error)}</div>
  
  return (
    <div>
      {projects?.map(p => <ProjectCard key={p.id} project={p} />)}
      <button onClick={() => createProject.mutate({ name: 'New Project', ... })}>
        Create Project
      </button>
    </div>
  )
}
```

## Testing the Switch

1. **Set flag**: `VITE_USE_LOCAL_STORAGE=false`
2. **Point to backend**: `VITE_API_BASE_URL=http://localhost:8000/api`
3. **Enable debug**: `VITE_DEBUG_API=true`
4. **Run app**: All API calls now log to console
5. **Fix mismatches**: Adjust backend responses to match schemas

## Benefits

✅ **Type Safety**: Zod validates all API boundaries
✅ **Caching**: React Query handles all data fetching
✅ **Optimistic Updates**: UI updates immediately, rolls back on error
✅ **Error Handling**: Centralized, user-friendly messages
✅ **Debug Mode**: Easy to trace API operations
✅ **Zero UI Changes**: Switching backends doesn't touch components
✅ **Gradual Migration**: Can migrate entity by entity

## Next Steps

When ready to migrate:
1. Set up Laravel routes matching the API contract
2. Implement controllers with pagination/filtering/sorting
3. Add authentication middleware
4. Create a `http-client.ts` with fetch calls
5. Switch the flag: `VITE_USE_LOCAL_STORAGE=false`
6. Test and iterate

The entire frontend will continue working with the new backend!
