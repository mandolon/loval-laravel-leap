# How Tauri Auto-Update Works - Complete Guide

## Quick Answer
- **Do we need to build again?** YES - Users need the new MSI binary
- **How does it update automatically?** Tauri checks for updates on app startup
- **UI button to install?** YES - Tauri shows a dialog automatically

---

## The Update Flow (Step-by-Step)

### Current State
```
User has: v1.0.0 (installed MSI)
         ↓
GitHub has: v1.0.1 (latest.json pointing to new MSI)
```

### What Happens When User Launches App

```
1. User opens app v1.0.0
   ↓
2. Tauri updater checks: 
   https://github.com/mandolon/app.rehome/releases/download/latest/latest.json
   ↓
3. latest.json says: "version 1.0.1 available"
   ↓
4. App compares:
   - Local version: 1.0.0
   - Latest version: 1.0.1
   - 1.0.0 < 1.0.1 ✓ Update available!
   ↓
5. UI Dialog appears:
   ┌─────────────────────────────────┐
   │ Update Available                │
   │                                 │
   │ Version 1.0.1 is now available  │
   │                                 │
   │  [Cancel]  [Install Update]     │
   └─────────────────────────────────┘
   ↓
6. User clicks "Install Update"
   ↓
7. App downloads:
   https://github.com/mandolon/app.rehome/releases/download/v1.0.1/rehome_1.0.1_x64_en-US.msi
   ↓
8. MSI installer runs (silent/passive mode)
   ↓
9. Installs v1.0.1 to Program Files
   ↓
10. App restarts automatically
    ↓
11. User now has v1.0.1 ✅
```

---

## Why We Need to Build Again

### What Needs to Happen

1. **Code Changes** (Already Done ✅)
   - Onboarding wizard
   - Project filtering
   - Excalidraw customizations
   - These are in GitHub now

2. **Build Tauri Application** (Still Needed ⏳)
   - Compile Rust backend
   - Bundle with Vite frontend
   - Create Windows MSI installer
   - Output: `rehome_1.0.1_x64_en-US.msi`
   - Size: ~50-100 MB

3. **Upload to GitHub** (Still Needed ⏳)
   - MSI file to release assets
   - `latest.json` manifest

### Why?

The MSI file is the **binary executable**. It contains:
- All your source code compiled
- React components bundled
- Tauri runtime
- Database migrations
- Assets and images

Users download and run the MSI to install. Without building, there's nothing for them to download!

```
Code in GitHub (what you see) → Build process → Binary (MSI)
                                                   ↓
                                            Users download this
```

---

## Auto-Update Process (Technical)

### Step 1: App Startup
```rust
// In Tauri's main.rs (runs when app starts)
app
  .setup(|app| {
    app.updater()
      .check()  // Check for updates
      .await?;
  })
```

### Step 2: Check Endpoint
```json
GET https://github.com/mandolon/app.rehome/releases/download/latest/latest.json

Response:
{
  "version": "1.0.1",
  "pub_date": "2025-11-08T00:00:00Z",
  "platforms": {
    "win64": {
      "url": "https://github.com/mandolon/app.rehome/releases/download/v1.0.1/rehome_1.0.1_x64_en-US.msi",
      "signature": "..."
    }
  }
}
```

### Step 3: Show Dialog
Tauri automatically shows a dialog (configured in tauri.conf.json):
```json
"plugins": {
  "updater": {
    "dialog": true  // ← This shows the UI!
  }
}
```

### Step 4: Download & Install
```
1. Download MSI from GitHub
2. Run installer silently
3. Replace files in Program Files
4. Restart app
```

---

## The Complete Release Process

### Phase 1: Code (✅ DONE)
```
1. Make code changes ✓
2. Commit to GitHub ✓
3. Push to main branch ✓
```

### Phase 2: Build (⏳ TODO)
```
npm run build:tauri
```
Output: `src-tauri/target/release/rehome_1.0.1_x64_en-US.msi`

### Phase 3: Release (⏳ TODO)
```
1. Go to GitHub releases
2. Create v1.0.1 release
3. Upload MSI file
4. Upload latest.json
```

### Phase 4: Auto-Update Triggered (🚀 AUTOMATIC)
```
Users launch app → See update → Click install → Done!
```

---

## Configuration in tauri.conf.json

```json
{
  "plugins": {
    "updater": {
      "active": true,              // ← Enable updates
      "dialog": true,              // ← Show UI dialog
      "endpoints": [
        "https://github.com/mandolon/app.rehome/releases/download/latest/latest.json"
      ],
      "pubkey": "..."              // ← Verify signatures
    }
  }
}
```

This configuration means:
- ✅ Auto-update is enabled
- ✅ UI dialog shows automatically
- ✅ Checks this endpoint for updates
- ✅ Validates authenticity

---

## User Experience

### Without Auto-Update (Old Way)
```
User → Manual download → Find MSI → Run installer → Restart
```

### With Tauri Auto-Update (New Way)
```
User → App starts → Dialog appears → Click button → Auto-install → Restart
```

---

## The Update Dialog (What Users See)

```
┌──────────────────────────────────────────────┐
│  rehome                                      │
├──────────────────────────────────────────────┤
│                                              │
│  Update Available                            │
│                                              │
│  Version 1.0.1 is now available. Would you  │
│  like to install it now?                    │
│                                              │
│  Release notes:                              │
│  • New onboarding wizard                     │
│  • Fixed project visibility                 │
│  • Improved Excalidraw experience           │
│                                              │
│                                              │
│  [Cancel]                 [Install Update]  │
│                                              │
└──────────────────────────────────────────────┘
```

If user clicks "Install Update":
1. Dialog shows progress
2. MSI downloads (~5-15 seconds)
3. Installer runs (silent)
4. App restarts automatically
5. User has v1.0.1

---

## What Gets Updated

When user installs v1.0.1, they get:

| Item | Changes |
|------|---------|
| **React Components** | OnboardingPage, project filtering, etc. |
| **Database Schema** | Migrations run (signup improvements) |
| **Excalidraw** | Generate menu removed |
| **Avatar System** | 11 solid colors |
| **Everything** | Latest from main branch |

---

## Complete Timeline

### Today (Code Pushed)
- ✅ Code committed to GitHub
- ✅ Version set to 1.0.1
- ✅ All features in main branch

### Tomorrow (Build & Release)
- Build: `npm run build:tauri` (15 min)
- Create GitHub release
- Upload MSI + latest.json

### Next Day (Users Update)
- Users launch app
- See update dialog
- Click "Install Update"
- App installs v1.0.1
- Changes go live! 🚀

---

## Technical Architecture

```
GitHub Repository (mandolon/app.rehome)
│
├─ Source Code (main branch)
│  ├─ src/pages/OnboardingPage.tsx
│  ├─ src/lib/api/hooks/useProjects.ts
│  └─ excalidraw-fork 2/...
│
└─ Releases
   ├─ v1.0.1
   │  ├─ rehome_1.0.1_x64_en-US.msi (compiled binary)
   │  └─ latest.json (manifest)
   │
   └─ latest/ (symlink)
      └─ latest.json → points to v1.0.1

User's Computer
│
├─ Installed: v1.0.0
│  └─ App checks: releases/download/latest/latest.json
│
└─ After Update
   ├─ Downloaded: rehome_1.0.1_x64_en-US.msi
   ├─ Installed: v1.0.1
   └─ Result: All new features available! ✅
```

---

## Manual Update Button (Optional)

If you want a "Check for Updates" button in the app, you can add this:

```typescript
// In any React component
import { check } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/api/process'

export async function checkForUpdates() {
  try {
    const update = await check()
    if (update) {
      console.log(`Update available: ${update.version}`)
      // Update downloaded, show dialog
      await update.downloadAndInstall()
      // Restart app
      await relaunch()
    } else {
      console.log('Already up to date')
    }
  } catch (error) {
    console.error('Failed to check for updates:', error)
  }
}
```

Then use it:
```tsx
<button onClick={checkForUpdates}>
  Check for Updates
</button>
```

---

## Why Both Build AND Release Are Needed

### Build Creates the Binary
```
npm run build:tauri
  ↓
Compiles all code
  ↓
Creates MSI installer
  ↓
Users download this file
```

### Release Makes It Available
```
Upload MSI to GitHub
  ↓
Create latest.json
  ↓
App checks this endpoint
  ↓
App knows update exists
```

**Without build**: No file for users to download  
**Without release**: Users can't find the update

Both are required!

---

## What Happens in `npm run build:tauri`

```
1. Installs Excalidraw fork packages (yarn)
2. Runs Excalidraw build (yarn build:packages)
3. Builds React frontend (npm run build:desktop → Vite)
4. Bundles everything
5. Compiles Rust code (cargo build --release)
6. Creates MSI installer
7. Outputs: src-tauri/target/release/rehome_1.0.1_x64_en-US.msi
```

Takes 10-15 minutes total.

---

## Success Criteria

When everything is set up correctly:

```
✅ GitHub has v1.0.1 MSI file
✅ GitHub has latest.json manifest
✅ latest.json points to v1.0.1 MSI
✅ User runs app v1.0.0
✅ Dialog appears: "Update available"
✅ User clicks "Install"
✅ App auto-downloads and installs
✅ App restarts with v1.0.1
✅ All new features work! 🎉
```

---

## Summary

| Question | Answer |
|----------|--------|
| **Do we need to build again?** | YES - Create the MSI binary |
| **How does it auto-update?** | Tauri checks latest.json on startup |
| **Is there a UI button?** | YES - Shows automatically (configured) |
| **Can we add manual check?** | YES - Optional button to check manually |
| **How long does build take?** | 10-15 minutes |
| **What do users see?** | Dialog: "Update available - Install now?" |
| **Can users decline?** | YES - They click "Cancel" |
| **Does it restart automatically?** | YES - After install completes |

---

## Next Actions

1. **Run build**: `npm run build:tauri` (do this when ready)
2. **Create release**: Go to GitHub and create v1.0.1
3. **Upload files**: MSI + latest.json
4. **Test**: Launch v1.0.0 app and see update dialog
5. **Users get update**: Automatically! ✨

