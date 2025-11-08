# Tauri Auto-Update Visual Guide

## The Three Phases

### PHASE 1: Development (✅ COMPLETE)
```
You write code changes
        ↓
Commit to GitHub
        ↓
Push to main branch
        ↓
Latest code in GitHub ✅
```

### PHASE 2: Build (⏳ TODO)
```
Run: npm run build:tauri
        ↓
Compiles all code
        ↓
Creates binary (MSI)
        ↓
MSI ready to distribute
```

### PHASE 3: Release (⏳ TODO)
```
Upload MSI to GitHub
        ↓
Create latest.json
        ↓
Upload latest.json
        ↓
App can find the update
```

### PHASE 4: Auto-Update (🚀 AUTOMATIC)
```
User launches app
        ↓
App checks for updates
        ↓
Dialog appears
        ↓
User clicks install
        ↓
App auto-downloads
        ↓
Installer runs
        ↓
App restarts with new version ✅
```

---

## What Actually Happens on User's Computer

### Timeline for End User

```
Day 1: User has v1.0.0
│
│  Morning: Opens app
│  │
│  ├─ App starts
│  │
│  ├─ Checks: github.com/.../latest/latest.json
│  │  ↓
│  │  Returns: "version 1.0.1 available"
│  │
│  ├─ Compares versions
│  │  • Local: 1.0.0
│  │  • Remote: 1.0.1
│  │  • Need update? YES
│  │
│  └─ Shows dialog:
│     ┌─────────────────────────────────┐
│     │ Update Available                │
│     │ v1.0.1 is ready to install      │
│     │ [Cancel] [Install Update]       │
│     └─────────────────────────────────┘
│
│  Clicks: "Install Update"
│
│  ├─ Starting download...
│  │  ↓
│  │  Downloading from GitHub
│  │  █████░░░░ 50%
│  │  ██████████ 100% ✓
│  │
│  ├─ Running installer...
│  │  ↓
│  │  Installing to Program Files
│  │  ████░░░░░░
│  │  ████████░░
│  │  ██████████ ✓
│  │
│  └─ Restarting app...
│     ↓
│     App closes
│     New version starts
│     Shows: "Welcome to v1.0.1!"
│
└─ User has v1.0.1 ✅ (with all new features)
```

---

## Information Flow

```
Developer (You)
        │
        ├─ Make changes to code
        │  (OnboardingPage, project filtering, etc)
        │
        ├─ Commit & Push to GitHub
        │  (GitHub now has latest code)
        │
        └─ Build & Release
           (Create MSI binary)
           │
           └─ GitHub Release Page
              ├─ rehome_1.0.1_x64_en-US.msi
              └─ latest.json
                 │
                 └─ User's Computer
                    │
                    App (v1.0.0) checks GitHub
                    │
                    Sees v1.0.1 available
                    │
                    Shows update dialog
                    │
                    User clicks "Install"
                    │
                    App downloads & installs v1.0.1
                    │
                    Restarts with new features ✅
```

---

## The Build Process (Inside npm run build:tauri)

```
npm run build:tauri
        │
        ├─ Navigate to excalidraw-fork 2
        │  │
        │  ├─ yarn install (get dependencies)
        │  │
        │  └─ yarn build:packages
        │     (Compile Excalidraw)
        │     │
        │     ├─ Build common
        │     ├─ Build math
        │     ├─ Build element
        │     └─ Build excalidraw
        │
        ├─ Return to main folder
        │
        ├─ npm run build:desktop
        │  (Build React app with Vite)
        │  │
        │  ├─ Compile TypeScript
        │  ├─ Bundle React components
        │  ├─ Optimize assets
        │  └─ Output: dist/ folder
        │
        ├─ Tauri build phase
        │  (src-tauri folder)
        │  │
        │  ├─ cargo build --release
        │  │  (Compile Rust code)
        │  │
        │  ├─ Bundle app
        │  │
        │  ├─ Create installer
        │  │  (WiX tool generates MSI)
        │  │
        │  └─ Output:
        │     src-tauri/target/release/
        │     rehome_1.0.1_x64_en-US.msi
        │
        └─ Success! MSI ready for distribution
```

Time: ~10-15 minutes

---

## Version Comparison

### Before: Manual Updates
```
User needs update
        │
        ├─ Email sent: "New version available"
        │
        ├─ User clicks link
        │
        ├─ Goes to GitHub
        │
        ├─ Finds download button
        │
        ├─ Downloads MSI
        │
        ├─ Runs installer manually
        │
        ├─ Closes app
        │
        ├─ Waits for installation
        │
        └─ Manually restarts app
```

Time: ~5-10 minutes (user actively involved)

### After: Auto-Update
```
User needs update
        │
        ├─ App checks automatically
        │
        ├─ Dialog appears
        │
        ├─ User clicks button
        │
        ├─ Everything automatic:
        │  ├─ Download
        │  ├─ Install
        │  ├─ Restart
        │
        └─ Done! (user didn't open files/browser)
```

Time: ~1-2 minutes (user clicks once)

---

## GitHub Release Structure

### Before Publishing
```
GitHub Releases (app.rehome)
│
└─ (empty - no releases yet)
```

### After Publishing v1.0.1
```
GitHub Releases (app.rehome)
│
├─ Releases
│  │
│  └─ v1.0.1 ← Latest Release
│     │
│     ├─ Assets
│     │  ├─ rehome_1.0.1_x64_en-US.msi (50-100 MB)
│     │  └─ latest.json (1 KB)
│     │
│     ├─ Release notes
│     │  ├─ "New onboarding wizard"
│     │  ├─ "Fixed project visibility"
│     │  └─ "Excalidraw improvements"
│     │
│     └─ Release date: Nov 8, 2025
│
└─ latest/ (special tag)
   └─ Points to v1.0.1
   └─ URL: releases/download/latest/latest.json
      (This is what the app checks!)
```

---

## The latest.json File

This is what controls auto-updates:

```json
{
  "version": "1.0.1",
  "notes": "Onboarding wizard, project visibility fixes, and Excalidraw customizations",
  "pub_date": "2025-11-08T00:00:00Z",
  "platforms": {
    "win64": {
      "signature": "dW50cnVzdGVkIGNvbW1lbnQ6...",
      "url": "https://github.com/mandolon/app.rehome/releases/download/v1.0.1/rehome_1.0.1_x64_en-US.msi"
    }
  }
}
```

When app reads this:
- ✅ Knows version is 1.0.1
- ✅ Knows where to download MSI
- ✅ Can verify it's legitimate (signature)
- ✅ Triggers update process

---

## Decision Tree: "Should I Build?"

```
Do you want users to get the new features?
        │
        ├─ NO
        │  └─ Don't build, don't release
        │     Users stay on v1.0.0
        │
        └─ YES
           │
           Build creates the binary
           │
           Release makes it available
           │
           Users get auto-update dialog
           │
           Features go live! ✅
```

---

## The Update Configuration

In `src-tauri/tauri.conf.json`:

```json
{
  "plugins": {
    "updater": {
      "active": true,
      
      // Show UI dialog to user
      "dialog": true,
      
      // Check this endpoint for updates
      "endpoints": [
        "https://github.com/mandolon/app.rehome/releases/download/latest/latest.json"
      ],
      
      // Public key to verify signatures
      "pubkey": "dW50cnVzdGVkIGNvbW1lbnQ6..."
    }
  }
}
```

Each setting:
- **active: true** → Updates are enabled
- **dialog: true** → Show UI (automatic, no code needed)
- **endpoints** → Where to check for updates
- **pubkey** → Security verification

---

## What Users See (Screenshots)

### When Update Available

```
┌─────────────────────────────────────────────────┐
│  rehome                                    ✕    │
├─────────────────────────────────────────────────┤
│                                                 │
│             Update Available                   │
│                                                 │
│        Version 1.0.1 is now available!         │
│                                                 │
│  New features:                                  │
│  • Personalized onboarding                      │
│  • Better project management                    │
│  • Improved interface                           │
│                                                 │
│                                                 │
│                  [Cancel]  [Install Update]    │
│                                                 │
└─────────────────────────────────────────────────┘
```

### During Installation

```
┌─────────────────────────────────────────────────┐
│  rehome                                         │
├─────────────────────────────────────────────────┤
│                                                 │
│          Installing Update v1.0.1               │
│                                                 │
│          ████████░░░░░░░░░░ 45%                │
│                                                 │
│          Downloading and installing...          │
│                                                 │
└─────────────────────────────────────────────────┘
```

### After Installation

```
App closes and restarts with v1.0.1

┌─────────────────────────────────────────────────┐
│  rehome                                    ✕    │
├─────────────────────────────────────────────────┤
│                                                 │
│   Welcome! You're now on v1.0.1                │
│                                                 │
│   [Get Started]                                 │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## Complete Checklist

To get auto-update working:

### Phase 1: Code ✅
- [x] Write new features
- [x] Commit to GitHub
- [x] Push to main
- [x] Update version to 1.0.1

### Phase 2: Build ⏳
- [ ] Run: `npm run build:tauri`
- [ ] Wait for completion
- [ ] Verify MSI created

### Phase 3: Release ⏳
- [ ] Go to GitHub releases
- [ ] Create v1.0.1 release
- [ ] Upload MSI file
- [ ] Create latest.json
- [ ] Upload latest.json

### Phase 4: Test ✅ (Automatic)
- [ ] Run v1.0.0 app
- [ ] See update dialog
- [ ] Click install
- [ ] App restarts with v1.0.1

---

## Key Takeaways

1. **Code in GitHub ≠ Binary for Users**
   - Need to build to create binary (MSI)

2. **Build Creates What Users Download**
   - npm run build:tauri → Creates rehome_1.0.1_x64_en-US.msi

3. **Release Makes It Available**
   - Upload to GitHub releases
   - Create latest.json
   - Users can find it

4. **Auto-Update is Automatic**
   - Dialog shows without code
   - User clicks install
   - Everything happens automatically

5. **Both Build AND Release Needed**
   - Build: Creates the file
   - Release: Makes it findable

