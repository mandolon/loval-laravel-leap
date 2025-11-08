# ACTION PLAN: Get Update Dialog Working

## Why No Dialog Currently

```
Your app checks: https://github.com/mandolon/app.rehome/releases/download/latest/latest.json

GitHub responds: 404 NOT FOUND

App logic: "No latest.json found → No update available → No dialog"

Solution: Upload latest.json to GitHub!
```

---

## ✅ What's Already Done

- ✅ Code changes made (onboarding, filtering, etc.)
- ✅ Version updated to 1.0.1
- ✅ Pushed to GitHub
- ✅ Config is correct (dialog: true)
- ✅ All features tested

---

## ⏳ What You Need to Do (3 Steps)

### STEP 1: Build (15 minutes)

```powershell
cd f:\loval-laravel-leap
npm run build:tauri
```

Wait for it to complete. Output file:
```
src-tauri/target/release/rehome_1.0.1_x64_en-US.msi
```

**Why?** Creates the binary that users download

---

### STEP 2: Create GitHub Release

1. Go to: https://github.com/mandolon/app.rehome/releases/new

2. Fill in form:
   - **Tag**: `v1.0.1`
   - **Release title**: `v1.0.1 - Update`
   - **Description**:
   ```
   ## What's New
   - Onboarding wizard for new team members
   - Fixed project visibility in side rail
   - Improved Excalidraw interface
   - Better project access control
   ```

3. **Upload the MSI file**:
   - Click "Attach binaries"
   - Select: `src-tauri/target/release/rehome_1.0.1_x64_en-US.msi`

4. Click **Publish release**

**Why?** Makes the binary available to users

---

### STEP 3: Upload latest.json

1. Copy this text into a new file called `latest.json`:

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

2. Go back to the release you just created

3. Click **Edit** release

4. Upload `latest.json` as an attachment

5. Click **Set as the latest release** (check the box)

6. Click **Update release**

**Why?** This tells your app that v1.0.1 is available!

---

## 🧪 Test It (After Step 3)

1. Close your app completely

2. Wait 3 seconds

3. Open app again

4. **Wait 2-3 seconds for app to start**

5. **Look for dialog**:
   ```
   ┌─────────────────────────────┐
   │ Update Available            │
   │                             │
   │ v1.0.1 ready to install    │
   │                             │
   │ [Cancel] [Install Update]  │
   └─────────────────────────────┘
   ```

6. Click **[Install Update]**

7. App restarts with v1.0.1 ✅

---

## 📋 Detailed Instructions for Step 3

### Creating latest.json (The File That Matters)

```
1. Open any text editor (Notepad)

2. Paste this exactly:

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

3. Save as: latest.json (NOT latest.json.txt)

4. Go to GitHub release v1.0.1

5. Click [Edit]

6. Under "Attachments" or "Assets":
   - Drag & drop latest.json
   
7. Check box: "Set as the latest release"

8. Click [Update release]
```

**That's it!** Your app now has everything it needs.

---

## Why Each Step Matters

### Step 1: npm run build:tauri
```
Creates: rehome_1.0.1_x64_en-US.msi
Purpose: The file users download and install
Without it: Users can't get the new version
```

### Step 2: GitHub Release
```
Creates: Release page v1.0.1
Purpose: Public place to host the MSI
Without it: Nowhere to store the file
```

### Step 3: latest.json
```
Creates: Manifest file (1-2 KB)
Purpose: Tells app "v1.0.1 is available"
Without it: App doesn't know to show dialog
```

---

## The Complete Flow After You Finish

```
Your App (v1.0.0)
    ↓
User launches app
    ↓
App checks: https://github.com/.../latest/latest.json
    ↓
GitHub responds with latest.json
    ↓
App reads: "version": "1.0.1"
    ↓
App compares:
  Local: 1.0.0
  Remote: 1.0.1
  1.0.1 > 1.0.0 → Update available!
    ↓
Dialog appears: "v1.0.1 ready to install"
    ↓
User clicks: [Install Update]
    ↓
App downloads: rehome_1.0.1_x64_en-US.msi
    ↓
App installs: Updates files
    ↓
App restarts
    ↓
User has v1.0.1 ✅
All new features work!
```

---

## Estimated Time

- **Step 1 (Build)**: 15 minutes (automatic)
- **Step 2 (GitHub Release)**: 5 minutes (you)
- **Step 3 (Upload latest.json)**: 2 minutes (you)
- **Testing**: 2 minutes
- **Total**: 25 minutes

---

## If You Get Stuck

### Issue: Build fails
```
Solution: Make sure you have:
- Rust installed (rustup update)
- Visual C++ build tools
- Node.js and npm installed

Then retry: npm run build:tauri
```

### Issue: Can't find MSI file
```
Solution: After build completes:
1. Go to: f:\loval-laravel-leap\src-tauri\target\release\
2. Look for: rehome_1.0.1_x64_en-US.msi
3. It should be there (~50-100 MB)
```

### Issue: Dialog still doesn't show
```
Solution: Check:
1. Is latest.json on GitHub? (Try opening URL in browser)
2. Does latest.json have version 1.0.1?
3. Is URL in latest.json correct?
4. Is v1.0.1 marked as "latest release"?
```

---

## Reference Docs

See these files for more details:

1. **WHY_NO_UPDATE_DIALOG.md** - Explains the problem
2. **TAURI_RELEASE_QUICK_START.md** - Quick checklist
3. **HOW_TAURI_AUTO_UPDATE_WORKS.md** - Deep explanation
4. **TAURI_AUTO_UPDATE_CODE_DEEP_DIVE.md** - Technical details

---

## Success Criteria

When everything works:

```
✅ User sees update dialog on app launch
✅ User clicks "Install Update"
✅ MSI downloads automatically
✅ Installation runs silently
✅ App restarts
✅ User has v1.0.1
✅ All features working
```

---

## Ready?

**Go do Step 1**: `npm run build:tauri`

Then come back and do Steps 2 & 3 on GitHub.

That's all you need to do to get the update dialog working! 🚀

