# 3D Model Viewer Persistence - Database Setup

## Overview
Need to persist 3D model viewer state (dimensions, annotations, section cuts, camera views) so they're saved across sessions and visible to all team members.

## Required Supabase Tables

### 1. model_dimensions
```sql
CREATE TABLE model_dimensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES model_versions(id) ON DELETE CASCADE,
  dimension_data JSONB NOT NULL,
  label TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_model_dimensions_version ON model_dimensions(version_id);
```

### 2. model_annotations
```sql
CREATE TABLE model_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES model_versions(id) ON DELETE CASCADE,
  position JSONB NOT NULL,
  text TEXT NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_model_annotations_version ON model_annotations(version_id);
```

### 3. model_clipping_planes
```sql
CREATE TABLE model_clipping_planes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES model_versions(id) ON DELETE CASCADE,
  plane_data JSONB NOT NULL,
  name TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_model_clipping_planes_version ON model_clipping_planes(version_id);
```

### 4. model_camera_views
```sql
CREATE TABLE model_camera_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES model_versions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position JSONB NOT NULL,
  target JSONB NOT NULL,
  zoom FLOAT NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_model_camera_views_version ON model_camera_views(version_id);
```

## RLS Policies (Apply to All 4 Tables)

```sql
-- Enable RLS
ALTER TABLE model_dimensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_clipping_planes ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_camera_views ENABLE ROW LEVEL SECURITY;

-- SELECT: Users can view if they're project members
CREATE POLICY "view_model_state" ON model_dimensions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM model_versions mv
    JOIN projects p ON mv.project_id = p.id
    JOIN project_members pm ON p.id = pm.project_id
    WHERE mv.id = model_dimensions.version_id AND pm.user_id = auth.uid()
  )
);

-- INSERT: Users can create if they're project members
CREATE POLICY "create_model_state" ON model_dimensions FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM model_versions mv
    JOIN projects p ON mv.project_id = p.id
    JOIN project_members pm ON p.id = pm.project_id
    WHERE mv.id = model_dimensions.version_id AND pm.user_id = auth.uid()
  )
);

-- UPDATE: Users can update their own entries
CREATE POLICY "update_model_state" ON model_dimensions FOR UPDATE
USING (created_by = auth.uid());

-- DELETE: Users can delete their own entries or if they're project members
CREATE POLICY "delete_model_state" ON model_dimensions FOR DELETE
USING (
  created_by = auth.uid() OR
  EXISTS (
    SELECT 1 FROM model_versions mv
    JOIN projects p ON mv.project_id = p.id
    JOIN project_members pm ON p.id = pm.project_id
    WHERE mv.id = model_dimensions.version_id AND pm.user_id = auth.uid()
  )
);

-- Repeat these 4 policies for: model_annotations, model_clipping_planes, model_camera_views
-- (Just replace table name in policy definitions)
```

## Implementation Status
✅ TypeScript types added to `src/lib/api/types.ts`
✅ API hooks created in `src/lib/api/hooks/useModelViewerState.ts`
✅ Team3DModelViewer updated to use persistence hooks
✅ versionId prop passed through component tree
✅ Save Camera View button added to ViewerToolbar

## Next Steps for Full Implementation
1. **Create the 4 tables above in Supabase** (this note)
2. **Set up RLS policies** (this note)
3. Wire up dimension creation to call `saveDimensionMutation` in Team3DModelViewer
4. Wire up annotation save/update/delete to call mutation hooks
5. Wire up clipping plane creation to call `saveClippingPlaneMutation`
6. Implement camera view save handler in Team3DModelViewer
7. Add saved clipping planes restoration logic on model load
8. Test cross-session persistence and team member visibility

## Key Files Modified
- `src/lib/api/types.ts` - Added 4 new types
- `src/lib/api/hooks/useModelViewerState.ts` - New file with all hooks
- `src/apps/team/components/viewers/Team3DModelViewer.tsx` - Added hooks, props
- `src/apps/team/components/TeamDashboardCore.tsx` - Pass versionId prop
- `src/apps/team/components/viewers/3d-viewer/ViewerToolbar.tsx` - Added save view button
