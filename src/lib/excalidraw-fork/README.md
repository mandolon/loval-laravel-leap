# Excalidraw Fork - Image Size Override

This directory contains custom modifications to Excalidraw's image handling to support full-resolution images.

## Problem

Excalidraw hardcodes a **1440px limit** on the largest axis of uploaded images. This causes high-resolution images (e.g., 7200×4800px architectural drawings) to be downscaled, resulting in blurry images when zoomed.

## Solution

Instead of forking the entire Excalidraw codebase (which has complex build dependencies), we use **patch-package** to modify the installed npm package directly.

## Files

- **image-override.ts**: Custom image resizing function with 10000px limit (for reference/future use)
- **README.md**: This file

## How The Patch Works

The patch is created and applied via the scripts in `scripts/patch-excalidraw.sh` (or `.ps1` for Windows):

1. **Locate** the Excalidraw package in `node_modules/@excalidraw/excalidraw`
2. **Find** the `maxWidthOrHeight` parameter (hardcoded as `1440`)
3. **Replace** with `10000` in the distributed bundle
4. **Create** a patch file using `patch-package`
5. **Auto-apply** the patch on every `npm install` via postinstall script

## Directory Structure

```
src/lib/excalidraw-fork/
├── image-override.ts    # Custom image handler (reference implementation)
└── README.md           # This file

scripts/
├── patch-excalidraw.sh  # Unix/Mac patch script
└── patch-excalidraw.ps1 # Windows patch script

patches/
└── @excalidraw+excalidraw+0.18.0.patch  # Generated patch file
```

## Usage

### 1. Run the Patch Script

**Mac/Linux:**
```bash
chmod +x scripts/patch-excalidraw.sh && ./scripts/patch-excalidraw.sh
```

**Windows:**
```powershell
.\scripts\patch-excalidraw.ps1
```

### 2. Verify the Patch

Check the console after uploading an image. You should see:
```
imageNaturalWidth: 7200
imageNaturalHeight: 4800
```

Instead of:
```
imageNaturalWidth: 1440
imageNaturalHeight: 959
```

### 3. Make it Permanent

Add to `package.json`:
```json
{
  "scripts": {
    "postinstall": "patch-package"
  }
}
```

## Technical Details

### Original Excalidraw Code Location

The image resizing happens in:
- `@excalidraw/excalidraw/data/blob.ts` - `resizeImageFile()` function
- Called with `maxWidthOrHeight: 1440` from various image import handlers

### What Gets Patched

The patch modifies the minified production bundle:
```js
// Before:
reduce.toBlob(file, { max: 1440, alpha: true })

// After:
reduce.toBlob(file, { max: 10000, alpha: true })
```

### Why 10000px?

- Supports ultra-high-res images (up to 10K pixels)
- Still prevents memory issues from absurdly large images
- Can be adjusted by editing the patch script

## Maintenance

### When Excalidraw Updates

If you update the `@excalidraw/excalidraw` package:

1. Delete the old patch:
   ```bash
   rm patches/@excalidraw+excalidraw+*.patch
   ```

2. Re-run the patch script:
   ```bash
   ./scripts/patch-excalidraw.sh
   ```

3. Test thoroughly with high-res images

### Alternative: Use Our Custom Handler

If the patch breaks in future versions, you can use our custom `resizeImageFile` function from `image-override.ts` as a reference to create a wrapper component.

## License

Excalidraw is MIT licensed. Our modifications maintain the same license.

Original repository: https://github.com/excalidraw/excalidraw
