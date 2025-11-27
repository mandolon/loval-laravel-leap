# Active Projects - Testing Guide

## Manual Testing Checklist

### Prerequisites
- [ ] Access to workspace with at least 3 active projects
- [ ] Browser dev tools open (Console + Network tabs)
- [ ] Test user has permission to edit projects

### Test 1: Initial Load
**Expected**: Projects load from database and display correctly

1. Navigate to Team Home page
2. Verify "Active Projects" card appears
3. Check loading spinner shows briefly
4. Confirm all active projects appear in list
5. Verify project names display (street address or project name)
6. Check phase badges show correct colors
7. Confirm "Next Milestone" labels appear (if todos exist)

**Pass Criteria**:
- No console errors
- Projects load within 2 seconds
- All UI elements render correctly
- Data matches database records

---

### Test 2: Phase Toggle
**Expected**: Clicking phase badge updates database

1. Click on any project's phase badge (colored pill)
2. Verify phase popover opens
3. Click different phase option
4. Confirm popover closes
5. Check phase badge updates immediately
6. Verify toast notification shows "Success"
7. Refresh page and confirm change persisted

**Network Check**:
- `PATCH` request to `/rest/v1/projects`
- Response status: `200 OK`
- `phase` field updated in response

**Pass Criteria**:
- UI updates instantly
- Database updated (verify with refresh)
- No console errors
- Toast shows success message

---

### Test 3: Open Focus List
**Expected**: Clicking milestone opens todo panel

1. Click "Next Milestone" button on any project
2. Verify focus list panel opens to the right
3. Check pointer arrow points to milestone button
4. Confirm panel contains existing todos
5. Verify todos show correct completion status
6. Check panel scrolls if many todos exist
7. Click outside panel to close
8. Confirm panel closes smoothly

**Pass Criteria**:
- Panel opens at correct position
- Arrow points to correct element
- Todos load from metadata
- Panel is keyboard accessible

---

### Test 4: Add Todo
**Expected**: New todos can be created and saved

1. Open focus list for any project
2. Click "Add to-do" button
3. Verify new todo appears in edit mode
4. Type new todo text
5. Press Enter or click outside
6. Confirm todo saves with new text
7. Refresh page
8. Reopen focus list
9. Verify todo persisted

**Network Check**:
- `PATCH` request to `/rest/v1/workspace_settings`
- `metadata` field contains new todo

**Pass Criteria**:
- Todo creates instantly
- Edit mode works correctly
- Data persists to database
- No duplicate todos created

---

### Test 5: Toggle Todo Completion
**Expected**: Checking/unchecking saves state

1. Open focus list with multiple todos
2. Check an uncompleted todo
3. Verify checkbox fills instantly
4. Observe text gets strikethrough style
5. Uncheck the same todo
6. Verify checkbox empties
7. Close and reopen focus list
8. Confirm completion state persisted

**Pass Criteria**:
- Checkbox updates immediately
- Visual feedback correct
- State saves to metadata
- Next milestone updates if needed

---

### Test 6: Edit Todo
**Expected**: Todo text can be modified

1. Open focus list
2. Click on todo text (not checkbox)
3. Verify text becomes editable input
4. Modify the text
5. Press Enter or click outside
6. Confirm text updates
7. Close focus list
8. Reopen and verify change persisted

**Pass Criteria**:
- Edit mode activates on click
- Input shows current text
- Enter key saves
- Click outside saves
- Database updated

---

### Test 7: Delete Todo
**Expected**: Todos can be removed

1. Open focus list with multiple todos
2. Hover over a todo
3. Verify trash icon appears
4. Click trash icon
5. Confirm todo disappears immediately
6. Close and reopen focus list
7. Verify todo still deleted

**Pass Criteria**:
- Delete icon visible on hover
- Todo removes from list
- Metadata updated
- Next milestone recalculates

---

### Test 8: Reorder Todos
**Expected**: Drag to reorder within focus list

1. Open focus list with 3+ todos
2. Hover over drag handle (left side)
3. Click and drag todo up or down
4. Release to drop
5. Verify todo moved to new position
6. Close and reopen focus list
7. Confirm order persisted

**Pass Criteria**:
- Drag handle shows cursor change
- Visual feedback during drag
- Smooth drop animation
- Order saves to metadata

---

### Test 9: Drag Reorder Projects (Priority Mode)
**Expected**: Projects can be reordered by dragging

1. Verify sort mode is "Priority"
2. Click and hold drag handle on left of project row
3. Drag project up or down
4. Release to drop in new position
5. Verify project moved
6. Refresh page
7. Confirm order persisted

**Network Check**:
- `PATCH` request to workspace_settings
- `metadata.projectOrder.projectIds` updated

**Pass Criteria**:
- Drag only works in Priority mode
- Visual drag preview shows
- Order persists to database
- Smooth animations

---

### Test 10: Sort by Status
**Expected**: Projects sort by phase

1. Click sort dropdown
2. Select "Status"
3. Verify projects reorder
4. Confirm order: Pre-Design → Design → Permit → Build
5. Verify drag handles are hidden
6. Try to drag a project
7. Confirm drag does not work

**Pass Criteria**:
- Projects sort correctly
- Drag disabled in this mode
- Visual indication of sort mode
- No errors

---

### Test 11: Sort by Started Date
**Expected**: Projects sort chronologically

1. Click sort dropdown
2. Select "Started"
3. Verify projects reorder oldest to newest
4. Confirm drag handles hidden
5. Switch back to "Priority"
6. Verify custom order restored

**Pass Criteria**:
- Date sorting correct
- Drag disabled
- Priority order preserved

---

### Test 12: Empty State
**Expected**: Graceful handling of no projects

1. Set all workspace projects to non-active status
2. Navigate to Team Home
3. Verify "No active projects" message shows
4. Confirm no console errors
5. Check UI remains stable

**Pass Criteria**:
- Empty state message clear
- No layout breaks
- Sort dropdown still works
- No loading spinner stuck

---

### Test 13: Loading State
**Expected**: Loading indicator while fetching

1. Throttle network to "Slow 3G" in dev tools
2. Refresh page
3. Verify loading spinner appears
4. Confirm "Loading projects..." text shows
5. Wait for data to load
6. Verify smooth transition to content

**Pass Criteria**:
- Loading state shows immediately
- No flash of empty content
- Smooth transition
- No layout shift

---

### Test 14: Concurrent Updates
**Expected**: Multiple users editing same workspace

**Setup**: Two browser windows logged in as different users

1. Window A: Open focus list for Project 1
2. Window B: Update phase of Project 1
3. Window A: Add a todo
4. Window A: Close and reopen focus list
5. Verify Window A sees phase update from Window B
6. Window B: Refresh
7. Verify Window B sees todo from Window A

**Pass Criteria**:
- React Query refetches on focus
- No data conflicts
- Last write wins
- No errors in either window

---

### Test 15: Network Errors
**Expected**: Graceful error handling

1. Open dev tools Network tab
2. Set network to "Offline"
3. Try to update a project phase
4. Verify error toast appears
5. Reconnect network
6. Retry the update
7. Confirm it works

**Pass Criteria**:
- Error toast shows clear message
- UI doesn't break
- Retry works
- No stale data displayed

---

### Test 16: Large Dataset
**Expected**: Performance with many projects

**Setup**: Workspace with 20+ active projects

1. Navigate to Team Home
2. Measure load time (should be < 3 seconds)
3. Scroll through project list
4. Verify smooth scrolling
5. Drag a project from top to bottom
6. Confirm no lag
7. Open focus list
8. Add 10 todos
9. Drag reorder todos
10. Verify performance acceptable

**Pass Criteria**:
- Initial load < 3 seconds
- Smooth scrolling
- No jank during drag
- Todo operations responsive

---

### Test 17: Mobile Responsive
**Expected**: Works on mobile devices

1. Open Chrome DevTools mobile emulation
2. Test on iPhone SE (375px)
3. Verify layout adapts
4. Test drag on touch device
5. Check focus list positioning
6. Verify buttons are touch-friendly (44px min)
7. Test landscape orientation

**Pass Criteria**:
- No horizontal scroll
- Text readable
- Buttons tappable
- Touch drag works
- Popover positions correctly

---

### Test 18: Keyboard Navigation
**Expected**: Keyboard accessible

1. Tab through project list
2. Verify focus indicators visible
3. Press Enter on phase badge
4. Navigate phase options with arrows
5. Press Enter to select
6. Tab to milestone button
7. Press Enter to open focus list
8. Tab through todos
9. Press Space to toggle checkbox
10. Press Escape to close panel

**Pass Criteria**:
- All interactive elements focusable
- Focus indicators clear
- Enter/Space work for actions
- Escape closes popovers
- No keyboard traps

---

## Automated Testing (Future)

### Unit Tests (Jest + RTL)
```typescript
describe('ActiveProjectsList', () => {
  it('renders loading state');
  it('renders empty state');
  it('filters to active projects only');
  it('sorts by priority/status/started');
  it('handles project phase update');
  it('persists project order to metadata');
});

describe('FocusListPanel', () => {
  it('loads todos from metadata');
  it('adds new todo');
  it('toggles todo completion');
  it('edits todo text');
  it('deletes todo');
  it('reorders todos');
  it('closes on outside click');
});
```

### Integration Tests (Playwright)
```typescript
test('end-to-end project management workflow', async ({ page }) => {
  // 1. Navigate to Team Home
  // 2. Verify projects load
  // 3. Update project phase
  // 4. Open focus list
  // 5. Add and complete todo
  // 6. Drag reorder projects
  // 7. Refresh and verify persistence
});
```

### Performance Tests
- Lighthouse score > 90
- First Contentful Paint < 1.5s
- Time to Interactive < 3s
- No memory leaks during drag operations

---

## Bug Report Template

```markdown
**Bug Title**: Brief description

**Severity**: Critical / High / Medium / Low

**Steps to Reproduce**:
1. Step one
2. Step two
3. Step three

**Expected Behavior**: What should happen

**Actual Behavior**: What actually happened

**Screenshots**: (if applicable)

**Environment**:
- Browser: Chrome 120.0.6099.109
- OS: Windows 11
- Workspace ID: xyz-123
- User Role: Admin/Member

**Console Errors**: (paste errors)

**Network Tab**: (relevant requests)

**Additional Context**: Any other info
```

---

## Test Data Setup

### SQL to Create Test Projects
```sql
-- Create 5 active projects for testing
INSERT INTO projects (workspace_id, name, status, phase, address)
VALUES
  ('your-workspace-id', '123 Main St', 'active', 'Pre-Design', '{"streetNumber": "123", "streetName": "Main St"}'::jsonb),
  ('your-workspace-id', '456 Oak Ave', 'active', 'Design', '{"streetNumber": "456", "streetName": "Oak Ave"}'::jsonb),
  ('your-workspace-id', '789 Pine Rd', 'active', 'Permit', '{"streetNumber": "789", "streetName": "Pine Rd"}'::jsonb),
  ('your-workspace-id', '321 Elm Dr', 'active', 'Build', '{"streetNumber": "321", "streetName": "Elm Dr"}'::jsonb),
  ('your-workspace-id', 'Mountain Cabin', 'active', 'Pre-Design', '{}'::jsonb);
```

### Reset Metadata (for clean tests)
```sql
UPDATE workspace_settings
SET metadata = '{}'::jsonb
WHERE workspace_id = 'your-workspace-id';
```

---

**Last Updated**: December 2024  
**Test Coverage**: Manual (100%), Automated (0% - planned)  
**Status**: Ready for QA ✅
