# Quick Start: Complete Tauri Auto-Update Release

## ✅ DONE - Code is committed and pushed to GitHub

Your v1.0.1 code is now on GitHub at:
- **Repo**: https://github.com/mandolon/app.rehome
- **Commits**: 
  - b9942c6: Version 1.0.1 with all features
  - 54db641: Release documentation

---

## ⏳ NEXT: Build and Create GitHub Release

### Step 1: Build Tauri (takes 10-15 minutes)
```powershell
cd f:\loval-laravel-leap
npm run build:tauri
```

**Expected output file**: `src-tauri\target\release\rehome_1.0.1_x64_en-US.msi`

### Step 2: Create GitHub Release

1. Go to: https://github.com/mandolon/app.rehome/releases/new

2. Fill in the form:
   - **Tag version**: `v1.0.1`
   - **Release title**: `v1.0.1 - Onboarding, Project Visibility & Excalidraw Updates`
   - **Describe this release**: Copy-paste below:

```
## 🎉 What's New in v1.0.1

### ✨ Features
- **Onboarding Wizard**: New 3-step personalized onboarding for team members with avatar customization
- **Project Access Control**: Projects now only visible to team members (fixed visibility inconsistency)
- **Avatar Colors**: Consolidated to 11 solid colors throughout the app
- **Excalidraw Customizations**: Removed AI features and Mermaid integration

### 🐛 Bug Fixes
- Fixed project visibility in side rail hover card
- Fixed line tool button styling in Excalidraw toolbar
- Improved Safari compatibility in onboarding

### 📦 Technical
- Updated to latest Tauri packages (v2.9.0)
- Improved database migrations for signup flow
- Enhanced project membership filtering

### 🎯 Installation
Download the installer and run to update automatically.

---
**Release Date**: November 8, 2025  
**Commit**: b9942c6  
**Changes**: Onboarding wizard, project filtering, Excalidraw customizations
```

3. **Upload the MSI file**:
   - Attach: `src-tauri\target\release\rehome_1.0.1_x64_en-US.msi`

4. Click **Publish release**

### Step 3: Create Update Manifest

1. Create a new file named `latest.json` with this content:

```json
{
  "version": "1.0.1",
  "notes": "Onboarding wizard, project visibility fixes, and Excalidraw customizations",
  "pub_date": "2025-11-08T00:00:00Z",
  "platforms": {
    "win64": {
      "signature": "",
      "url": "https://github.com/mandolon/app.rehome/releases/download/v1.0.1/rehome_1.0.1_x64_en-US.msi"
    }
  }
}
```

2. Go back to the v1.0.1 release: https://github.com/mandolon/app.rehome/releases/tag/v1.0.1

3. Click **Edit**

4. Upload `latest.json` as an attachment

5. **Save changes**

### Step 4: Set as Latest Release (Optional but Recommended)

1. Go to: https://github.com/mandolon/app.rehome/releases

2. Find the v1.0.1 release

3. Click **Edit** → Check "Set as the latest release" → **Update release**

---

## ✅ Verification

Once complete, users will see:

**In Desktop App (v1.0.0)**:
- Update notification appears
- "New version available: v1.0.1"
- "Update now?" dialog
- Downloads and installs automatically
- App restarts with v1.0.1

**Auto-Update Endpoint**:
```
https://github.com/mandolon/app.rehome/releases/download/latest/latest.json
```

---

## 📋 Complete Checklist

- [ ] Build Tauri: `npm run build:tauri`
- [ ] Verify MSI file created: `src-tauri\target\release\rehome_1.0.1_x64_en-US.msi`
- [ ] Create GitHub release v1.0.1
- [ ] Upload MSI to release
- [ ] Create `latest.json` with version 1.0.1
- [ ] Upload `latest.json` to release
- [ ] Set v1.0.1 as latest release
- [ ] Test: Run app v1.0.0 to see update notification
- [ ] Test: Click update and verify v1.0.1 installs

---

## 🆘 Troubleshooting

### Build fails with version mismatch
```powershell
npm install @tauri-apps/api@^2.9.0 @tauri-apps/cli@^2.9.0
npm run build:tauri
```

### MSI file not created
- Check if Rust compiler is installed
- Run: `rustup update` 
- Retry: `npm run build:tauri`

### Auto-update not working
- Verify `latest.json` URL is correct
- Check URL contains `latest.json` not version-specific path
- Users must close and reopen app to check for updates

---

## 📞 Commands Reference

```powershell
# Build application
npm run build:tauri

# Check build status
ls src-tauri/target/release/*.msi

# View commit history
git log --oneline

# Push changes
git push origin main

# Pull latest
git pull origin main
```

---

## 📊 Version Info

- **Current Version**: 1.0.1
- **Previous Version**: 1.0.0
- **Release Date**: November 8, 2025
- **GitHub Repository**: https://github.com/mandolon/app.rehome
- **Auto-Update Endpoint**: https://github.com/mandolon/app.rehome/releases/download/latest/latest.json

---

## 🚀 You're all set!

The code is committed and pushed. Now just build, create the GitHub release, and your users will automatically get the update!

**Estimated time to complete**: 15-20 minutes (mostly waiting for build)

