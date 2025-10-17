# Auto-Update System Documentation

## ✅ Auto-Update System Configured!

Your desktop app now has **automatic update functionality** that will:
- ✅ Check for updates when the app starts
- ✅ Show a dialog when updates are available
- ✅ Download and install updates automatically
- ✅ Work with GitHub Releases (no separate server needed)

---

## How It Works

### 1. **When You Push a Version Tag to GitHub**

The system automatically:
1. Builds installers for Windows, macOS, and Linux
2. Creates a GitHub Release
3. Uploads all installers to the release
4. Generates an `latest.json` file with update information
5. Users' apps check this file and prompt for updates

### 2. **When Users Open the App**

The app:
1. Checks GitHub for newer versions (in background)
2. If found, shows update dialog with release notes
3. User clicks "Download & Install"
4. Downloads update with progress bar
5. Installs and restarts automatically

---

## How to Release a New Version

### Step 1: Update Version Number

**In `src-tauri/tauri.conf.json`:**
```json
{
  "version": "1.0.1"  // ← Change this (was 1.0.0)
}
```

**In `package.json`:**
```json
{
  "version": "1.0.1"  // ← Change this too
}
```

### Step 2: Commit Your Changes

```bash
git add .
git commit -m "Release v1.0.1: Add new features and bug fixes"
git push origin main
```

### Step 3: Create and Push a Version Tag

```bash
# Create the tag (must start with 'v')
git tag v1.0.1

# Push the tag to GitHub
git push origin v1.0.1
```

### Step 4: Wait for Build (Automatic!)

GitHub Actions will automatically:
- Build for Windows (`.msi`, `.exe`)
- Build for macOS (`.dmg` universal binary)
- Build for Linux (`.deb`, `.AppImage`)
- Create GitHub Release with all files
- Generate `latest.json` for auto-update

**Build time**: ~20-30 minutes

### Step 5: Verify the Release

1. Go to: `https://github.com/mandolon/loval-laravel-leap/releases`
2. You should see your new release (e.g., "Release v1.0.1")
3. Check that all installers are attached
4. Check that `latest.json` is present

**Done!** Users will now be prompted to update when they open the app.

---

## Version Numbering Guide

Use **Semantic Versioning** (MAJOR.MINOR.PATCH):

### MAJOR Version (1.x.x → 2.0.0)
Breaking changes, major rewrites
- Example: Complete UI redesign, incompatible database changes

### MINOR Version (x.1.x → x.2.0)
New features, backward compatible
- Example: New AI chat feature, new report types

### PATCH Version (x.x.1 → x.x.2)
Bug fixes, small improvements
- Example: Fix crash bug, improve performance

### Examples:
```bash
v1.0.0  # Initial release
v1.0.1  # Bug fix
v1.1.0  # Added new feature
v1.1.1  # Fixed bug in new feature
v2.0.0  # Major rewrite
```

---

## What Users See

### On App Startup (if update available):

```
┌─────────────────────────────────────────┐
│  🔄 Update Available                    │
│                                         │
│  Version 1.1.0 is now available.        │
│  You are currently using version 1.0.0  │
│                                         │
│  What's New:                            │
│  - Added new AI chat features           │
│  - Improved performance                 │
│  - Fixed bug with file uploads          │
│                                         │
│  Released: January 15, 2025             │
│                                         │
│  [Skip This Version] [Download & Install]│
└─────────────────────────────────────────┘
```

### During Download:

```
┌─────────────────────────────────────────┐
│  Downloading update...           45%    │
│  ████████████░░░░░░░░░░░░░░░░           │
└─────────────────────────────────────────┘
```

### After Install:

```
Update Downloaded!
Restarting application to apply update...
```

App restarts with new version ✅

---

## Release Workflow Example

### Scenario: You fixed a bug and want to release v1.0.1

```bash
# 1. Update version in files
# Edit src-tauri/tauri.conf.json: "version": "1.0.1"
# Edit package.json: "version": "1.0.1"

# 2. Commit changes
git add src-tauri/tauri.conf.json package.json
git commit -m "Bump version to 1.0.1"

# 3. Push to GitHub
git push origin main

# 4. Create and push tag
git tag v1.0.1
git push origin v1.0.1

# 5. GitHub Actions builds automatically
# Check progress: https://github.com/mandolon/loval-laravel-leap/actions

# 6. After ~20-30 minutes, release is ready
# Users will be prompted to update!
```

---

## Testing Updates Locally

### Before creating a real release, test the update system:

1. **Build your current version**:
   ```bash
   npm run tauri:build
   ```

2. **Install it on your computer**

3. **Make changes to your app**

4. **Bump the version** in config files (e.g., to 1.0.1)

5. **Create a test release manually on GitHub**:
   - Go to Releases → "Draft a new release"
   - Tag: `v1.0.1`
   - Upload your built installers
   - Create `latest.json` manually (see template below)
   - Publish release

6. **Open your installed app** (version 1.0.0)

7. **App should detect and offer update to 1.0.1**

---

## Manual latest.json Template

If you need to create `latest.json` manually for testing:

```json
{
  "version": "v1.0.1",
  "notes": "What's new in this version:\n- Feature 1\n- Bug fix 2",
  "pub_date": "2025-01-15T10:00:00Z",
  "platforms": {
    "windows-x86_64": {
      "signature": "",
      "url": "https://github.com/mandolon/loval-laravel-leap/releases/download/v1.0.1/loval-laravel-leap_1.0.1_x64_en-US.msi"
    },
    "darwin-x86_64": {
      "signature": "",
      "url": "https://github.com/mandolon/loval-laravel-leap/releases/download/v1.0.1/loval-laravel-leap.app.tar.gz"
    },
    "darwin-aarch64": {
      "signature": "",
      "url": "https://github.com/mandolon/loval-laravel-leap/releases/download/v1.0.1/loval-laravel-leap.app.tar.gz"
    },
    "linux-x86_64": {
      "signature": "",
      "url": "https://github.com/mandolon/loval-laravel-leap/releases/download/v1.0.1/loval-laravel-leap_1.0.1_amd64.AppImage"
    }
  }
}
```

Upload this as `latest.json` to your release.

---

## Configuration Details

### Files Modified:

1. **`src-tauri/Cargo.toml`**
   - Added `tauri-plugin-updater = "2"`

2. **`src-tauri/src/main.rs`**
   - Registered updater plugin

3. **`src-tauri/tauri.conf.json`**
   ```json
   {
     "plugins": {
       "updater": {
         "active": true,
         "endpoints": [
           "https://github.com/mandolon/loval-laravel-leap/releases/latest/download/latest.json"
         ],
         "dialog": true,
         "pubkey": ""
       }
     }
   }
   ```

4. **`src/App.tsx`**
   - Added `<UpdateChecker />` component

5. **`src/components/UpdateChecker.tsx`**
   - React component that checks for updates
   - Shows dialog with download progress

6. **`.github/workflows/release.yml`**
   - GitHub Actions workflow
   - Builds all platforms
   - Creates releases automatically

---

## Settings Explained

### `"active": true`
Enable the updater system

### `"endpoints"`
Where to check for updates (GitHub releases)

### `"dialog": true`
Show built-in update dialog (we use custom React dialog instead)

### `"pubkey": ""`
For signed updates (optional, leave empty for now)

---

## Advanced: Code Signing (Optional)

For enhanced security, you can sign updates:

### 1. Generate Keys

```bash
# On Mac/Linux:
openssl genrsa -out private.key 2048
openssl rsa -in private.key -pubout -out public.key

# On Windows (PowerShell):
# Download OpenSSL first
```

### 2. Add Public Key to Config

**In `src-tauri/tauri.conf.json`:**
```json
{
  "plugins": {
    "updater": {
      "pubkey": "YOUR_PUBLIC_KEY_HERE"
    }
  }
}
```

### 3. Sign Updates in CI/CD

Add private key to GitHub Secrets and modify workflow to sign builds.

**Benefits**: Ensures updates aren't tampered with  
**Downside**: More complex setup

**Recommendation**: Skip for now, add later if needed

---

## Troubleshooting

### Users Not Getting Update Prompts

**Possible causes**:
1. They're already on the latest version
2. App can't reach GitHub (firewall/offline)
3. `latest.json` is missing or malformed

**Solution**: Check release has `latest.json` file

### GitHub Actions Build Fails

**Check**:
1. Version tag format: Must be `v1.0.0` (with 'v')
2. Secrets configured (GITHUB_TOKEN is automatic)
3. Build logs in Actions tab

### Update Downloads But Doesn't Install

**Possible causes**:
1. Antivirus blocking installer
2. User doesn't have admin permissions
3. App is in a protected folder

**Solution**: Tell users to run as administrator

### latest.json 404 Error

**Cause**: File not uploaded to release

**Solution**: 
1. Check release has `latest.json`
2. If missing, upload manually or re-run workflow

---

## Monitoring Updates

### View Update Statistics

Check GitHub Release insights:
- Number of downloads per installer
- Which platforms are most popular
- Update adoption rate

### User Feedback

Add analytics to track:
- How many users update
- How long before they update
- Update success rate

---

## Disabling Auto-Update (If Needed)

### Temporarily Disable

**In `src-tauri/tauri.conf.json`:**
```json
{
  "plugins": {
    "updater": {
      "active": false  // ← Changed from true
    }
  }
}
```

### Remove Completely

1. Remove from `Cargo.toml`
2. Remove from `main.rs`
3. Remove `UpdateChecker` from `App.tsx`
4. Delete `.github/workflows/release.yml`

---

## Best Practices

### ✅ DO:
- Test updates locally before releasing
- Write clear release notes
- Use semantic versioning
- Keep version numbers in sync (package.json & tauri.conf.json)
- Test on all platforms before releasing

### ❌ DON'T:
- Skip version numbers (1.0.0 → 1.0.2, skip 1.0.1)
- Release without testing
- Change version format mid-project
- Delete old releases (users may still be updating from them)

---

## Release Checklist

Use this before every release:

- [ ] Updated version in `src-tauri/tauri.conf.json`
- [ ] Updated version in `package.json`
- [ ] Tested app locally
- [ ] Committed all changes
- [ ] Pushed to GitHub
- [ ] Created version tag (`git tag v1.0.1`)
- [ ] Pushed tag (`git push origin v1.0.1`)
- [ ] Waited for GitHub Actions to complete
- [ ] Verified release on GitHub
- [ ] Verified `latest.json` is present
- [ ] Tested update on old version of app
- [ ] Announced release to users

---

## Summary

✅ **Auto-update is configured and ready!**

**To release a new version**:
1. Change version numbers in config files
2. Commit and push changes
3. Create and push a version tag: `git tag v1.0.1 && git push origin v1.0.1`
4. GitHub Actions builds and releases automatically (~30 min)
5. Users get prompted to update automatically

**Next release**:
- Current: `v1.0.0`
- Next: `v1.0.1` (bug fix) or `v1.1.0` (new feature)

That's it! Your app will now update itself automatically. 🚀

---

## Quick Reference

```bash
# Create new release
git tag v1.0.1
git push origin v1.0.1

# Check build progress
# https://github.com/mandolon/loval-laravel-leap/actions

# View releases
# https://github.com/mandolon/loval-laravel-leap/releases

# Update endpoint
# https://github.com/mandolon/loval-laravel-leap/releases/latest/download/latest.json
```
