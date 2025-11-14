# web-ifc-viewer Source Code Location

## Source Code Downloaded

The source code for `web-ifc-viewer` has been cloned into your project:

**Location**: `f:\app.rehome\web-ifc-viewer-source\`

## Key Files

### Edges Implementation
- **Source**: `web-ifc-viewer-source/viewer/src/components/display/edges.ts`
- **Compiled**: `node_modules/web-ifc-viewer/dist/components/display/edges.js`

### Main API
- **Source**: `web-ifc-viewer-source/viewer/src/ifc-viewer-api.ts`
- **Compiled**: `node_modules/web-ifc-viewer/dist/ifc-viewer-api.js`

### All Components
- **Source**: `web-ifc-viewer-source/viewer/src/components/`
- **Compiled**: `node_modules/web-ifc-viewer/dist/components/`

## Project Structure

```
web-ifc-viewer-source/
├── viewer/                    # Main viewer package
│   ├── src/
│   │   ├── components/
│   │   │   ├── display/
│   │   │   │   └── edges.ts   # ← Edges implementation
│   │   │   ├── context/
│   │   │   ├── ifc/
│   │   │   └── ...
│   │   ├── ifc-viewer-api.ts  # ← Main API
│   │   └── ...
│   └── package.json
├── example/                   # Example usage
└── README.md
```

## How to Use the Source Code

### 1. View the TypeScript Source
You can now read the original TypeScript source files instead of the compiled JavaScript:
- Open `web-ifc-viewer-source/viewer/src/components/display/edges.ts` to see how edges work
- Open `web-ifc-viewer-source/viewer/src/ifc-viewer-api.ts` to see the main API

### 2. Understand the Implementation
The source code shows:
- How `edges.create()` works internally
- How `edges.toggle()` manages edge visibility
- The relationship between edges and models
- Material handling and clipping planes

### 3. Modify for Your Needs (Optional)
If you need to customize the viewer:
1. Make changes in `web-ifc-viewer-source/viewer/src/`
2. Build the package: `cd web-ifc-viewer-source/viewer && npm run build`
3. Copy the built files to `node_modules/web-ifc-viewer/dist/` (or use patch-package)

### 4. Reference for API Usage
Use the source code as documentation:
- See method signatures and parameters
- Understand return types
- Learn about internal implementation details

## Git Information

- **Repository**: https://github.com/ThatOpen/web-ifc-viewer
- **Cloned to**: `web-ifc-viewer-source/`
- **Current branch**: `main` (or default branch)

## Note

⚠️ **This is a read-only copy for reference**. The installed package in `node_modules/web-ifc-viewer` is what your app actually uses. If you need to modify the viewer, consider:
1. Using the API as intended
2. Creating wrapper functions (like we did with `useIfcViewerAPI`)
3. Forking the repository and publishing your own version
4. Using patch-package to modify the installed package

## Related Files in Your Project

- **Your custom hook**: `src/apps/team/hooks/useIfcViewerAPI.ts`
- **Your viewer component**: `src/apps/team/components/viewers/Team3DModelViewer.tsx`
- **This documentation**: `WEB_IFC_VIEWER_SOURCE_LOCATION.md`

