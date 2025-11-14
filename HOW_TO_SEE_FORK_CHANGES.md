# How to See Your Fork Changes

## ✅ No Separate Build Needed!

With the Vite setup, **you don't need to build the fork source separately**. Vite automatically compiles the TypeScript source on-the-fly during development.

## How It Works

1. **You run your normal dev server**:
   ```bash
   npm run dev
   ```

2. **Vite automatically**:
   - Detects the fork source exists
   - Compiles TypeScript from `web-ifc-viewer-source/viewer/src/` on-the-fly
   - Uses hot module replacement (HMR) to update changes instantly

3. **When you edit the fork source**:
   - Save the file
   - Vite recompiles automatically
   - Browser updates automatically (hot reload)

## Step-by-Step: Making and Seeing Changes

### 1. Start Your Dev Server
```bash
npm run dev
```

Look for this in the console:
```
✅ Using local web-ifc-viewer source from: ...
```

### 2. Make a Change to the Fork Source

Edit `web-ifc-viewer-source/viewer/src/components/display/edges.ts`:

```typescript
// web-ifc-viewer-source/viewer/src/components/display/edges.ts

create(name: string, modelID: number, lineMaterial: Material, material?: Material) {
  // Add a visible change
  console.log('🎨 MY CUSTOM CHANGE - Creating edges!', name);
  
  const model = this.context.items.ifcModels.find((model) => model.modelID === modelID);
  if (!model) return;
  this.createFromMesh(name, model, lineMaterial, material);
}
```

### 3. Save the File

Just save (Ctrl+S or Cmd+S). Vite will:
- Detect the change
- Recompile automatically
- Update the browser

### 4. Test It

1. Load a 3D model in your app
2. Check the browser console
3. You should see: `🎨 MY CUSTOM CHANGE - Creating edges!`

## Visual Example

Let's make a more visible change - modify the edge threshold:

```typescript
// web-ifc-viewer-source/viewer/src/components/display/edges.ts

export class Edges {
  threshold = 15; // Changed from 30 to 15 - edges will be more detailed!
  
  // ... rest of code
}
```

**Result**: Edges will have more detail (more lines) because the threshold is lower.

## Troubleshooting

### Changes Not Appearing?

1. **Check Vite is using the fork**:
   - Look for: `✅ Using local web-ifc-viewer source from: ...`
   - If you don't see this, the fork isn't active

2. **Restart the dev server**:
   ```bash
   # Stop (Ctrl+C)
   npm run dev
   ```

3. **Clear Vite cache** (if needed):
   ```bash
   rm -rf node_modules/.vite
   npm run dev
   ```

4. **Hard refresh browser**:
   - Ctrl+Shift+R (Windows/Linux)
   - Cmd+Shift+R (Mac)

### Want to Build Separately? (Optional)

If you want to build the fork source separately (not needed, but available):

```bash
# Build the fork source
npm run build:web-ifc-viewer

# Watch mode (auto-rebuild on changes)
npm run watch:web-ifc-viewer
```

But **you don't need this** - Vite handles it automatically!

## Real Example: Enable Edges by Default

Let's modify the fork to enable edges automatically:

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
  
  // Auto-enable when created
  this.toggle(name, true);  // ← Add this line
}
```

**Steps:**
1. Make the change above
2. Save the file
3. Vite recompiles automatically
4. Reload your app
5. Edges should now be enabled by default!

## Summary

- ✅ **No separate build needed** - Vite compiles TypeScript automatically
- ✅ **Changes appear instantly** - Save file → See changes in browser
- ✅ **Just edit and save** - That's it!
- ✅ **Hot reload works** - Browser updates automatically

Just run `npm run dev` and start editing the fork source - you'll see changes immediately!

