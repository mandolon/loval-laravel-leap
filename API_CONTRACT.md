# API Contract Documentation

## Overview

This document defines the API contract for the Loval Laravel Leap application. The contract is environment-agnostic and works across:

- **Web (localStorage)**: Client-side mock data storage
- **Web (Network API)**: Laravel/Supabase REST API
- **Desktop (Tauri + localStorage)**: Offline-first desktop app
- **Desktop (Tauri + Network API)**: Desktop app with backend connectivity

## Core Principles

1. **Single Source of Truth**: All types defined in `src/lib/api/types.ts`
2. **Consistent Responses**: All responses follow `ApiOk<T>` or `ApiErr` format
3. **Workspace Scoping**: Every entity belongs to a workspace
4. **UUID Identifiers**: All entities use UUID v4 for IDs
5. **Timestamps**: All entities include `createdAt` and `updatedAt`
6. **Validation**: Zod schemas validate all inputs/outputs

## Response Formats

### Success Response
```typescript
{
  data: T,
  meta?: {
    page?: number,
    limit?: number,
    total?: number,
    apiVersion?: string
  }
}
```

### Error Response
```typescript
{
  error: {
    code: string,        // Machine-readable error code
    message: string,     // Human-readable message
    details?: unknown    // Additional context (optional)
  }
}
```

## Common Query Parameters

All list endpoints support these query parameters:

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `page` | number | Page number (1-indexed) | `?page=2` |
| `limit` | number | Items per page | `?limit=50` |
| `search` | string | Full-text search | `?search=kitchen` |
| `sort` | string | Sort field:direction | `?sort=updatedAt:desc` |

## Entities

### Workspace

```typescript
{
  id: string              // UUID
  name: string            // Workspace name
  description?: string    // Optional description
  createdAt: string       // ISO 8601 timestamp
  updatedAt: string       // ISO 8601 timestamp
}
```

**Endpoints:**
- `GET /workspaces` → List workspaces
- `GET /workspaces/:id` → Get single workspace
- `POST /workspaces` → Create workspace
- `PATCH /workspaces/:id` → Update workspace
- `DELETE /workspaces/:id` → Delete workspace (cascade deletes projects)

**Filters:**
- `search`: Search by name or description

---

### Project

```typescript
{
  id: string              // UUID
  workspaceId: string     // Parent workspace UUID
  name: string            // Project name
  description?: string    // Optional description
  address: {
    streetNumber: string
    streetName: string
    unit?: string
    city: string
    state: string
    zipCode: string
    fullAddress: string
  }
  status: 'active' | 'pending' | 'completed' | 'archived'
  phase: 'Design' | 'Permit' | 'Build'
  createdAt: string       // ISO 8601 timestamp
  updatedAt: string       // ISO 8601 timestamp
}
```

**Endpoints:**
- `GET /projects?workspace_id={id}` → List projects (workspace-scoped)
- `GET /projects/:id` → Get single project
- `POST /projects` → Create project
- `PATCH /projects/:id` → Update project
- `DELETE /projects/:id` → Delete project (cascade deletes tasks)

**Filters:**
- `status`: Filter by status
- `phase`: Filter by phase
- `search`: Search by name, description, or address

---

### Task

```typescript
{
  id: string              // UUID
  projectId: string       // Parent project UUID
  title: string           // Task title
  description?: string    // Optional description
  status: 'todo' | 'in_progress' | 'completed' | 'blocked'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  dueDate?: string        // ISO 8601 date (optional)
  assignedTo?: string     // User UUID (optional)
  createdAt: string       // ISO 8601 timestamp
  updatedAt: string       // ISO 8601 timestamp
}
```

**Endpoints:**
- `GET /tasks?project_id={id}` → List tasks (project-scoped)
- `GET /tasks/:id` → Get single task
- `POST /tasks` → Create task
- `PATCH /tasks/:id` → Update task
- `DELETE /tasks/:id` → Delete task

**Filters:**
- `status`: Filter by status
- `priority`: Filter by priority
- `assignedTo`: Filter by assignee
- `search`: Search by title or description

---

### User

```typescript
{
  id: string              // UUID
  email: string           // Unique email
  first_name: string      // User's first name
  last_name: string       // User's last name
  role: 'admin' | 'member' | 'viewer'
  avatar?: string         // Avatar URL (optional)
  createdAt: string       // ISO 8601 timestamp
  updatedAt: string       // ISO 8601 timestamp
}
```

**Endpoints:**
- `GET /users` → List users
- `GET /users/:id` → Get single user
- `POST /users` → Create user

---

### Client

```typescript
{
  id: string              // UUID
  name: string            // Client name
  email?: string          // Client email (optional)
  phone?: string          // Client phone (optional)
  company?: string        // Company name (optional)
  createdAt: string       // ISO 8601 timestamp
  updatedAt: string       // ISO 8601 timestamp
}
```

**Endpoints:**
- `GET /clients` → List clients
- `GET /clients/:id` → Get single client
- `POST /clients` → Create client

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `NOT_FOUND` | 404 | Entity not found |
| `VALIDATION_ERROR` | 400 | Input validation failed |
| `UNAUTHORIZED` | 401 | Authentication required |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `CONFLICT` | 409 | Duplicate or conflicting resource |
| `INTERNAL_ERROR` | 500 | Server error |
| `NETWORK_ERROR` | 0 | Network request failed (client-side) |

## Environment Modes

### localStorage Mode (`VITE_USE_LOCAL_STORAGE=true`)

- Data stored in browser's localStorage (web) or Tauri's app data directory (desktop)
- No network requests
- Instant responses
- Data persists across sessions
- No authentication required

### Network API Mode (`VITE_USE_LOCAL_STORAGE=false`)

- Data fetched from `VITE_API_BASE_URL`
- Network latency applies
- Authentication required (JWT or session cookies)
- Supports multi-user collaboration

## Desktop (Tauri) Specific

When running in Tauri:
- `window.__TAURI__` is defined
- localStorage persists in OS-specific app data directory:
  - Windows: `%APPDATA%/app.lovable.loval-laravel-leap`
  - macOS: `~/Library/Application Support/app.lovable.loval-laravel-leap`
  - Linux: `~/.local/share/app.lovable.loval-laravel-leap`
- CSP allows `http://127.0.0.1:*` for local Laravel API
- File system access available via Tauri plugins (future)

## Migration Path

To switch from localStorage to Laravel/Supabase:

1. Set `VITE_USE_LOCAL_STORAGE=false` in `.env`
2. Set `VITE_API_BASE_URL=http://127.0.0.1:8000/api` (Laravel) or Supabase URL
3. Implement endpoints matching this contract
4. Add authentication headers in `src/lib/api/client.ts`
5. No changes required to UI components or React Query hooks

## Validation Schemas

All entities have Zod schemas in `src/lib/api/schemas.ts`:

- `WorkspaceSchema` / `CreateWorkspaceSchema` / `UpdateWorkspaceSchema`
- `ProjectSchema` / `CreateProjectSchema` / `UpdateProjectSchema`
- `TaskSchema` / `CreateTaskSchema` / `UpdateTaskSchema`
- `UserSchema` / `CreateUserSchema`
- `ClientSchema` / `CreateClientSchema`

These schemas are used to:
1. Validate API inputs before sending
2. Validate API responses after receiving
3. Ensure type safety at runtime
4. Generate TypeScript types via `z.infer<>`

## Best Practices

1. **Always scope by workspace**: Never fetch data without a `workspaceId`
2. **Use pagination**: Default to `limit=20`, allow up to `limit=100`
3. **Validate inputs**: Use Zod schemas before API calls
4. **Handle errors gracefully**: Use `handleApiError()` for user-friendly messages
5. **Log in debug mode**: Set `VITE_DEBUG_API=true` to trace API calls
6. **Optimize queries**: Use React Query's `staleTime` and `cacheTime`
7. **Provide feedback**: Show toast notifications for success/error states
