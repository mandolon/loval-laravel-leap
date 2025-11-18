# Lovable Prompt: AI Identity System Implementation

## Overview
Implement a comprehensive AI identity system that allows:
1. **Workspace-level AI instructions** - Custom AI behavior rules for the entire workspace
2. **Project-level AI context** - Structured project metadata to enhance AI assistance

## Phase 1: Database Schema

Create migration: `supabase/migrations/YYYYMMDDHHMMSS_ai_identity_system.sql`

```sql
-- Add workspace-level AI instructions
ALTER TABLE workspace_settings 
ADD COLUMN ai_instructions TEXT DEFAULT NULL;

-- Add project-level AI context
ALTER TABLE projects 
ADD COLUMN project_type TEXT,
ADD COLUMN ai_identity JSONB DEFAULT '{}'::jsonb;

-- Create indexes for performance
CREATE INDEX idx_projects_project_type ON projects(project_type);
CREATE INDEX idx_projects_ai_identity ON projects USING GIN (ai_identity);
```

## Phase 2: TypeScript Types

Update `src/lib/api/types.ts`:

```typescript
export interface ProjectAIIdentity {
  projectType: string;
  jurisdiction: string;
  projectScope: string;
  zoning: string;
  lotSize: number;
  existingSqft: number;
  proposedSqft: number;
  setbacks: {
    front: number;
    rear: number;
    side: number;
  };
  heightLimit: number;
  requiredCompliance: string[];
  requiredConsultants: string[];
  nextSteps: string[];
  blockers: string[];
  openQuestions: string[];
}

// Update existing interfaces:
export interface Project {
  // ... existing fields ...
  project_type?: string;
  ai_identity?: ProjectAIIdentity;
}

export interface WorkspaceSettings {
  // ... existing fields ...
  ai_instructions?: string;
}
```

## Phase 3: Core Components

### 3.1 AIContextPanel Component
Create `src/apps/team/components/ProjectSettings/AIContextPanel.tsx`:

**Requirements:**
- Three sections: Project Details, Regulatory, Current Status
- Use conditional rendering based on `activeTab` prop (NOT Tabs component)
- Auto-populate from existing project data:
  - `jurisdiction` from `project.address`
  - `lotSize` from `project.assessorParcelInfo?.lotSize`
  - `zoning` from `project.assessorParcelInfo?.zoning`
- Include helper for array inputs (tags)
- Project type lookup for consultant/timeline suggestions
- Props: `{ project, activeTab, onTabChange, onUpdate }`
- TypeScript casting: `const savedIdentity = (project.ai_identity as ProjectAIIdentity) || {} as ProjectAIIdentity;`

**Key Fields per Section:**

**Project Details:**
- projectType (dropdown: Addition, ADU, Full Remodel, New Construction, Renovation)
- jurisdiction (text)
- projectScope (textarea)
- zoning (text)
- lotSize (number)
- existingSqft (number)
- proposedSqft (number)
- setbacks (front/rear/side numbers)
- heightLimit (number)

**Regulatory:**
- requiredCompliance (tag array)
- requiredConsultants (tag array)

**Current Status:**
- nextSteps (tag array)
- blockers (tag array)
- openQuestions (tag array)

### 3.2 ProjectAIContextView Component
Create `src/apps/team/components/ProjectAIContextView.tsx`:

**Requirements:**
- Two-column layout matching Project Info tab pattern
- Grid: `lg:grid-cols-[340px_minmax(0,1fr)] xl:grid-cols-[380px_minmax(0,1fr)]`
- Left column: Title and description
- Right column: AIContextPanel component
- Manage `aiSection` state from URL searchParams
- Save handler that updates Supabase `projects.ai_identity`
- Toast notifications for success/error
- QueryClient invalidation after save

**Layout Structure:**
```tsx
<div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)] xl:grid-cols-[380px_minmax(0,1fr)]">
  <div>
    <h2>AI Project Context</h2>
    <p>Configure AI understanding...</p>
  </div>
  <div>
    <AIContextPanel 
      project={project}
      activeTab={aiSection}
      onTabChange={setAiSection}
      onUpdate={handleSave}
    />
  </div>
</div>
```

### 3.3 AIContextNavigation Component
Create `src/apps/team/components/AIContextNavigation.tsx`:

**Requirements:**
- Panel navigation component (matches ProjectInfoNavigation pattern)
- Three navigation buttons:
  - Project Details (FileText icon)
  - Regulatory (Scale icon)
  - Current Status (Activity icon)
- Updates `aiSection` URL searchParam on click
- Active state styling
- Match ProjectPanelTheme styling

## Phase 4: Integration

### 4.1 Update TeamDashboardCore
In `src/apps/team/components/TeamDashboardCore.tsx`:

```typescript
import { ProjectAIContextView } from './ProjectAIContextView';

// Add check:
const isAITabActive = projectPanelTab === 'ai';

// In main viewer area (where content displays):
{isAITabActive ? (
  <ProjectAIContextView 
    projectId={projectId} 
    workspaceId={workspaceId} 
  />
) : isProjectInfoActive ? (
  <ProjectInfoContent ... />
) : ...}
```

### 4.2 Update ProjectPanel
In `src/apps/team/components/ProjectPanel.tsx`:

**Add AI Tab Button:**
```tsx
<button
  onClick={() => onTabChange('ai')}
  className={...}
  style={{
    backgroundColor: tab === "ai" ? '#8B5CF6' : 'transparent',
    ...
  }}
>
  <svg>...</svg> {/* Purple AI icon */}
  AI
</button>
```

**Add Panel Navigation Routing:**
```tsx
import { AIContextNavigation } from './AIContextNavigation';

// In panel content area:
{tab === "ai" ? (
  <AIContextNavigation />
) : tab === "info" ? (
  <ProjectInfoNavigation />
) : ...}
```

## Phase 5: AI Context Builder Integration

Update `src/ai/context-builder.ts` (if not already done):

```typescript
function formatProjectAIIdentity(identity: ProjectAIIdentity): string {
  // Format JSONB data as readable text
  // Include all fields with labels
}

export async function buildAIContext(projectId: string): Promise<string> {
  // Fetch project with ai_identity
  // Call formatProjectAIIdentity()
  // Include in context
}

export async function buildWorkspaceContext(workspaceId: string): Promise<string> {
  // Fetch workspace_settings.ai_instructions
  // Include in context
}
```

## Phase 6: Workspace AI Settings (Optional Enhancement)

Add to Settings → AI Assistant section:
- Textarea for `workspace_settings.ai_instructions`
- Preset buttons (e.g., "Residential Architecture")
- Save handler updating Supabase

## Design Requirements

### Layout Pattern
- **Main content area**: ProjectAIContextView (two-column layout)
- **Right panel**: AIContextNavigation (navigation buttons)
- Match existing Project Info tab pattern exactly

### Visual Style
- AI tab icon: Purple (#8B5CF6)
- Active state: Purple background on tab button
- Navigation buttons: Match ProjectPanelTheme
- Forms: Use shadcn/ui Card, Button, Input, Textarea components
- Icons: lucide-react (FileText, Scale, Activity)

### User Flow
1. User clicks AI tab (purple icon) in ProjectPanel
2. Panel shows three navigation buttons (Project Details, Regulatory, Current Status)
3. Main area shows two-column layout with form content
4. Auto-population occurs from existing project data
5. User fills out sections
6. Click "Save Project Context"
7. Toast notification confirms save
8. Data persists to `projects.ai_identity` as JSONB

## Testing Checklist

- [ ] Migration applies successfully
- [ ] AI tab button appears between Info and Settings tabs
- [ ] Clicking AI tab shows navigation in panel, content in main area
- [ ] Navigation buttons switch between three sections
- [ ] Auto-population works (jurisdiction, lotSize, zoning)
- [ ] All form fields save correctly
- [ ] JSONB data persists in database
- [ ] Toast notifications appear
- [ ] AI chat includes project context in prompts
- [ ] Workspace instructions affect AI behavior

## Key Implementation Notes

1. **NO Tabs Component**: Use conditional rendering based on `activeTab` prop
2. **Type Casting**: Cast `project.ai_identity` to `ProjectAIIdentity` to avoid TypeScript errors
3. **Two-Component Pattern**: 
   - AIContextNavigation = panel buttons
   - ProjectAIContextView = main content
4. **URL State**: Use searchParams for `aiSection` navigation
5. **JSONB Storage**: Store full ProjectAIIdentity object as JSONB
6. **Auto-Population**: Use optional chaining for safe property access

## Success Criteria

✅ AI tab navigable with proper routing  
✅ Three sections accessible via panel navigation  
✅ Form auto-populates from project data  
✅ Data saves to database as JSONB  
✅ AI context builder formats and includes data  
✅ Layout matches Project Info tab pattern  
✅ No TypeScript errors  
✅ Toast notifications work  

---

**Implementation Order:**
1. Apply database migration
2. Update TypeScript types
3. Create AIContextPanel (form component)
4. Create ProjectAIContextView (wrapper)
5. Create AIContextNavigation (panel nav)
6. Integrate into TeamDashboardCore
7. Integrate into ProjectPanel
8. Test end-to-end workflow
