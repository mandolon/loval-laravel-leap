# web-ifc-viewer Fork Setup Guide

## Overview

Your project is now configured to use the local `web-ifc-viewer` source code instead of the npm package. This allows you to modify the viewer source code directly.

## How It Works

1. **Vite Alias**: The `vite.config.ts` automatically detects if `web-ifc-viewer-source/` exists
2. **Direct Source Usage**: When detected, all imports of `web-ifc-viewer` are redirected to the local TypeScript source
3. **Hot Reload**: Changes to the source code are automatically picked up by Vite during development

## Project Structure

```
app.rehome/
├── web-ifc-viewer-source/          # Cloned source code
│   └── viewer/
│       ├── src/                    # TypeScript source files
│       │   ├── components/
│       │   │   └── display/
│       │   │       └── edges.ts    # ← Modify edges here!
│       │   ├── ifc-viewer-api.ts   # Main API
│       │   └── index.ts
│       └── package.json
├── src/
│   └── apps/team/components/viewers/
│       └── Team3DModelViewer.tsx   # Your viewer component
└── vite.config.ts                  # Contains fork detection
```

## Making Modifications

### 1. Edit the Source Code

Open and edit files in `web-ifc-viewer-source/viewer/src/`:

**Example: Modify edges behavior**
```typescript
// web-ifc-viewer-source/viewer/src/components/display/edges.ts

export class Edges {
  // Change the default threshold
  threshold = 15; // Changed from 30
  
  // Modify the create method
  create(name: string, modelID: number, lineMaterial: Material, material?: Material) {
    // Your custom logic here
    const model = this.context.items.ifcModels.find((model) => model.modelID === modelID);
    if (!model) return;
    
    // Add custom behavior
    console.log('Creating edges with custom logic!');
    
    this.createFromMesh(name, model, lineMaterial, material);
  }
}
```

### 2. Changes Are Auto-Detected

- **Development**: Vite automatically recompiles when you save changes
- **No rebuild needed**: TypeScript is compiled on-the-fly by Vite
- **Hot reload**: Your app will automatically refresh with changes

### 3. Test Your Changes

1. Start the dev server: `npm run dev`
2. Make changes to `web-ifc-viewer-source/viewer/src/`
3. Save the file
4. Check the browser - changes should appear automatically

## Available Scripts

```bash
# Build the viewer source (optional - Vite handles it automatically)
npm run build:web-ifc-viewer

# Watch mode for the viewer (if you want separate TypeScript compilation)
npm run watch:web-ifc-viewer

# Start your app (uses the fork automatically)
npm run dev
```

## Key Files to Modify

### Edges Implementation
- **File**: `web-ifc-viewer-source/viewer/src/components/display/edges.ts`
- **What to modify**: Edge creation, threshold, material handling

### Main API
- **File**: `web-ifc-viewer-source/viewer/src/ifc-viewer-api.ts`
- **What to modify**: API initialization, tool setup

### Context/Scene
- **File**: `web-ifc-viewer-source/viewer/src/components/context/`
- **What to modify**: Scene management, rendering

## Troubleshooting

### Changes Not Appearing?

1. **Check Vite console**: Look for the message:
   ```
   ✅ Using local web-ifc-viewer source from: ...
   ```

2. **Restart dev server**: Sometimes needed after first setup
   ```bash
   npm run dev
   ```

3. **Clear Vite cache**:
   ```bash
   rm -rf node_modules/.vite
   npm run dev
   ```

### TypeScript Errors?

The source code uses TypeScript. Vite handles compilation, but if you see errors:

1. Check that dependencies are installed:
   ```bash
   cd web-ifc-viewer-source/viewer
   npm install --legacy-peer-deps
   ```

2. Check TypeScript version compatibility in `web-ifc-viewer-source/viewer/tsconfig.json`

### Want to Use npm Package Again?

Simply remove or rename the `web-ifc-viewer-source/` directory:
```bash
mv web-ifc-viewer-source web-ifc-viewer-source.backup
```

Vite will automatically fall back to the npm package.

## Example: Adding Black Edges by Default

Here's how you could modify the edges to enable by default:

```typescript
// web-ifc-viewer-source/viewer/src/components/display/edges.ts

createFromMesh(name: string, mesh: Mesh, lineMaterial: Material, material?: Material) {
  // ... existing code ...
  
  this.edges[name] = {
    edges: new LineSegments(geo, lineMaterial),
    originalMaterials: mesh.material,
    baseMaterial: material,
    model: mesh,
    active: true  // ← Changed from false to true
  };
  
  // Auto-enable edges when created
  this.toggle(name, true);
}
```

## Git Considerations

The `web-ifc-viewer-source/` directory is **not** in `.gitignore` by default. You have two options:

### Option 1: Commit the Fork (Recommended for team)
```bash
git add web-ifc-viewer-source/
git commit -m "Add web-ifc-viewer fork for customization"
```

### Option 2: Ignore the Fork
Add to `.gitignore`:
```
web-ifc-viewer-source/
```

Then document that team members need to clone it separately.

## Next Steps

1. ✅ Source code is cloned and ready
2. ✅ Vite is configured to use the fork
3. 🎨 Start modifying `web-ifc-viewer-source/viewer/src/`
4. 🚀 Run `npm run dev` and see your changes!

## Related Documentation

- `WEB_IFC_VIEWER_SOURCE_LOCATION.md` - Source code location details
- `WEB_IFC_VIEWER_SOURCE_ACCESS.md` - How to access the source

