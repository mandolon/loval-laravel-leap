# Tauri Auto-Update Release Guide

## Current Setup
- **App Name**: rehome
- **Version**: 1.0.0 (in `src-tauri/tauri.conf.json`)
- **Updater Endpoint**: `https://github.com/mandolon/app.rehome/releases/download/latest/latest.json`
- **Target**: x86_64-pc-windows-msvc

## Steps to Push Latest Version to Tauri Auto-Update

### 1. Increment Version Number
Update the version in `src-tauri/tauri.conf.json`:
```json
{
  "version": "1.0.1"  // Increment from 1.0.0
}
```

### 2. Build the Tauri Application
```bash
npm run build:tauri
```

This will:
- Build the Excalidraw fork packages
- Build the frontend with Vite
- Compile the Rust Tauri backend

Output location: `src-tauri/target/release/`

### 3. Generate the Update Manifest
After the build completes, you need to generate the `latest.json` file that Tauri looks for.

The manifest format for the updater should be:
```json
{
  "version": "1.0.1",
  "notes": "Latest release with Excalidraw customizations and project visibility fixes",
  "pub_date": "2025-11-08T00:00:00Z",
  "platforms": {
    "win64": {
      "signature": "SIGNATURE_HERE",
      "url": "https://github.com/mandolon/app.rehome/releases/download/v1.0.1/rehome_1.0.1_x64_en-US.msi"
    }
  }
}
```

### 4. Sign the Release
You need to sign the MSI with your private key. This requires:
1. The Tauri updater private key
2. Running `tauri signer sign` command

```bash
npx @tauri-apps/cli signer sign <path-to-msi> -k <path-to-private-key>
```

### 5. Create GitHub Release
1. Go to: https://github.com/mandolon/app.rehome/releases
2. Create a new release with tag `v1.0.1`
3. Upload the signed MSI file: `rehome_1.0.1_x64_en-US.msi`
4. Upload the `latest.json` manifest file
5. Publish the release

### 6. Verify Auto-Update Works
1. Users running the old version will see an update notification
2. They can click "Update" to download and install the new version
3. The app will restart with the new version

## Files Involved
- **Config**: `src-tauri/tauri.conf.json`
- **Binary Output**: `src-tauri/target/release/rehome_1.0.1_x64_en-US.msi`
- **Latest Manifest**: `latest.json` (upload to releases)
- **Source Code**: Recent changes in:
  - `src/pages/OnboardingPage.tsx` (onboarding wizard)
  - `src/lib/api/hooks/useProjects.ts` (project membership filtering)
  - `src/components/layout/sidebar/NavContent.tsx` (project filtering)
  - `excalidraw-fork 2/packages/excalidraw/components/Actions.tsx` (removed Generate options)
  - `excalidraw-fork 2/packages/excalidraw/components/MobileToolBar.tsx` (removed Generate options)

## Notes
- The build process takes 5-15 minutes depending on system performance
- Rust compilation is required and may take time on first build
- Ensure you have the correct code-signing certificate for Windows MSI signing
- Keep the private key secure - never commit it to version control

## Recent Changes Included in This Release
✅ Onboarding wizard for TEAM role users
✅ Project membership filtering (projects only visible if user is member)
✅ Avatar color consolidation (11 solid hex colors)
✅ Removed Excalidraw Generate/Mermaid features
✅ Fixed project visibility in side rail
✅ Safari compatibility fixes

## Updating Version
Next time, increment version like:
- 1.0.0 → 1.0.1 (patch)
- 1.0.0 → 1.1.0 (minor)
- 1.0.0 → 2.0.0 (major)
