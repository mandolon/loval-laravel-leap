# Why You Don't See the Update Dialog - Diagnostic Guide

## The Short Answer

**The update dialog won't show because:**

1. ✅ Config is correct (dialog: true)
2. ❌ But we haven't done the release yet
3. ❌ No latest.json on GitHub
4. ❌ App is checking but finding nothing

When the app checks for updates, it does:

```
GET https://github.com/mandolon/app.rehome/releases/download/latest/latest.json

Response: 404 NOT FOUND

Result: No update dialog (nothing to update to!)
```

---

## Why Updating the Code Doesn't Show Dialog

### What You Did

```
npm install updated packages
git push code to GitHub
```

### Why No Dialog

```
Tauri auto-update checks GitHub RELEASES, not the code branch

GitHub Releases Page:
├─ v1.0.0 (current release)
│  └─ Has: old MSI file
│
└─ (nothing else here)

latest.json: NOT FOUND
Result: No update available → No dialog shown
```

The app only shows the dialog when:
1. It checks the endpoint
2. Finds latest.json
3. latest.json has a NEWER version than current app
4. Then shows dialog

Right now:
```
App version: 1.0.0 (what you installed)
latest.json: DOESN'T EXIST
Can't compare → No dialog
```

---

## The Complete Process (What's Missing)

### What You've Done ✅

```
1. ✅ Code changes (onboarding, filtering, etc.)
2. ✅ Pushed to GitHub
3. ✅ Updated version to 1.0.1 in tauri.conf.json
4. ✅ Committed all changes
5. ✅ Config has dialog: true
```

### What's Still Needed ⏳

```
6. ⏳ BUILD: npm run build:tauri
   Creates: rehome_1.0.1_x64_en-US.msi

7. ⏳ RELEASE on GitHub:
   Upload: rehome_1.0.1_x64_en-US.msi
   Upload: latest.json (with version 1.0.1)

8. ⏳ THEN: Users see dialog

Flow:
App checks → Finds latest.json → Sees v1.0.1 available → Shows dialog ✓
```

---

## The Missing Pieces

### Missing Piece #1: MSI Binary

```
What it is: Compiled executable installer
Where it goes: GitHub Releases
Created by: npm run build:tauri

Without it: Users can't install update
Result: No point showing dialog
```

### Missing Piece #2: latest.json

```
What it is: Manifest file telling app about update
Where it goes: GitHub Releases
Created by: You (manually)

Without it: App doesn't know update exists
Result: No dialog shown

latest.json looks like:
{
  "version": "1.0.1",
  "notes": "...",
  "pub_date": "...",
  "platforms": {
    "win64": {
      "url": "github.com/.../rehome_1.0.1_x64_en-US.msi",
      "signature": "..."
    }
  }
}
```

---

## What Actually Happens When You Update Code Without Releasing

### Your App Right Now

```
Installed: rehome v1.0.0
App checks: https://github.com/mandolon/app.rehome/releases/download/latest/latest.json

Response: 404 NOT FOUND
(latest.json doesn't exist yet)

App logic:
if (latest.json exists) {
  read version from latest.json
  if (version > current_version) {
    show_dialog()
  }
} else {
  // latest.json not found - do nothing
}

Result: No dialog appears ✗
```

---

## Why The Config IS Correct

Your `tauri.conf.json` has:

```json
{
  "plugins": {
    "updater": {
      "active": true,
      "dialog": true,
      "endpoints": [
        "https://github.com/mandolon/app.rehome/releases/download/latest/latest.json"
      ]
    }
  }
}
```

This is perfect! It means:
- ✅ Auto-update is enabled
- ✅ Dialog will show when update available
- ✅ Checks correct endpoint
- ✅ Everything configured correctly

BUT: The endpoint returns 404 because latest.json doesn't exist yet

---

## The Solution: Complete the Release

### Step 1: Build

```powershell
npm run build:tauri
```

Output:
```
src-tauri/target/release/rehome_1.0.1_x64_en-US.msi ← This file
```

Wait: ~15 minutes

### Step 2: Upload to GitHub

Go to: https://github.com/mandolon/app.rehome/releases

1. Click "Create a new release"
2. Tag: `v1.0.1`
3. Title: "v1.0.1 - Updates"
4. Upload the MSI file

### Step 3: Upload latest.json

Create a file named `latest.json`:

```json
{
  "version": "1.0.1",
  "notes": "Onboarding wizard, project visibility fixes, Excalidraw customizations",
  "pub_date": "2025-11-08T00:00:00Z",
  "platforms": {
    "win64": {
      "signature": "",
      "url": "https://github.com/mandolon/app.rehome/releases/download/v1.0.1/rehome_1.0.1_x64_en-US.msi"
    }
  }
}
```

Upload this to the same release

### Step 4: Set as Latest Release

- Go to releases list
- Click edit on v1.0.1
- Check: "Set as the latest release"
- Save

### Now Test

1. Close your app (v1.0.0)
2. Reopen it
3. App checks GitHub
4. Finds latest.json
5. Sees v1.0.1 available
6. Shows dialog! ✅

---

## Timeline: What Happened vs What Needs to Happen

### What Happened ✅
```
Nov 8, 2025
├─ Code changes made
├─ Pushed to GitHub main branch
├─ Version updated to 1.0.1
└─ Config is correct (dialog: true)

Result: Code is in GitHub, but no release yet
```

### What Needs to Happen ⏳
```
Nov 8-9, 2025
├─ npm run build:tauri (creates MSI)
├─ Create GitHub release v1.0.1
├─ Upload MSI file
├─ Upload latest.json
└─ Set as latest release

Result: Users see update dialog ✓
```

---

## Verification Checklist

### Config ✅
- [x] updater.active = true
- [x] updater.dialog = true
- [x] endpoint = releases/download/latest/latest.json
- [x] pubkey configured

### Code ✅
- [x] Features implemented
- [x] Version updated to 1.0.1
- [x] Pushed to GitHub

### Missing ⏳
- [ ] MSI file built
- [ ] MSI uploaded to GitHub
- [ ] latest.json created
- [ ] latest.json uploaded to GitHub
- [ ] v1.0.1 set as latest release

---

## Testing After You Complete Release

After you upload MSI and latest.json:

### Test on Your PC

1. Close app v1.0.0
2. Wait a few seconds
3. Reopen app
4. Wait 2-3 seconds
5. Dialog should appear!

### What You'll See

```
┌──────────────────────────────────┐
│ Update Available                 │
│                                  │
│ v1.0.1 is ready to install      │
│                                  │
│ [Cancel]  [Install Update]      │
└──────────────────────────────────┘
```

### If No Dialog

Check:
1. Is latest.json on GitHub? (404 = not there)
2. Is version in latest.json > 1.0.0?
3. Is MSI file uploaded?
4. Is v1.0.1 set as latest release?

---

## Common Mistakes

### Mistake 1: Forget to Upload latest.json

```
Result: App checks GitHub
        Finds no latest.json
        Shows no dialog
        Users don't know about update
```

Solution: Upload latest.json to release assets

### Mistake 2: latest.json Has Wrong Version

```
latest.json says: "version": "1.0.0"
App says: "I'm 1.0.0"
Comparison: 1.0.0 = 1.0.0 (same version!)
Result: No update available → No dialog
```

Solution: Make sure latest.json has version 1.0.1

### Mistake 3: Wrong URL in latest.json

```
latest.json points to: wrong-url/wrong-file.msi
User clicks install
Download fails
Installation fails
```

Solution: Verify URL matches actual MSI file location

### Mistake 4: Endpoint URL Wrong

```
Config points to: github.com/wrong-user/wrong-repo/...
App checks wrong URL
404 not found
No dialog
```

Solution: Verify URL in tauri.conf.json (it's correct!)

---

## Why You Did It Correctly, But Still No Dialog

### What You Did Right ✅

1. ✅ Code changes are good
2. ✅ Version updated correctly
3. ✅ Config is correct
4. ✅ Committed everything
5. ✅ Pushed to GitHub

### What's Still Needed ⏳

1. ⏳ Build the binary (MSI)
2. ⏳ Create GitHub release
3. ⏳ Upload files to release
4. ⏳ Create latest.json
5. ⏳ Upload latest.json

It's not that anything is wrong - you just haven't completed the release steps yet!

---

## Next Steps (Do These)

1. **Build**: `npm run build:tauri` (takes 15 min)
2. **Release**: Go to GitHub and create v1.0.1 release
3. **Upload**: Add MSI + latest.json to release
4. **Test**: Close and reopen app
5. **See**: Update dialog appears! ✅

---

## Summary

| Item | Status | Why? |
|------|--------|------|
| Config correct? | ✅ Yes | dialog: true, correct endpoint |
| Code updated? | ✅ Yes | Pushed to GitHub |
| App built? | ❌ No | Need: npm run build:tauri |
| Release created? | ❌ No | Need: GitHub release |
| latest.json exists? | ❌ No | Need: Upload to GitHub |
| Dialog shows? | ❌ No | Because latest.json missing |

The config and code are perfect! You just need to complete the release steps.

