# How to Verify the Fork is Active

## Quick Check

When you run `npm run dev`, look for this message in the console:

```
🔍 web-ifc-viewer fork detection: { hasWebIfcViewerFork: true, ... }
✅ Using local web-ifc-viewer source from: ...
```

If you see these messages, **the fork is active!**

## Current Status

✅ **Fork source exists**: `web-ifc-viewer-source/viewer/src/`
✅ **Vite config updated**: Aliases are configured
✅ **Import statement**: Your code imports from `web-ifc-viewer`

## To Activate the Fork

1. **Restart your dev server** (if it's already running):
   ```bash
   # Stop the current server (Ctrl+C)
   npm run dev
   ```

2. **Check the console output** - You should see:
   ```
   🔍 web-ifc-viewer fork detection: { hasWebIfcViewerFork: true, ... }
   ✅ Using local web-ifc-viewer source from: f:\app.rehome\web-ifc-viewer-source\viewer\src
   ```

3. **Test it**: Make a small change to the fork source:
   ```typescript
   // web-ifc-viewer-source/viewer/src/components/display/edges.ts
   // Add a console.log at the top of the create method
   create(name: string, modelID: number, lineMaterial: Material, material?: Material) {
     console.log('🔧 FORK IS ACTIVE - Using local edges implementation!');
     // ... rest of code
   }
   ```

4. **Reload your app** - You should see the console.log message in the browser console

## If Fork is NOT Active

If you don't see the fork detection messages:

1. **Check the source exists**:
   ```bash
   ls web-ifc-viewer-source/viewer/src/index.ts
   ```

2. **Check Vite config** - Make sure the alias is configured (it should be)

3. **Clear Vite cache**:
   ```bash
   rm -rf node_modules/.vite
   npm run dev
   ```

## Current Import

Your code imports:
```typescript
import { IfcViewerAPI } from 'web-ifc-viewer';
```

With the fork active, this import resolves to:
```
web-ifc-viewer-source/viewer/src/index.ts
```

Instead of:
```
node_modules/web-ifc-viewer/dist/index.js
```

