# Tauri Auto-Update Release Instructions

## Current Status ✅
- **Version**: 1.0.1
- **Commits**: Pushed to GitHub (main branch)
- **Repository**: https://github.com/mandolon/app.rehome

## What's New in v1.0.1
✅ **Onboarding Wizard** - 3-step personalized onboarding for TEAM role users
✅ **Project Membership Filtering** - Projects only visible to users who are members
✅ **Project Visibility Fix** - Projects now appear consistently in Chat and side rail
✅ **Avatar Colors** - Consolidated to 11 solid hex colors across the app
✅ **Excalidraw Customizations** - Removed Generate/Mermaid features from both mobile and desktop toolbars
✅ **Line Tool Styling** - Fixed background color to match rest of toolbar
✅ **Safari Compatibility** - Fixed onboarding navigation on Safari

## To Complete the Auto-Update Release

### Step 1: Build Tauri Application
```powershell
npm run build:tauri
```

This creates: `src-tauri/target/release/rehome_1.0.1_x64_en-US.msi`

### Step 2: Create GitHub Release
Navigate to: https://github.com/mandolon/app.rehome/releases/new

**Release Details:**
- **Tag version**: `v1.0.1`
- **Release title**: `v1.0.1 - Onboarding, Project Visibility & Excalidraw Updates`
- **Description**:
  ```
  ## What's New
  - ✨ New onboarding wizard for team members with avatar customization
  - 🔒 Improved project access control - projects only visible to team members
  - 🐛 Fixed project visibility inconsistency in side rail
  - 🎨 Consolidated avatar colors (11 solid hex colors)
  - 🧹 Removed Generate/Mermaid features from Excalidraw
  - 🔧 Fixed line tool styling in toolbar
  - 🍎 Safari compatibility improvements
  
  ## Installation
  Download the installer below and run to update automatically.
  ```

### Step 3: Upload Release Assets
1. Attach the MSI file: `rehome_1.0.1_x64_en-US.msi`
2. (Optional) Attach the signature file if code-signed

### Step 4: Generate Update Manifest
After uploading MSI to the release, create `latest.json`:

```json
{
  "version": "1.0.1",
  "notes": "Onboarding wizard, project visibility fixes, and Excalidraw customizations",
  "pub_date": "2025-11-08T00:00:00Z",
  "platforms": {
    "win64": {
      "signature": "[optional-signature-here]",
      "url": "https://github.com/mandolon/app.rehome/releases/download/v1.0.1/rehome_1.0.1_x64_en-US.msi"
    }
  }
}
```

### Step 5: Upload latest.json to Release
1. Go back to the release: https://github.com/mandolon/app.rehome/releases
2. Click "Edit" on v1.0.1 release
3. Under "Artifacts", attach the `latest.json` file
4. Or manually upload it to the release assets

### Step 6: Update the "latest" Release (Alias)
Tauri updater looks for `releases/download/latest/latest.json`

1. Delete the old "latest" release if it exists
2. Tag v1.0.1 release as the new "latest" release
3. Or manually ensure the URL resolves correctly

### Step 7: Test Auto-Update
1. Users running v1.0.0 will see an update notification
2. They can click "Update" to install v1.0.1
3. The app will restart with the new version

## Quick Command Reference

### Build for Windows
```powershell
npx @tauri-apps/cli build --target x86_64-pc-windows-msvc
```

### Build for Mac (requires macOS)
```bash
npx @tauri-apps/cli build --target aarch64-apple-darwin
```

### Build for All Targets
```powershell
npx @tauri-apps/cli build
```

## Version History
- v1.0.0 - Initial release (project management foundation)
- v1.0.1 - Onboarding, project access control, Excalidraw customizations

## Next Steps
For v1.0.2 and beyond:
1. Update version in `src-tauri/tauri.conf.json`
2. Commit changes: `git add -A; git commit -m "chore: version X.X.X - description"`
3. Push to GitHub: `git push origin main`
4. Build: `npm run build:tauri`
5. Create GitHub release with tag and MSI file
6. Upload `latest.json` manifest

## Important Notes
- The MSI file auto-updates when the `latest.json` is updated
- Users must be running the app for auto-update to trigger
- The public key in `tauri.conf.json` is for signature verification
- Keep release notes in GitHub for users to see what changed
