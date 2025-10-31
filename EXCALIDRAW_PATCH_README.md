# Excalidraw Image Size Limit Patch

## Problem
Excalidraw has a hardcoded **1440px limit** on the largest axis of images. This causes high-resolution images (like your 7200×4800px image) to be automatically downscaled to 1440×959px, resulting in blurry images when zoomed in.

## Solution
This patch modifies the Excalidraw library to increase the image size limit from **1440px to 10000px**, allowing full-resolution images to be imported and displayed.

## Installation Steps

### Automatic Method (Recommended)

#### For Mac/Linux:
```bash
# Make the script executable
chmod +x scripts/patch-excalidraw.sh

# Run the patch script
./scripts/patch-excalidraw.sh
```

#### For Windows (PowerShell):
```powershell
# Run the patch script
.\scripts\patch-excalidraw.ps1
```

### Manual Method

If the automatic script doesn't work, follow these steps:

1. **Locate the file to patch:**
   ```
   node_modules/@excalidraw/excalidraw/dist/excalidraw.production.min.js
   ```

2. **Search and replace:**
   - Open the file in a text editor
   - Find: `1440` (look for patterns like `maxWidthOrHeight=1440` or `=1440,`)
   - Replace with: `10000`

3. **Create the patch:**
   ```bash
   npx patch-package @excalidraw/excalidraw
   ```

## How It Works

1. **patch-package** is now installed as a dev dependency
2. The `postinstall` script in `package.json` automatically applies patches after `npm install`
3. When you run the patch script, it:
   - Searches for the 1440px limit in Excalidraw's bundled JavaScript
   - Replaces it with 10000px
   - Creates a patch file in `patches/` directory
   - This patch is automatically applied whenever dependencies are installed

## Testing the Patch

1. **Delete and re-import your image**
   - Remove the existing downscaled image from Excalidraw
   - Import your 7200×4800px image again

2. **Check the console logs**
   - Open browser DevTools (F12)
   - Look for the "ULTRA-DIAGNOSTIC: Image Import" log
   - Verify `imageNaturalWidth` and `imageNaturalHeight` now show full resolution (7200×4800)

3. **Zoom in**
   - Use the zoom tool to zoom into the image
   - The image should now be crisp and sharp at all zoom levels

## Expected Results

### Before Patch:
```
imageNaturalWidth: 1440
imageNaturalHeight: 959
renderScale: 42.0% (heavily downscaled)
```

### After Patch:
```
imageNaturalWidth: 7200
imageNaturalHeight: 4800
renderScale: 100% (full resolution)
```

## Troubleshooting

### Patch doesn't apply
- Make sure `node_modules/@excalidraw/excalidraw` exists
- Try deleting `node_modules` and running `npm install` again
- Check if the patch file was created in `patches/@excalidraw+excalidraw+0.18.0.patch`

### Image still blurry
- Clear browser cache (Ctrl+Shift+R or Cmd+Shift+R)
- Delete the old downscaled image and re-import
- Check console logs to verify the new dimensions

### Different Excalidraw version
- If you update Excalidraw to a different version, you may need to re-run the patch script
- The patch filename includes the version number (e.g., `0.18.0`)

## Performance Considerations

- **Memory Usage**: Full-resolution images (7200×4800px) will use more browser memory
- **File Size**: The canvas data will be larger when saved
- **Rendering**: Zooming and panning may be slightly slower with very large images
- **Recommended**: Only use full resolution when necessary (e.g., detailed technical drawings, architectural plans)

## Reverting the Patch

If you want to revert to the original 1440px limit:

```bash
# Delete the patch file
rm patches/@excalidraw+excalidraw+*.patch

# Reinstall Excalidraw
npm uninstall @excalidraw/excalidraw
npm install @excalidraw/excalidraw
```

## Alternative Solutions

If this patch causes performance issues, consider:
1. **Pre-resize images** to an optimal size (e.g., 4000×3000px) before importing
2. **Slice large images** into smaller tiles and arrange them in Excalidraw
3. **Use a different annotation tool** for extremely large images (e.g., Figma, Photoshop)

## Technical Details

The patch modifies the `resizeImageFile` function in Excalidraw which normally:
1. Takes an uploaded image
2. Checks if the largest axis exceeds 1440px
3. Proportionally downscales the image to fit within 1440px
4. Compresses to meet a 2MB file size limit

After patching, the size check uses 10000px instead, allowing much larger images while still maintaining the 2MB compression limit for performance.
