# 🚀 Quick Setup: Remove Excalidraw 1440px Limit

## Step 1: Run the Patch Script

Choose your operating system:

### Mac/Linux:
```bash
chmod +x scripts/patch-excalidraw.sh && ./scripts/patch-excalidraw.sh
```

### Windows (PowerShell):
```powershell
.\scripts\patch-excalidraw.ps1
```

### Windows (Git Bash):
```bash
bash scripts/patch-excalidraw.sh
```

## Step 2: Add Postinstall Script

**IMPORTANT:** Add this to your `package.json` scripts section:

```json
"scripts": {
  "postinstall": "patch-package"
}
```

This ensures the patch is automatically applied whenever you run `npm install`.

## Step 3: Test the Fix

1. **Refresh your browser** (Ctrl+Shift+R or Cmd+Shift+R to clear cache)
2. **Delete the old blurry image** from Excalidraw
3. **Re-import your 7200×4800px image**
4. **Zoom in** - it should now be crisp and sharp!

## Verification

Open browser console (F12) and look for the image import log. You should see:
```
imageNaturalWidth: 7200
imageNaturalHeight: 4800
```

Instead of the previous:
```
imageNaturalWidth: 1440
imageNaturalHeight: 959
```

## What This Does

- ✅ Increases image size limit from **1440px → 10000px**
- ✅ Preserves full resolution of imported images
- ✅ Automatically applies on every `npm install`
- ✅ No more blurry zoomed images!

## Need Help?

See [EXCALIDRAW_PATCH_README.md](./EXCALIDRAW_PATCH_README.md) for:
- Detailed explanations
- Troubleshooting steps
- Performance considerations
- How to revert the patch
