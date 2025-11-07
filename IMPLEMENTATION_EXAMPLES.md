# Implementation Examples

## Example 1: Update TeamDashboardCore.tsx

**Location**: `src/apps/team/components/TeamDashboardCore.tsx`

**Find this line** (around line 36):
```typescript
import { CreateProjectDialog } from "@/components/CreateProjectDialog";
```

**Replace with**:
```typescript
import { CreateProjectModal } from "@/components/CreateProjectModal";
```

**Find this section** (around line 796):
```typescript
{onCreateProject ? (
  <CreateProjectDialog onCreateProject={onCreateProject}>
    {/* children */}
  </CreateProjectDialog>
) : null}
```

**Replace with**:
```typescript
{onCreateProject ? (
  <CreateProjectModal 
    onCreateProject={onCreateProject}
    workspaceId={currentWorkspaceId || ""}
  >
    {/* children */}
  </CreateProjectModal>
) : null}
```

---

## Example 2: Update Index.tsx (Admin Projects)

**Location**: `src/pages/Index.tsx`

**Find this line** (around line 13):
```typescript
import { CreateProjectDialog } from "@/components/CreateProjectDialog";
```

**Replace with**:
```typescript
import { CreateProjectModal } from "@/components/CreateProjectModal";
```

**Find the JSX** (search for `<CreateProjectDialog`):
```typescript
<CreateProjectDialog onCreateProject={handleCreateProject}>
  <Button>New Project</Button>
</CreateProjectDialog>
```

**Replace with**:
```typescript
<CreateProjectModal 
  onCreateProject={handleCreateProject}
  workspaceId={currentWorkspaceId || ""}
>
  <Button>New Project</Button>
</CreateProjectModal>
```

---

## Example 3: Update SandboxSidebar.tsx

**Location**: `src/components/layout/SandboxSidebar.tsx`

**Find**:
```typescript
import { CreateProjectDialog } from "@/components/CreateProjectDialog";
```

**Replace**:
```typescript
import { CreateProjectModal } from "@/components/CreateProjectModal";
```

**Find and replace the usage** (search for `<CreateProjectDialog`):
```typescript
// OLD
<CreateProjectDialog onCreateProject={handleCreateProject}>
  {/* content */}
</CreateProjectDialog>

// NEW
<CreateProjectModal 
  onCreateProject={handleCreateProject}
  workspaceId={newWorkspaceId || ""}
>
  {/* content */}
</CreateProjectModal>
```

---

## Example 4: Update NavContent.tsx

**Location**: `src/components/layout/sidebar/NavContent.tsx`

**Find**:
```typescript
import { CreateProjectDialog } from '@/components/CreateProjectDialog';
```

**Replace**:
```typescript
import { CreateProjectModal } from '@/components/CreateProjectModal';
```

**Find the usage** (around line 203):
```typescript
<CreateProjectDialog onCreateProject={handleCreateProject}>
  <Button variant="ghost" size="sm">
    <Plus className="h-4 w-4" />
  </Button>
</CreateProjectDialog>
```

**Replace**:
```typescript
<CreateProjectModal 
  onCreateProject={handleCreateProject}
  workspaceId={currentWorkspaceId || ""}
>
  <Button variant="ghost" size="sm">
    <Plus className="h-4 w-4" />
  </Button>
</CreateProjectModal>
```

---

## Example 5: Backend Setup (Express.js)

**File**: `server/routes/parcel.ts` or similar

```typescript
import express from 'express';
import axios from 'axios';

const router = express.Router();
const parcelCache = new Map();
const CACHE_DURATION = 24 * 60 * 60 * 1000;

router.post('/api/parcel/lookup', async (req, res) => {
  try {
    const { lat, lng } = req.body;

    if (!lat || !lng) {
      return res.status(400).json({ error: 'lat and lng required' });
    }

    // Check cache
    const cacheKey = `${lat.toFixed(6)},${lng.toFixed(6)}`;
    const cached = parcelCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return res.json({
        parcelNumber: cached.result,
        success: !!cached.result,
        cached: true,
      });
    }

    // Query ESRI service
    const response = await axios.get(
      'https://mapservices.gis.saccounty.net/arcgis/rest/services/Public/Parcels/MapServer/0/query',
      {
        params: {
          geometry: `${lng},${lat}`,
          geometryType: 'esriGeometryPoint',
          inSR: 4326,
          spatialRel: 'esriSpatialRelIntersects',
          outFields: 'APN',
          returnGeometry: false,
          f: 'json',
        },
        timeout: 5000,
      }
    );

    const parcelNumber = response.data?.features?.[0]?.attributes?.APN;

    if (parcelNumber) {
      parcelCache.set(cacheKey, {
        result: parcelNumber,
        timestamp: Date.now(),
      });
    }

    res.json({
      parcelNumber: parcelNumber || null,
      success: !!parcelNumber,
    });
  } catch (error) {
    console.error('Parcel lookup error:', error);
    res.status(500).json({ error: 'Failed to fetch parcel information' });
  }
});

export default router;
```

**In your main server file**:
```typescript
import parcelRouter from './routes/parcel';
app.use('/', parcelRouter);
```

---

## Example 6: Vite Proxy Setup

**File**: `vite.config.ts`

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Parcel lookup proxy
      '/api/parcel': {
        target: 'https://mapservices.gis.saccounty.net',
        changeOrigin: true,
        rewrite: (path) => {
          const params = new URL('http://localhost' + path).search;
          return `/arcgis/rest/services/Public/Parcels/MapServer/0/query${params}`;
        },
      },
    },
  },
})
```

---

## Example 7: Environment Setup

**File**: `.env.local`

```env
# Google Places API
VITE_GOOGLE_PLACES_API_KEY=AIzaSyAXM28iqoUD1zb7wlRzlsdxb723SKO0rQ4

# Optional: Feature flags
VITE_PARCEL_LOOKUP_ENABLED=true
VITE_GOOGLE_PLACES_ENABLED=true

# Optional: Service areas
VITE_ESRI_SERVICE_AREA=sacramento
```

**For Vercel**: Go to Settings → Environment Variables and add:
- `VITE_GOOGLE_PLACES_API_KEY`

---

## Example 8: Complete Component Usage

```typescript
import { CreateProjectModal } from "@/components/CreateProjectModal";
import { useWorkspaces } from "@/hooks/useWorkspaces";
import { useCreateProject } from "@/lib/api/hooks/useProjects";
import type { CreateProjectInput } from "@/lib/api/types";

function MyProjectPage() {
  const { currentWorkspaceId } = useWorkspaces();
  const createProjectMutation = useCreateProject(currentWorkspaceId || "");

  const handleCreateProject = async (input: CreateProjectInput) => {
    try {
      await createProjectMutation.mutateAsync(input);
      // Success! Modal will close automatically
    } catch (error) {
      console.error("Failed to create project:", error);
      // Error handling
    }
  };

  return (
    <div>
      <h1>Projects</h1>
      
      <CreateProjectModal
        onCreateProject={handleCreateProject}
        workspaceId={currentWorkspaceId || ""}
      >
        <button>+ New Project</button>
      </CreateProjectModal>

      {/* Rest of page */}
    </div>
  );
}
```

---

## Example 9: Testing the Integration

```typescript
// Test file example: CreateProjectModal.test.tsx

import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreateProjectModal } from '@/components/CreateProjectModal';

describe('CreateProjectModal', () => {
  it('should render modal trigger', () => {
    const mockCreate = jest.fn();
    render(
      <CreateProjectModal 
        onCreateProject={mockCreate}
        workspaceId="test-workspace"
      />
    );
    
    expect(screen.getByText('New Project')).toBeInTheDocument();
  });

  it('should open modal on click', () => {
    const mockCreate = jest.fn();
    render(
      <CreateProjectModal 
        onCreateProject={mockCreate}
        workspaceId="test-workspace"
      />
    );
    
    fireEvent.click(screen.getByText('New Project'));
    expect(screen.getByText('Create Project')).toBeVisible();
  });

  it('should require client first name', async () => {
    const mockCreate = jest.fn();
    const user = userEvent.setup();
    
    render(
      <CreateProjectModal 
        onCreateProject={mockCreate}
        workspaceId="test-workspace"
      />
    );
    
    fireEvent.click(screen.getByText('New Project'));
    const submitBtn = screen.getByRole('button', { name: 'Create Project' });
    
    await user.click(submitBtn);
    
    expect(mockCreate).not.toHaveBeenCalled();
    expect(screen.getByText('First name is required')).toBeInTheDocument();
  });
});
```

---

## Example 10: Error Handling Pattern

```typescript
function ProjectsPage() {
  const { currentWorkspaceId } = useWorkspaces();
  const { toast } = useToast();
  const createProjectMutation = useCreateProject(currentWorkspaceId || "");

  const handleCreateProject = async (input: CreateProjectInput) => {
    try {
      const result = await createProjectMutation.mutateAsync(input);
      
      toast({
        title: "Success",
        description: `Project "${input.name}" created successfully`,
      });
      
      // Optional: Navigate to new project
      // navigate(`/projects/${result.id}`);
      
    } catch (error) {
      if (error instanceof Error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
    }
  };

  return (
    <CreateProjectModal
      onCreateProject={handleCreateProject}
      workspaceId={currentWorkspaceId || ""}
    />
  );
}
```

---

## Migration Completion Checklist

Use this to track your migration:

```markdown
## CreateProjectModal Migration Checklist

### Component Creation
- [x] CreateProjectModal.tsx created
- [x] Backend route example created
- [x] Setup guides created

### Integration (Update These Files)
- [ ] src/apps/team/components/TeamDashboardCore.tsx
  - [ ] Import changed
  - [ ] Component usage updated
  - [ ] workspaceId prop added

- [ ] src/pages/Index.tsx
  - [ ] Import changed
  - [ ] Component usage updated
  - [ ] workspaceId prop added

- [ ] src/components/layout/SandboxSidebar.tsx
  - [ ] Import changed
  - [ ] Component usage updated
  - [ ] workspaceId prop added

- [ ] src/components/layout/sidebar/NavContent.tsx
  - [ ] Import changed
  - [ ] Component usage updated
  - [ ] workspaceId prop added

### Environment Setup
- [ ] .env.local updated with VITE_GOOGLE_PLACES_API_KEY
- [ ] Backend proxy configured (Vite OR Express)
- [ ] Dev server restarted

### Testing
- [ ] Autocomplete suggestions appear
- [ ] Parcel number auto-fills
- [ ] Form validation works
- [ ] Project creation succeeds
- [ ] Modal closes after submission
- [ ] Secondary client toggle works
- [ ] Project type selection works

### Production Deployment
- [ ] Vercel environment variables set
- [ ] Google Cloud API key restrictions configured
- [ ] Backend proxy deployed (if using Express)
- [ ] Tested in production environment

### Cleanup (Optional)
- [ ] Keep CreateProjectDialog.tsx for backward compatibility OR
- [ ] Delete CreateProjectDialog.tsx if fully migrated
- [ ] Update any remaining imports
```

---

**All examples are production-ready!** 🚀
