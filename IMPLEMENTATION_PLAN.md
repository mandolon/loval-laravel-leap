# Schema Implementation Plan - Complete Assessment

## Executive Summary

This document provides a comprehensive gap analysis between the clean schema (`workspace_schema_clean_1-11.sql`) and the current project implementation, with a prioritized action plan to bring the project into full compliance.

---

## Current State Assessment

### ✅ What's Working
- **Database triggers** (Phase 8.5): All 8 triggers implemented
- **Global admin system**: `users.is_admin` operational
- **Project structure**: Basic CRUD operations functional
- **Task board**: Workspace-wide task view exists
- **Authentication**: User context and sessions working

### ❌ Critical Gaps

#### 1. **Non-Editable Cards in Project Tabs**
**Status**: Display-only, no CRUD operations

| Tab | Current State | Required | Priority |
|-----|--------------|----------|----------|
| **Notes** | Placeholder text only | Full CRUD with rich text | 🔴 HIGH |
| **Project Chat** | Sidebar exists, no messages | Real-time chat with @mentions | 🔴 HIGH |
| **Client Info** | Display-only | Inline editing + validation | 🟡 MEDIUM |
| **Project Details** | Display-only | Edit dialogs for all sections | 🟡 MEDIUM |

#### 2. **Task Synchronization Issues**
**Status**: Two separate task views, no sync

- **TasksPage** (`/workspace/{id}/tasks`): Shows all workspace tasks
- **ProjectDetails Tasks Tab**: Shows project-specific tasks
- ⚠️ **Problem**: No real-time sync between views
- ⚠️ **Problem**: Updates in one view don't reflect in the other

#### 3. **Schema Deviations**

| Issue | Schema Expects | Current Implementation | Impact |
|-------|---------------|------------------------|--------|
| Admin role | `workspace_members.role` includes 'admin' | `users.is_admin` (global) | ⚠️ Intentional deviation |
| Constraints | Full validation on inserts | Missing CHECK constraints | 🔴 Data integrity risk |
| Default values | `short_id` auto-generated | Some tables missing defaults | 🔴 Insert failures |
| Computed fields | `progress` as CHECK | Denormalized counters | ⚠️ Intentional optimization |

---

## Detailed Gap Analysis

### Part 1: Project Tabs - Editable Cards

#### 1.1 Notes Tab
**Current**: `<p>No notes yet</p>`  
**Required**: Full-featured notes system

```typescript
// Missing components:
- NoteCard (display + inline edit)
- CreateNoteDialog
- NoteEditor (rich text)

// Missing hooks:
- useNotes(projectId)
- useCreateNote(projectId)
- useUpdateNote(projectId)
- useDeleteNote(projectId)

// Database: ✅ Table exists, needs implementation
```

**Implementation Checklist**:
- [ ] Create `src/components/NoteCard.tsx` with inline editing
- [ ] Create `src/components/CreateNoteDialog.tsx`
- [ ] Create `src/lib/api/hooks/useNotes.ts`
- [ ] Add real-time updates via Supabase subscriptions
- [ ] Update `ProjectDetails.tsx` Notes tab

**Estimated Time**: 4-6 hours

---

#### 1.2 Project Chat Tab
**Current**: Collapsible sidebar with placeholder  
**Required**: Real-time project chat with file/task references

```typescript
// Missing components:
- ChatMessage (with replies, @mentions)
- ChatInput (with file upload, task linking)
- MessageThread (reply chains)

// Missing hooks:
- useProjectChat(projectId)
- useSendMessage(projectId)
- useDeleteMessage(projectId)

// Database: ✅ Table exists, needs UI
```

**Implementation Checklist**:
- [ ] Create `src/components/chat/ChatMessage.tsx`
- [ ] Create `src/components/chat/ChatInput.tsx`
- [ ] Create `src/lib/api/hooks/useProjectChat.ts`
- [ ] Implement real-time updates (Supabase Realtime)
- [ ] Add @mention autocomplete
- [ ] Add file/task reference UI
- [ ] Update `ProjectDetails.tsx` chat sidebar

**Estimated Time**: 8-10 hours

---

#### 1.3 Client Info Tab
**Current**: Display-only client information  
**Required**: Inline editing of client details

```typescript
// Missing components:
- EditClientDialog
- ClientContactCard (editable)

// Missing functionality:
- Form validation (zod schema)
- Address autocomplete
- Phone formatting
```

**Implementation Checklist**:
- [ ] Create `src/components/EditClientDialog.tsx`
- [ ] Add validation schema for client fields
- [ ] Add Edit buttons to client cards
- [ ] Update project mutation to handle client updates
- [ ] Add loading states

**Estimated Time**: 3-4 hours

---

#### 1.4 Project Details Tab
**Current**: Static display fields  
**Required**: Edit dialogs for project metadata

**Sections to make editable**:
- [x] Project Narrative (description)
- [ ] Project Address
- [ ] Assessor Parcel Information
- [ ] Project Status/Phase
- [ ] Team Members

**Implementation Checklist**:
- [ ] Create `src/components/EditProjectDialog.tsx`
- [ ] Create `src/components/EditParcelInfoDialog.tsx`
- [ ] Add Edit buttons to each section
- [ ] Implement form validation
- [ ] Update project mutation handlers

**Estimated Time**: 4-6 hours

---

### Part 2: Task Synchronization

#### 2.1 Current Architecture Issues

```
┌─────────────────────────────┐
│ TasksPage (Workspace View)  │
│  - Shows all workspace tasks │
│  - Groups by status          │
│  - Local state only          │
└─────────────────────────────┘
              ↕ ❌ NO SYNC
┌─────────────────────────────┐
│ ProjectDetails (Task Tab)   │
│  - Shows project tasks       │
│  - Kanban columns            │
│  - Local state only          │
└─────────────────────────────┘
```

**Problems**:
1. No shared query cache between views
2. Updates in one view don't invalidate the other
3. No real-time sync
4. Stale data when switching views

#### 2.2 Solution: Unified Task Management

**Approach**: Use React Query with proper cache invalidation

```typescript
// Shared query keys
const taskKeys = {
  all: ['tasks'],
  workspace: (workspaceId: string) => [...taskKeys.all, 'workspace', workspaceId],
  project: (projectId: string) => [...taskKeys.all, 'project', projectId],
  detail: (taskId: string) => [...taskKeys.all, 'detail', taskId],
}

// Mutations invalidate both workspace and project queries
const useUpdateTask = () => {
  return useMutation({
    onSuccess: (task) => {
      queryClient.invalidateQueries(taskKeys.workspace(task.workspaceId))
      queryClient.invalidateQueries(taskKeys.project(task.projectId))
    }
  })
}
```

**Implementation Checklist**:
- [ ] Refactor `useTasks.ts` to use proper query keys
- [ ] Update `TasksPage.tsx` to use React Query
- [ ] Update `ProjectDetails.tsx` to use same hooks
- [ ] Add optimistic updates
- [ ] Implement real-time sync via Supabase
- [ ] Add loading/error states

**Estimated Time**: 6-8 hours

---

### Part 3: Database Schema Compliance

#### 3.1 Missing Constraints

**Status**: Schema has CHECK constraints that aren't enforced in DB

```sql
-- Missing from projects table
ALTER TABLE projects ADD CONSTRAINT projects_status_check 
  CHECK (status IN ('active', 'pending', 'completed', 'archived'));

ALTER TABLE projects ADD CONSTRAINT projects_phase_check 
  CHECK (phase IN ('Pre-Design', 'Design', 'Permit', 'Build'));

-- Missing from tasks table
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check 
  CHECK (status IN ('task_redline', 'progress_update', 'done_completed'));

ALTER TABLE tasks ADD CONSTRAINT tasks_priority_check 
  CHECK (priority IN ('low', 'medium', 'high', 'urgent'));

-- Missing from invoices table
ALTER TABLE invoices ADD CONSTRAINT invoices_status_check 
  CHECK (status IN ('draft', 'pending', 'paid', 'overdue', 'cancelled'));

-- Missing from workspace_members table
-- NOTE: Schema expects 'admin' role but we use users.is_admin
ALTER TABLE workspace_members ADD CONSTRAINT workspace_members_role_check 
  CHECK (role IN ('team', 'consultant', 'client')); 
  -- Excludes 'admin' per our global admin design
```

**Implementation Checklist**:
- [ ] Create migration to add all CHECK constraints
- [ ] Document global admin deviation in migration
- [ ] Test constraint violations don't break existing data
- [ ] Update SCHEMA_NOTES.md

**Estimated Time**: 2-3 hours

---

#### 3.2 Missing Default Values

**Status**: Some tables missing `short_id` defaults

```sql
-- Verify all tables have short_id defaults
ALTER TABLE workspace_members 
  ALTER COLUMN short_id SET DEFAULT generate_short_id('WM');

ALTER TABLE user_preferences 
  ALTER COLUMN short_id SET DEFAULT generate_short_id('UP');

-- Check other tables...
```

**Implementation Checklist**:
- [ ] Audit all tables for missing defaults
- [ ] Create migration to add defaults
- [ ] Test inserts work without specifying short_id

**Estimated Time**: 1-2 hours

---

#### 3.3 Schema Indexes

**Status**: Most indexes exist, need verification

**Implementation Checklist**:
- [ ] Run schema comparison query
- [ ] Add any missing indexes from clean schema
- [ ] Verify index usage with EXPLAIN ANALYZE

**Estimated Time**: 1-2 hours

---

### Part 4: Component Refactoring

#### 4.1 Make TaskItem Editable

**Current**: Only status changes via checkbox  
**Required**: Inline title/description editing

```typescript
// Add to TaskItem.tsx
const [isEditing, setIsEditing] = useState(false)

// Click to edit title
<h4 onClick={() => setIsEditing(true)}>
  {isEditing ? (
    <input value={title} onChange={...} onBlur={save} />
  ) : (
    task.title
  )}
</h4>
```

**Implementation Checklist**:
- [ ] Add edit mode to TaskItem
- [ ] Add inline title editing
- [ ] Add inline description editing
- [ ] Add save/cancel buttons
- [ ] Update mutation hooks

**Estimated Time**: 3-4 hours

---

#### 4.2 Make ProjectCard Editable

**Current**: Display-only with delete option  
**Required**: Quick edit of key fields

**Implementation Checklist**:
- [ ] Add "Quick Edit" dropdown option
- [ ] Create `EditProjectQuickDialog.tsx`
- [ ] Allow editing: name, status, phase, description
- [ ] Add optimistic updates

**Estimated Time**: 2-3 hours

---

## Implementation Priority Matrix

### 🔴 Phase 1: Critical (Week 1)
**Goal**: Fix blocking issues and data integrity

1. **Add Database Constraints** (2-3 hrs)
   - Prevent invalid data inserts
   - Align with schema validation

2. **Implement Notes CRUD** (4-6 hrs)
   - Most requested feature
   - Simplest to implement

3. **Fix Task Synchronization** (6-8 hrs)
   - High user impact
   - Core functionality

**Total: 12-17 hours**

---

### 🟡 Phase 2: Important (Week 2)
**Goal**: Make cards editable

4. **Project Chat Implementation** (8-10 hrs)
   - Real-time collaboration
   - High value feature

5. **Editable Client Info** (3-4 hrs)
   - Frequently updated data
   - Quick win

6. **Editable Project Details** (4-6 hrs)
   - Complete project management
   - User requested

**Total: 15-20 hours**

---

### 🟢 Phase 3: Polish (Week 3)
**Goal**: Enhanced UX

7. **Inline Task Editing** (3-4 hrs)
   - Quality of life improvement
   - Better UX

8. **Quick Edit ProjectCard** (2-3 hrs)
   - Convenience feature
   - Nice to have

9. **Schema Audit & Cleanup** (2-3 hrs)
   - Verify all indexes
   - Documentation updates

**Total: 7-10 hours**

---

## Technical Stack

### Frontend Components to Create
```
src/components/
├── notes/
│   ├── NoteCard.tsx
│   ├── NoteEditor.tsx
│   └── CreateNoteDialog.tsx
├── chat/
│   ├── ChatMessage.tsx
│   ├── ChatInput.tsx
│   ├── MessageThread.tsx
│   └── MentionAutocomplete.tsx
├── project/
│   ├── EditClientDialog.tsx
│   ├── EditProjectDialog.tsx
│   ├── EditParcelInfoDialog.tsx
│   └── QuickEditProjectDialog.tsx
└── tasks/
    └── InlineTaskEditor.tsx
```

### API Hooks to Create
```
src/lib/api/hooks/
├── useNotes.ts
├── useProjectChat.ts (enhance existing)
├── useProjectMembers.ts
└── useRealtimeSync.ts
```

### Database Migrations Needed
```
supabase/migrations/
├── add_check_constraints.sql
├── add_missing_defaults.sql
└── verify_indexes.sql
```

---

## Risk Assessment

### High Risk ⚠️
1. **Real-time sync**: Supabase Realtime can be complex
   - **Mitigation**: Start with polling, upgrade to websockets
   
2. **Data migrations**: Adding constraints could fail on existing data
   - **Mitigation**: Audit data first, clean before migration

### Medium Risk ⚠️
3. **Task sync refactor**: Could break existing functionality
   - **Mitigation**: Feature flag, gradual rollout

4. **Chat implementation**: File uploads + real-time is complex
   - **Mitigation**: Phase 1: text only, Phase 2: add files

### Low Risk ✅
5. **Notes CRUD**: Straightforward implementation
6. **Editable cards**: Standard form handling

---

## Success Metrics

### Phase 1 Complete ✅
- [ ] All database constraints enforced
- [ ] Notes can be created, edited, deleted
- [ ] Tasks sync between workspace and project views
- [ ] No data integrity issues

### Phase 2 Complete ✅
- [ ] Project chat is functional with real-time updates
- [ ] Client info can be edited inline
- [ ] All project details have edit dialogs
- [ ] User feedback is positive

### Phase 3 Complete ✅
- [ ] Tasks can be edited inline
- [ ] ProjectCard has quick edit
- [ ] Schema audit shows 100% compliance (minus documented deviations)
- [ ] No performance degradation

---

## Documentation Updates Required

1. **SCHEMA_NOTES.md**
   - Document all deviations from clean schema
   - Explain global admin choice
   - List all implemented constraints

2. **API_CONTRACT.md**
   - Update with new endpoints
   - Document real-time channels
   - Add error codes

3. **README.md**
   - Update feature list
   - Add screenshots
   - Document chat @mention syntax

---

## Next Steps

**Immediate Actions**:
1. ✅ Read and approve this plan
2. 🔄 Begin Phase 1, Task 1: Database constraints migration
3. 🔄 Set up feature flags for gradual rollout
4. 🔄 Create tracking board for implementation

**Questions to Answer**:
- Do we need file sharing in chat immediately or can it wait?
- Should notes support markdown/rich text or plain text first?
- What's the priority: speed or completeness?

---

## Appendix A: Schema Deviation Summary

| Deviation | Reason | Acceptable? | Documented? |
|-----------|--------|-------------|-------------|
| `users.is_admin` instead of workspace role | Internal app, simpler permissions | ✅ Yes | ✅ Yes |
| Denormalized task/member counters | Performance optimization | ✅ Yes | ✅ Yes |
| Missing file share tokens | Not MVP feature | ✅ Yes | ❌ No |
| Missing CHECK constraints | Oversight | ❌ No | ⚠️ In progress |

---

## Appendix B: Component Dependency Tree

```
ProjectDetails
├── Tabs
│   ├── Notes Tab
│   │   └── NoteCard → useNotes → Supabase
│   ├── Chat Tab
│   │   ├── ChatMessage → useProjectChat → Supabase Realtime
│   │   └── ChatInput
│   ├── Client Tab
│   │   └── EditClientDialog → useUpdateProject
│   └── Tasks Tab
│       └── TaskItem → useTasks → Shared Query Cache
│
TasksPage
└── TaskSection → useTasks (SAME CACHE AS ABOVE)
```

**Key Insight**: Tasks must use the same React Query cache to stay in sync.

---

*Last Updated: 2025-10-16*  
*Schema Version: 1.11*  
*Implementation Status: Planning Phase*
