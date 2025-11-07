# Tauri Auto-Update Setup Guide

## Overview

This guide explains how the Tauri auto-update system has been configured for the **loval-laravel-leap** desktop application. The system securely signs and delivers updates to users automatically.

## ✅ What's Been Done

### 1. **Signing Keys Generated** 🔐

Signing keys have been generated and stored at:
- **Private Key**: `~/.tauri/key.txt` (kept secret)
- **Public Key**: `~/.tauri/key.txt.pub` (added to config)

### 2. **Configuration Updated** ⚙️

The `src-tauri/tauri.conf.json` has been updated with:

```json
"plugins": {
  "updater": {
    "active": true,
      "endpoints": [
        "https://github.com/mandolon/app.rehome/releases/download/latest/latest.json"
      ],
    "dialog": true,
    "pubkey": "dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlzaWduIHB1YmxpYyBrZXk6IDRCNTRFRENFNDU1QUEwNzAKUldSd29GcEZ6dTFVUzJ5YnhZcklhVGpMSEZHQnVNbXVDaitwSk1DVyt3aXJIMG41OTRXTW1jWlVtCg=="
  }
}
```

### 3. **GitHub Actions Workflow Ready** ⚡

The existing `.github/workflows/release.yml` is already configured to:
- Build the app for macOS, Ubuntu, and Windows
- Sign the binaries with your private key
- Publish to GitHub releases
- Create the `latest.json` file for updates

## 🚀 How to Use

### Step 1: Set GitHub Secrets

Add these secrets to your GitHub repository (Settings → Secrets and variables → Actions):

1. **`TAURI_SIGNING_PRIVATE_KEY`**
   ```bash
   cat ~/.tauri/key.txt
   ```
   Copy the entire contents and paste as the secret value.

2. **`TAURI_SIGNING_PRIVATE_KEY_PASSWORD`**
   Enter the password you used when generating the keys.

### Step 2: Create a Release

The auto-update workflow triggers on version tags:

```bash
# Update version in src-tauri/tauri.conf.json
# Then create and push a git tag
git tag v1.0.1
git push origin v1.0.1
```

This will:
- Build the app for all platforms
- Sign the artifacts
- Publish to GitHub releases
- Create `latest.json` with update information

### Step 3: Users Get Updates Automatically

When users run your app:
1. The app checks the `latest.json` endpoint on startup
2. If a newer version is available, a dialog appears
3. Users can choose to update or skip
4. The update is signed and verified before installation

## 📋 File Structure

```
src-tauri/tauri.conf.json          ← Public key configured here
.github/workflows/release.yml       ← Workflow that builds & signs
~/.tauri/key.txt                    ← Private key (KEEP SECRET!)
~/.tauri/key.txt.pub                ← Public key
```

## ⚠️ Important Security Notes

### Private Key Management

1. **Never commit** `~/.tauri/key.txt` to git
2. **Back it up securely** (encrypted USB, password manager, etc.)
3. **If you lose it**, you won't be able to sign updates going forward
4. **Never share** the password or the file

### GitHub Secrets

- Only repository maintainers can access these
- They're used only during the build process
- They're masked in logs (won't display in output)

### Signing Process

The workflow:
```
Source Code
    ↓
Build Binaries
    ↓
Sign with Private Key (GitHub Action)
    ↓
Upload to GitHub Releases
    ↓
Generate latest.json
    ↓
Users verify with Public Key (from tauri.conf.json)
```

## 🔍 Verification

To verify everything is set up correctly:

1. **Check the config:**
   ```bash
   cat src-tauri/tauri.conf.json | grep -A 10 "updater"
   ```

2. **Verify keys exist:**
   ```bash
   ls -la ~/.tauri/
   ```

3. **Test a build locally** (requires the private key on your machine):
   ```bash
   export TAURI_SIGNING_PRIVATE_KEY="$(cat ~/.tauri/key.txt)"
   export TAURI_SIGNING_PRIVATE_KEY_PASSWORD="your_password"
   cd src-tauri
   cargo tauri build
   ```

## 🐛 Troubleshooting

### "Signature verification failed"
- Make sure the public key in `tauri.conf.json` matches the one in `~/.tauri/key.txt.pub`
- Check that the endpoint returns valid JSON with signature

### "Update endpoint not reachable"
- Verify the GitHub releases exist and are public
- Check network connectivity
- Review the endpoint URL in tauri.conf.json

### "Private key password not accepted"
- Ensure `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` is set correctly in GitHub Secrets
- Try regenerating keys if password is forgotten

## 📚 Additional Resources

- [Tauri Updater Plugin Docs](https://tauri.app/en/develop/plugins/updater/)
- [Tauri Signing Guide](https://tauri.app/en/develop/guides/publishing/sign/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

## ✨ Next Steps

1. ✅ Add `TAURI_SIGNING_PRIVATE_KEY` to GitHub Secrets
2. ✅ Add `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` to GitHub Secrets
3. ✅ Create a version tag and push to trigger the workflow
4. ✅ Monitor the release workflow execution
5. ✅ Test the update in the app

---

**Setup Completed**: October 18, 2025  
**Repository**: mandolon/loval-laravel-leap  
**Auto-Update System**: ✅ Ready to Deploy
