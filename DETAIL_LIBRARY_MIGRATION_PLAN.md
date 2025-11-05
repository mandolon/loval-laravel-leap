# Detail Library Migration Plan: Admin → Team Dashboard

## Executive Summary

This plan outlines the migration of the detail library functionality from the admin dashboard to the team dashboard, maintaining the team's hardcoded folder structure while enabling database-backed functionality and adding subfolder management UI.

## Current State Analysis

### Admin Dashboard (`DetailLibraryViewer`)
- ✅ Fully database-backed using `detail_library_categories`, `detail_library_subfolders`, `detail_library_files`, `detail_library_items` tables
- ✅ Uses hooks: `useDetailLibraryCategories`, `useDetailLibrarySubfolders`, `useDetailLibraryFiles`, etc.
- ✅ Features: Card grid view, file preview, search, upload, edit metadata, color tags
- ✅ Has `SubfolderTabs` component with create/delete functionality
- ✅ File structure: `src/components/detail-library/DetailLibraryViewer.tsx`

### Team Dashboard (`DetailLibraryView`)
- ❌ Hardcoded structure with static data
- ❌ Categories: `["Foundation", "Wall", "Floor/Ceiling", "Roof", "Stair", "Finish"]`
- ❌ Nested hardcoded cards in `DETAIL_TAB_CARDS` object
- ❌ No database integration
- ❌ No file upload/preview functionality
- ❌ No subfolder management
- ✅ File structure: `src/apps/team/components/TeamDashboardCore.tsx` (lines 989-1059)

## Migration Strategy

### Phase 1: Database Seeding (Foundation Categories)
**Goal**: Create database records for the Team's hardcoded category structure

**Tasks**:
1. Create migration script/function to seed categories:
   - Foundation
   - Wall  
   - Floor/Ceiling
   - Roof
   - Stair
   - Finish

2. Ensure slug generation matches category names (lowercase, hyphenated)
3. Set `is_system_category: true` for these categories
4. Set appropriate `sort_order` values

**Implementation**:
```typescript
// Migration script or one-time setup function
const TEAM_CATEGORIES = [
  { name: "Foundation", slug: "foundation", sortOrder: 1 },
  { name: "Wall", slug: "wall", sortOrder: 2 },
  { name: "Floor/Ceiling", slug: "floor-ceiling", sortOrder: 3 },
  { name: "Roof", slug: "roof", sortOrder: 4 },
  { name: "Stair", slug: "stair", sortOrder: 5 },
  { name: "Finish", slug: "finish", sortOrder: 6 },
];
```

### Phase 2: Create Team-Focused DetailLibraryView Component
**Goal**: Build new component that combines Team UI structure with database functionality

**Key Requirements**:
1. Use same tab structure as current Team view (`VIEW_TABS`)
2. Fetch categories from database instead of hardcoded
3. Display cards from database (`detail_library_files`)
4. Support subfolders within categories
5. Maintain Team's visual style and layout

**Component Structure**:
```
TeamDetailLibraryView
├── Category Tabs (Foundation, Wall, etc.) - from database
├── SubfolderTabs (All, Root, Custom subfolders + Add button)
├── Card Grid (from database files)
├── File Preview Panel (when card selected)
└── File Details Panel
```

**File Location**: `src/apps/team/components/TeamDetailLibraryView.tsx`

### Phase 3: Subfolder Management UI
**Goal**: Integrate subfolder creation and management into Team view

**UI Design**:
1. **Subfolder Tabs Bar** (below category tabs):
   - "All" tab (shows all files in category)
   - "Root" tab (shows files not in subfolders)
   - Individual subfolder tabs with delete button on hover
   - "+ New Subfolder" button (dashed border, matches Team style)

2. **Create Subfolder Dialog**:
   - Reuse existing `CreateSubfolderDialog` component
   - Style to match Team dashboard aesthetic
   - Position: Modal centered on screen

3. **Subfolder Tab Styling**:
   - Match Team's existing button style
   - Hover state shows delete icon
   - Active state: white background, shadow
   - Inactive state: neutral background

**Implementation**:
- Import `SubfolderTabs` from `@/components/detail-library/SubfolderTabs`
- Import `CreateSubfolderDialog` from `@/components/detail-library/CreateSubfolderDialog`
- Hook up to `useDetailLibrarySubfolders` and `useCreateDetailLibrarySubfolder`

### Phase 4: File Management Integration
**Goal**: Add file upload, preview, and metadata editing

**Features to Add**:
1. **Card Creation**:
   - "+ Add Card" button in card grid (when no card selected)
   - Opens `CreateCardDialog` (reuse from admin)
   - Creates placeholder card in selected category/subfolder

2. **File Upload**:
   - Upload button in preview panel
   - Upload to selected card (creates `detail_library_items`)
   - Multiple file support

3. **File Preview**:
   - Right panel shows preview when card selected
   - Display detail items list below preview
   - Use `SimpleImageViewer` component

4. **Metadata Editing**:
   - Inline title/description editing
   - Color tag selection
   - Author name

**Components to Reuse**:
- `CardButton` - Display cards
- `DetailRowButton` - Display detail items
- `CardEditModal` - Edit card metadata
- `CreateCardDialog` - Create new cards
- `SimpleImageViewer` - Preview files

### Phase 5: UI/UX Alignment
**Goal**: Ensure Team DetailLibraryView matches Team dashboard style

**Style Requirements**:
- Match padding/spacing: `px-6 pt-1 pb-12`
- Use Team's button styles (rounded-xl, border, etc.)
- Match Team's color scheme (slate-200, white/80 backdrop-blur-sm)
- Maintain Team's tab structure with `TabsRow` component
- Keep breadcrumb navigation style

**Layout Structure**:
```
<TeamDetailLibraryView>
  <div className="px-6 pt-1 pb-12">
    <TabsRow /> {/* Category tabs */}
    <SubfolderTabs /> {/* Subfolder tabs */}
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-5"> {/* Card grid */}
        <CardGrid />
      </div>
      <div className="col-span-7"> {/* Preview panel */}
        <PreviewPanel />
      </div>
    </div>
  </div>
</TeamDetailLibraryView>
```

## Implementation Steps

### Step 1: Database Migration
1. Create Supabase migration or one-time script to seed categories
2. Verify categories exist in database
3. Test category fetching with `useDetailLibraryCategories`

### Step 2: Create TeamDetailLibraryView Component
1. Create new file: `src/apps/team/components/TeamDetailLibraryView.tsx`
2. Import necessary hooks and components
3. Set up state management (category, subfolder, selected file)
4. Fetch categories from database
5. Render category tabs using `TabsRow`

### Step 3: Integrate SubfolderTabs
1. Add `useDetailLibrarySubfolders` hook
2. Render `SubfolderTabs` component below category tabs
3. Handle subfolder selection state
4. Filter files by selected subfolder

### Step 4: Replace Hardcoded Cards with Database Cards
1. Remove `DETAIL_TAB_CARDS` dependency
2. Use `useDetailLibraryFiles` with category and subfolder filters
3. Transform database files to card format
4. Render cards using `CardButton` component

### Step 5: Add File Preview & Management
1. Add preview panel layout
2. Implement file selection state
3. Show `SimpleImageViewer` for preview
4. Add upload functionality
5. Add metadata editing

### Step 6: Replace DetailLibraryView in TeamDashboardCore
1. Update import to use new `TeamDetailLibraryView`
2. Remove old hardcoded `DetailLibraryView` component
3. Remove `DETAIL_CATEGORIES` and `DETAIL_TAB_CARDS` constants
4. Test all functionality

## Database Schema Reference

### Categories Table
```sql
detail_library_categories (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL,
  is_system_category boolean DEFAULT false,
  sort_order integer
)
```

### Subfolders Table
```sql
detail_library_subfolders (
  id uuid PRIMARY KEY,
  category_id uuid REFERENCES detail_library_categories(id),
  name text NOT NULL,
  sort_order integer,
  created_by uuid REFERENCES users(id)
)
```

### Files Table
```sql
detail_library_files (
  id uuid PRIMARY KEY,
  category_id uuid REFERENCES detail_library_categories(id),
  subfolder_id uuid REFERENCES detail_library_subfolders(id) NULL,
  title text NOT NULL,
  filename text,
  storage_path text,
  color_tag text,
  description text,
  ...
)
```

## UI Components Reference

### Existing Components to Reuse
- `SubfolderTabs` - Subfolder navigation with create/delete
- `CreateSubfolderDialog` - Modal for creating subfolders
- `CardButton` - Card display component
- `DetailRowButton` - Detail item display
- `CardEditModal` - Card metadata editing
- `CreateCardDialog` - Card creation
- `SimpleImageViewer` - File preview

### Hooks to Use
- `useDetailLibraryCategories()` - Fetch categories
- `useDetailLibrarySubfolders(categoryId)` - Fetch subfolders
- `useDetailLibraryFiles(categoryId, subfolderId)` - Fetch files
- `useDetailLibraryItems(parentFileId)` - Fetch detail items
- `useCreateDetailLibrarySubfolder()` - Create subfolder
- `useCreateDetailCard()` - Create card
- `useUploadDetailItem()` - Upload files to card

## Testing Checklist

- [ ] Categories load from database
- [ ] Category tabs work correctly
- [ ] Subfolders display correctly
- [ ] "Add Subfolder" button opens dialog
- [ ] Subfolder creation works
- [ ] Subfolder deletion works (only when empty)
- [ ] Files filter by subfolder correctly
- [ ] Card grid displays database files
- [ ] Card selection shows preview
- [ ] File upload works
- [ ] Metadata editing works
- [ ] Search functionality works
- [ ] UI matches Team dashboard style
- [ ] Responsive layout works

## Migration Risks & Mitigation

### Risk 1: Data Loss
- **Mitigation**: Ensure migration script is idempotent, use transactions

### Risk 2: UI Mismatch
- **Mitigation**: Create component library comparison, style guide

### Risk 3: Performance
- **Mitigation**: Use React Query caching, optimize queries

### Risk 4: Breaking Changes
- **Mitigation**: Keep old component until new one is fully tested, feature flag

## Success Criteria

1. ✅ Team DetailLibraryView uses database instead of hardcoded data
2. ✅ All Team categories exist in database
3. ✅ Subfolder creation/deletion works
4. ✅ File upload and preview work
5. ✅ UI matches Team dashboard style
6. ✅ No regression in existing functionality
7. ✅ All tests pass

## Next Steps After Migration

1. Add drag-and-drop file upload
2. Add bulk operations (move files between subfolders)
3. Add category-level permissions
4. Add file versioning
5. Add advanced search filters

