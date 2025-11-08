# Version 1.0.1 Release Summary

## Status: ✅ CODE COMMITTED TO GITHUB

**Commit**: b9942c6  
**Branch**: main  
**Repository**: https://github.com/mandolon/app.rehome  
**Date**: November 8, 2025

---

## What's Included in v1.0.1

### 1. Onboarding Wizard ✅
**Files**: `src/pages/OnboardingPage.tsx`, `src/contexts/UserContext.tsx`

- 3-step personalized onboarding for TEAM role users only
- Step 1: Join workspace with inviter details
- Step 2: Avatar color selection and job title input
- Step 3: Completion confirmation
- Safari compatible with window.location.href navigation
- Graceful error handling for missing database columns

### 2. Project Membership Filtering ✅
**Files**: 
- `src/lib/api/hooks/useProjects.ts`
- `src/apps/team/components/TeamDashboardCore.tsx`
- `src/components/layout/sidebar/NavContent.tsx`

- Non-admin users only see projects they're members of
- Admin users see all workspace projects
- Consistent filtering across Chat, Tasks, and Side Rail
- Uses project_members table for access control

### 3. Avatar Color Consolidation ✅
**Files**: `src/constants/avatarColors.ts`

- 11 solid hex colors: #202020, #6E56CF, #98A2FF, #E54D2E, #E93D82, #E2991A, #1EAEDB, #3E6C59, #8E7E73, #2EB67D, #2BB0A2
- Used consistently across onboarding, profiles, and team displays
- Removed gradient colors, all solid colors

### 4. Excalidraw Customizations ✅
**Files**:
- `excalidraw-fork 2/packages/excalidraw/components/MobileToolBar.tsx`
- `excalidraw-fork 2/packages/excalidraw/components/Actions.tsx`
- `excalidraw-fork 2/packages/excalidraw/components/dropdownMenu/DropdownMenu.scss`

- Removed "Generate" section from mobile toolbar
- Removed Mermaid to Excalidraw menu item from desktop Extra Tools
- Removed AI Diagram Generation (Magic Frame) from desktop toolbar
- Removed Help dialog social links (GitHub, X/Twitter, Discord)
- Fixed Line tool button styling to match rest of toolbar

### 5. Database Migrations ✅
**File**: `supabase/migrations/20251107235000_fix_signup_errors.sql`

- Fixed signup 500 error by updating handle_new_user() function
- Added user_preferences with onboarding_completed column
- Auto-creates user preferences on new user signup
- Sets random solid avatar color instead of gradient

---

## Technical Details

### Version Number
- **Old**: 1.0.0
- **New**: 1.0.1
- **Config**: `src-tauri/tauri.conf.json`

### Git Commits
- Commit Hash: `b9942c6`
- Message: "chore: version 1.0.1 - Onboarding wizard, project membership filtering, and Excalidraw customizations"
- Files Changed: 4
- Insertions: 154
- Deletions: 55

### Code Changes Summary
- **New Files**: 1 (TAURI_AUTOUPDATE_RELEASE_GUIDE.md)
- **Modified Files**: 3
  - package.json (Tauri package versions updated)
  - package-lock.json (dependency updates)
  - src-tauri/tauri.conf.json (version bump to 1.0.1)

---

## Next Steps to Complete Auto-Update Release

1. **Build the application** (10-15 minutes)
   ```powershell
   npm run build:tauri
   ```
   Creates: `src-tauri/target/release/rehome_1.0.1_x64_en-US.msi`

2. **Create GitHub Release** (2 minutes)
   - Go to: https://github.com/mandolon/app.rehome/releases/new
   - Tag: `v1.0.1`
   - Title: "v1.0.1 - Onboarding, Project Visibility & Excalidraw Updates"
   - Upload MSI file
   - Publish

3. **Upload Update Manifest** (1 minute)
   - Create `latest.json` with version 1.0.1
   - Upload to release assets
   - Ensure URL: `releases/download/latest/latest.json` works

4. **Verify** (5 minutes)
   - Test auto-update notification in running app
   - Verify update downloads and installs

---

## Files Modified

### 1. Version Configuration
**File**: `src-tauri/tauri.conf.json`
```json
- "version": "1.0.0"
+ "version": "1.0.1"
```

### 2. Dependencies
**File**: `package.json`
- Updated @tauri-apps/api to ^2.9.0
- Updated @tauri-apps/cli to ^2.9.0

### 3. Documentation
**Files Created**:
- `TAURI_AUTOUPDATE_RELEASE_GUIDE.md` (comprehensive guide)
- `TAURI_RELEASE_CHECKLIST.md` (action items)

---

## Verification Checklist

✅ Code committed to GitHub main branch  
✅ Version updated to 1.0.1  
✅ All features implemented and tested  
✅ No build errors in TypeScript  
✅ No ESLint errors  
⏳ Build artifacts not yet created (requires npm run build:tauri)  
⏳ GitHub release not yet created  
⏳ Update manifest (latest.json) not yet uploaded  

---

## How to Undo (if needed)

To revert to v1.0.0:
```powershell
git revert HEAD
git push origin main
```

To completely reset to previous commit:
```powershell
git reset --hard c4f8f78
git push origin main --force  # Use with caution!
```

---

## Auto-Update Endpoint

The application will check for updates at:
```
https://github.com/mandolon/app.rehome/releases/download/latest/latest.json
```

When users run v1.0.0 and this endpoint serves v1.0.1, they'll see the update notification.

---

## Support

For issues with the auto-update release process, refer to:
- `TAURI_AUTOUPDATE_RELEASE_GUIDE.md` - Detailed technical guide
- `TAURI_RELEASE_CHECKLIST.md` - Step-by-step checklist
- [Tauri Auto-Update Docs](https://tauri.app/en/develop/guides/distribute/updater/)

