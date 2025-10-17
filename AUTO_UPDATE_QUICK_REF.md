# Auto-Update Quick Reference

## ✅ System Status: CONFIGURED & READY

Your desktop app now has **automatic updates** via GitHub Releases!

---

## 🚀 How to Release a New Version (3 Steps)

### Step 1: Update Version Numbers

**File: `src-tauri/tauri.conf.json`**
```json
{
  "version": "1.0.1"  // ← Change this
}
```

**File: `package.json`**
```json
{
  "version": "1.0.1"  // ← Change this too
}
```

### Step 2: Commit & Push

```bash
git add .
git commit -m "Release v1.0.1: Your changes here"
git push origin main
```

### Step 3: Create & Push Tag

```bash
git tag v1.0.1
git push origin v1.0.1
```

**Done!** GitHub Actions builds automatically in ~30 minutes.

---

## 📦 What Happens Automatically

When you push a tag (e.g., `v1.0.1`):

1. ✅ **Builds** Windows, macOS, Linux installers
2. ✅ **Creates** GitHub Release
3. ✅ **Uploads** all installers to release
4. ✅ **Generates** `latest.json` update manifest
5. ✅ **Notifies** users in-app about update

**No manual work required!**

---

## 👥 What Users See

### When Update Available:

```
🔄 Update Available

Version 1.0.1 is now available.
You are currently using 1.0.0

What's New:
- Fixed bug with file uploads
- Improved performance
- Added new features

[Skip This Version] [Download & Install]
```

### User clicks "Download & Install":

- Progress bar shows download
- Auto-installs when complete
- App restarts with new version
- ✅ Updated!

---

## 📋 Version Numbering

Use format: `MAJOR.MINOR.PATCH`

| Change Type | Example | When to Use |
|-------------|---------|-------------|
| **PATCH** | 1.0.0 → 1.0.1 | Bug fixes only |
| **MINOR** | 1.0.0 → 1.1.0 | New features (backward compatible) |
| **MAJOR** | 1.0.0 → 2.0.0 | Breaking changes |

**Always start tag with 'v'**: `v1.0.1` ✅ not `1.0.1` ❌

---

## 🔍 Check Release Status

### View Builds in Progress:
```
https://github.com/mandolon/loval-laravel-leap/actions
```

### View All Releases:
```
https://github.com/mandolon/loval-laravel-leap/releases
```

### Check Update Endpoint:
```
https://github.com/mandolon/loval-laravel-leap/releases/latest/download/latest.json
```

---

## ⚡ Quick Commands

```bash
# Current version
git describe --tags

# List all tags
git tag

# Delete a tag (if needed)
git tag -d v1.0.1
git push origin :refs/tags/v1.0.1

# Create new release
git tag v1.0.1 -m "Bug fixes and improvements"
git push origin v1.0.1
```

---

## 🛠️ Files Changed

Auto-update is configured in:

- ✅ `src-tauri/Cargo.toml` - Added updater plugin
- ✅ `src-tauri/src/main.rs` - Initialized updater
- ✅ `src-tauri/tauri.conf.json` - Updater config
- ✅ `src/App.tsx` - Added UpdateChecker component
- ✅ `src/components/UpdateChecker.tsx` - Update UI
- ✅ `.github/workflows/release.yml` - CI/CD automation

---

## ⏱️ Build Times

| Platform | Build Time |
|----------|-----------|
| Windows | ~5-8 min |
| macOS | ~12-15 min |
| Linux | ~5-8 min |
| **Total** | **~25-30 min** |

Builds run in parallel, so total is ~30 minutes.

---

## 📊 Release Checklist

Before pushing a tag:

- [ ] Version updated in `src-tauri/tauri.conf.json`
- [ ] Version updated in `package.json`
- [ ] Changes tested locally
- [ ] Changes committed and pushed
- [ ] Release notes prepared

Then:

- [ ] Create tag: `git tag v1.0.1`
- [ ] Push tag: `git push origin v1.0.1`
- [ ] Wait ~30 min for build
- [ ] Verify release on GitHub
- [ ] Test update in old version of app

---

## 🚨 Troubleshooting

### Build Failed?
Check Actions tab: https://github.com/mandolon/loval-laravel-leap/actions

### Users Not Seeing Update?
1. Check release has `latest.json` file
2. Verify they're on older version
3. Check their internet connection

### Want to Undo a Release?
1. Delete the tag: `git tag -d v1.0.1`
2. Delete on GitHub: `git push origin :refs/tags/v1.0.1`
3. Delete the release on GitHub web interface

---

## 📖 Full Documentation

- **Complete Guide**: `AUTO_UPDATE_GUIDE.md`
- **Build Guide**: `BUILD_SUCCESS.md`
- **macOS Guide**: `MACOS_BUILD_GUIDE.md`

---

## 🎯 Example: Release v1.0.1

```bash
# 1. Update versions in config files
# (Edit src-tauri/tauri.conf.json and package.json)

# 2. Commit
git add .
git commit -m "Release v1.0.1: Fix file upload bug"

# 3. Push
git push origin main

# 4. Tag
git tag v1.0.1

# 5. Push tag (triggers build)
git push origin v1.0.1

# 6. Monitor build
# https://github.com/mandolon/loval-laravel-leap/actions

# 7. After ~30 min, release is live!
# https://github.com/mandolon/loval-laravel-leap/releases
```

---

## ✅ Summary

**Configured**: Auto-update system with GitHub Actions  
**Trigger**: Push tag (`git push origin v1.0.1`)  
**Build Time**: ~30 minutes  
**User Experience**: Automatic in-app update prompts  
**Platforms**: Windows, macOS (universal), Linux  

**Your app will now update itself!** 🚀
