# 🚀 Apply Excalidraw Image Size Patch

## The Problem
Our custom image handler was creating an infinite loop because Excalidraw **already resized the image to 1440px** before our code could intercept it.

## The Solution
We need to **patch the installed Excalidraw package** in `node_modules` to change the hardcoded 1440px limit to 10000px.

## Steps to Apply Patch

### 1. Run the Patch Script

```bash
node scripts/apply-excalidraw-patch.js
```

This will:
- Find the Excalidraw package files
- Replace `1440` with `10000` in the image resizing code
- Create a permanent modification

### 2. Make it Permanent (Important!)

After the patch works, create a patch file so it applies automatically:

```bash
npx patch-package @excalidraw/excalidraw
```

Then add to `package.json`:
```json
{
  "scripts": {
    "postinstall": "patch-package"
  }
}
```

### 3. Test

1. **Hard refresh browser** (Ctrl+Shift+R / Cmd+Shift+R)
2. **Delete old image** from canvas
3. **Re-import your 7200×4800px image**
4. **Check console** - should show:
   ```
   imageNaturalWidth: 7200
   imageNaturalHeight: 4800
   ```

## What Gets Patched

The script modifies these patterns in Excalidraw's compiled code:
- `maxWidthOrHeight: 1440` → `maxWidthOrHeight: 10000`
- `maxWidthOrHeight=1440` → `maxWidthOrHeight=10000`
- `max: 1440` → `max: 10000`
- `=1440,` → `=10000,`

## Files Modified

```
node_modules/@excalidraw/excalidraw/
├── dist/excalidraw.production.min.js  ✅
├── dist/excalidraw.development.js     ✅
└── dist/index.js                      ✅
```

## Troubleshooting

### "1440 not found"
The package structure may have changed. Inspect files manually:
```bash
grep -r "1440" node_modules/@excalidraw/excalidraw/dist/
```

### Patch doesn't work after npm install
You forgot step 2! Run `npx patch-package @excalidraw/excalidraw` and add the postinstall script.

### Image still blurry
1. Clear browser cache completely
2. Make sure you deleted the OLD image and uploaded a NEW one
3. Check console logs to verify the patch worked

## Why This Approach?

1. ✅ **Works at source** - Modifies Excalidraw before it processes images
2. ✅ **No loops** - Image only processed once by Excalidraw
3. ✅ **Simple** - Just changes one number in the compiled code
4. ✅ **Permanent** - patch-package ensures it persists across installs

## Alternative (If Patch Fails)

If you can't patch the package, the only alternatives are:
1. Fork the entire Excalidraw repo and build from source
2. Pre-resize images to exactly 1440px before uploading
3. Use a different drawing tool for high-res images
