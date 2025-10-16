# Database Schema Documentation

## Architecture Overview

This project implements a **workspace-based project management system** with a **global admin role** for an internal desktop application.

---

## Intentional Deviations from Clean Schema

### 1. Global Admin Role (Phase 8)

**Implementation**: Added `users.is_admin` boolean field

**Architecture Decision**:
```sql
-- Global admin access
users.is_admin = true → Full access to all workspaces and projects

-- Workspace-scoped roles (no 'admin' role here)
workspace_members.role IN ('team', 'consultant', 'client')
```

**Reasoning**:
- ✅ **Internal desktop app** with trusted users only
- ✅ **Simpler permission model** - no complex RLS policies needed
- ✅ **Global visibility** - admins see/manage all workspaces
- ✅ **Workspace-scoped access** - non-admins get filtered access via `workspace_members`

**Security Model**:
- ✅ Admin checks performed **server-side** via database functions
- ✅ UI-based access control (suitable for trusted internal environment)
- ✅ No client-side storage of admin credentials
- ⚠️ **Does not use Row-Level Security (RLS)** policies
- ⚠️ **Not suitable for public-facing applications**

**Modified Schema**:
```diff
# users table
+ is_admin: boolean (default: false)

# workspace_members.role enum
- OLD: ('admin', 'team', 'consultant', 'client')
+ NEW: ('team', 'consultant', 'client')
```

**Access Control Logic**:
```typescript
// Admin users
if (user.is_admin) {
  // See all workspaces
  // Full CRUD on all resources
}

// Non-admin users
else {
  // See only assigned workspaces (via workspace_members)
  // Role-based access (team/consultant/client)
}
```

**Migration**: `20251016225638_4009d2bd-4546-4700-8988-5758bba35fbf.sql`

---

### 2. Denormalized Performance Counters

**Implementation**: Added computed fields for performance optimization

**Fields**:
```sql
projects.total_tasks         -- Total task count
projects.completed_tasks     -- Count of tasks with status = 'done_completed'
projects.team_member_count   -- Count of active project members
```

**Reasoning**:
- ✅ Avoid expensive `COUNT(*)` queries on every project load
- ✅ Real-time counter updates via database triggers
- ✅ Critical for dashboard performance

**Maintained By**:
- `update_project_task_counters()` - Updates task counters on INSERT/UPDATE/DELETE
- `update_project_member_counter()` - Updates member count on INSERT/DELETE

**Trade-offs**:
- ➕ Fast reads (no aggregation needed)
- ➖ Slightly more complex write logic
- ➖ Risk of counter drift (mitigated by triggers)

---

## Implemented Database Triggers

### Cascade Soft Delete Triggers
Automatically soft-delete child records when parent is deleted:

1. **`cascade_soft_delete_project`**
   - Deletes: tasks, members, folders, files, notes, chats, invoices, links, time entries
   - Preserves referential integrity without FK constraints

2. **`cascade_soft_delete_user`**
   - Deletes: workspace_members, project_members
   - Prevents orphaned membership records

3. **`cascade_soft_delete_folder`**
   - Deletes: child folders, files (recursive)
   - Maintains folder hierarchy

### Auto-Update Triggers
Automatically populate audit fields:

4. **`auto_update_updated_by`**
   - Applied to: projects, tasks, notes, invoices
   - Sets `updated_by = auth.uid()` on UPDATE

5. **`auto_update_folder_path`**
   - Applied to: folders
   - Rebuilds `path` field when name/parent changes
   - Format: `parent/path/folder_name`

6. **`update_user_last_active`**
   - Applied to: projects, tasks, project_chat_messages
   - Updates `users.last_active_at` (throttled to 5-minute intervals)

### Activity Logging Trigger

7. **`log_to_activity_log`**
   - Applied to: projects, tasks, files
   - Captures: action type, user, workspace, old/new values
   - Powers audit trail and activity feeds

### File Management Trigger

8. **`handle_file_versioning`**
   - Applied to: files (on INSERT)
   - Auto-increments `version_number` for duplicate filenames
   - Sets `parent_file_id` to link versions

---

## Security Considerations

### Current Security Model
- ✅ **Server-side function checks** via `SECURITY DEFINER`
- ✅ **Soft delete audit trail** (`deleted_at`, `deleted_by`)
- ✅ **Activity logging** for compliance
- ⚠️ **No RLS policies** (UI-enforced access control)

### When to Add RLS
Consider implementing RLS if:
- Project becomes public-facing
- Multi-tenancy with untrusted users
- Compliance requires database-level isolation

### Admin Security Best Practices
```typescript
// ✅ CORRECT: Server-side check
const { data: user } = await supabase
  .from('users')
  .select('is_admin')
  .eq('auth_id', authUser.id)
  .single();

if (user.is_admin) { /* admin action */ }

// ❌ WRONG: Client-side check
if (localStorage.getItem('isAdmin') === 'true') { /* INSECURE */ }
```

---

## Performance Optimizations

### Indexes
```sql
-- Admin lookups
idx_users_is_admin ON users(is_admin) WHERE is_admin = true

-- Workspace member queries
idx_workspace_members_active ON workspace_members(workspace_id, user_id) 
  WHERE deleted_at IS NULL

-- Soft delete filters
All queries include: WHERE deleted_at IS NULL
```

### Query Patterns
```sql
-- Projects with member count (no aggregation needed)
SELECT name, team_member_count FROM projects;

-- Projects with completion rate (no aggregation needed)
SELECT name, completed_tasks::float / NULLIF(total_tasks, 0) * 100 AS progress
FROM projects;
```

---

## Migration History

| Phase | Date | Description |
|-------|------|-------------|
| Phase 8 | 2025-10-16 | Global admin role + workspace-scoped roles |
| Phase 8.5 | 2025-10-16 | Implement missing database triggers |

---

## Future Considerations

### Potential Enhancements
- [ ] Add RLS policies for public-facing features
- [ ] Implement activity log retention policy (e.g., 1 year)
- [ ] Add file versioning UI
- [ ] Create admin audit dashboard
- [ ] Add workspace-level billing/quotas

### Maintenance Tasks
- [ ] Monitor `activity_log` table size
- [ ] Periodic counter validation (compare denormalized vs. actual COUNT)
- [ ] Review admin user list quarterly

---

## Quick Reference

### Admin vs. Non-Admin
```typescript
// Check if user is global admin
const isGlobalAdmin = user.is_admin === true;

// Check workspace role (non-admin users only)
const workspaceRole = await getWorkspaceRole(userId, workspaceId);
// Returns: 'team' | 'consultant' | 'client' | null
```

### Soft Delete Pattern
```typescript
// Soft delete (preserves data)
UPDATE projects 
SET deleted_at = NOW(), deleted_by = auth.uid() 
WHERE id = 'project-id';

// Hard delete (permanent, rare)
DELETE FROM projects WHERE id = 'project-id';
```

### Activity Log Query
```sql
-- Get recent activity for a project
SELECT 
  al.action,
  al.change_summary,
  u.name AS user_name,
  al.created_at
FROM activity_log al
JOIN users u ON al.user_id = u.id
WHERE al.project_id = 'project-id'
  AND al.created_at > NOW() - INTERVAL '30 days'
ORDER BY al.created_at DESC;
```

---

**Last Updated**: 2025-10-16  
**Schema Version**: 8.5
