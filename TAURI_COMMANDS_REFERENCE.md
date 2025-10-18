# Tauri Auto-Update: Command Reference

## 🔧 All Commands You'll Need

### ✅ Already Completed

```bash
# 1. Generated signing keys (DONE)
npx tauri signer generate -w ~/.tauri/key.txt

# 2. Public key added to tauri.conf.json (DONE)
# 3. GitHub Actions workflow is ready (DONE)
```

---

## ⏳ Next: Set Up GitHub Secrets

### Step 1: Copy Private Key
```bash
cat ~/.tauri/key.txt
# Copy the entire output (including -----BEGIN and -----END lines)
```

### Step 2: Manually Add to GitHub
1. Go to: https://github.com/mandolon/loval-laravel-leap/settings/secrets/actions
2. Click "New repository secret"
3. Name: `TAURI_SIGNING_PRIVATE_KEY`
4. Value: Paste the key from Step 1
5. Repeat for `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` (enter your password)

---

## 🚀 Create Your First Release

### Update Version
```bash
cd /Users/pepe/Documents/loval-laravel-leap
# Edit src-tauri/tauri.conf.json
# Change "version": "1.0.0" to your new version like "1.0.1"
```

### Create Release Tag
```bash
git add src-tauri/tauri.conf.json
git commit -m "bump: version to 1.0.1"
git tag v1.0.1
git push origin main
git push origin v1.0.1
```

### Watch the Build
```bash
# Go to GitHub Actions dashboard to monitor:
# https://github.com/mandolon/loval-laravel-leap/actions
```

---

## 🧪 Test Locally (Optional)

### Build with Signing on Your Machine
```bash
cd /Users/pepe/Documents/loval-laravel-leap

# Set environment variables
export TAURI_SIGNING_PRIVATE_KEY="$(cat ~/.tauri/key.txt)"
export TAURI_SIGNING_PRIVATE_KEY_PASSWORD="your_password_here"

# Build
cd src-tauri
cargo tauri build
```

---

## 📋 Verify Configuration

### Check Config
```bash
cat /Users/pepe/Documents/loval-laravel-leap/src-tauri/tauri.conf.json | grep -A 8 '"updater"'
```

Expected output:
```json
"updater": {
  "active": true,
  "endpoints": [
    "https://github.com/mandolon/loval-laravel-leap/releases/download/latest/latest.json"
  ],
  "dialog": true,
  "pubkey": "dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlzaWduIHB1YmxpYyBrZXk6IDRCNTRFRURFNDU1QUEwNzAKUldSd29GcEZ6dTFVUzJ5YnhZcklhVGpMSEZHQnVNbXVDaitwSk1DVyt3aXJIMG41OTRXTW1jWlVtCg=="
}
```

### Check Keys Exist
```bash
ls -la ~/.tauri/
# Should show: key.txt (private) and key.txt.pub (public)
```

### Check Workflow File
```bash
cat /Users/pepe/Documents/loval-laravel-leap/.github/workflows/release.yml | grep -A 5 "TAURI_SIGNING"
```

---

## 🔐 Secret Keys Reference

### Your Public Key
```
dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlzaWduIHB1YmxpYyBrZXk6IDRCNTRFRURFNDU1QUEwNzAKUldSd29GcEZ6dTFVUzJ5YnhZcklhVGpMSEZHQnVNbXVDaitwSk1DVyt3aXJIMG41OTRXTW1jWlVtCg==
```

### Your Private Key
```bash
cat ~/.tauri/key.txt
# ⚠️ KEEP THIS SAFE AND SECRET ⚠️
```

### Your Password
```
⚠️ You set this - remember it for GitHub Secrets! ⚠️
```

---

## 🛠️ Troubleshooting Commands

### If Build Fails
```bash
# Check GitHub Actions logs
# https://github.com/mandolon/loval-laravel-leap/actions

# Check recent commits
git log --oneline -5

# Verify tags
git tag -l | head -10
```

### If You Need to Regenerate Keys
```bash
# ⚠️ WARNING: Only if keys are lost!
npx tauri signer generate -w ~/.tauri/key.txt

# Then get new public key:
cat ~/.tauri/key.txt.pub

# Update GitHub Secrets with new private key
# Update tauri.conf.json with new public key
```

### Check Release Status
```bash
# Verify release was created
curl https://api.github.com/repos/mandolon/loval-laravel-leap/releases/latest | grep '"tag_name"'

# Download latest.json
curl https://github.com/mandolon/loval-laravel-leap/releases/download/latest/latest.json | jq .
```

---

## 📊 Quick Status Check

Run this to see everything:
```bash
echo "=== Configuration ===" && \
cat ~/.tauri/key.txt.pub | head -c 50 && echo "..." && \
echo "" && \
echo "=== tauri.conf.json ===" && \
cat src-tauri/tauri.conf.json | jq '.plugins.updater' && \
echo "" && \
echo "=== Recent Tags ===" && \
git tag -l | tail -5 && \
echo "" && \
echo "✅ Setup Complete!"
```

---

## 🎯 Step-by-Step Quick Start

1. **Set GitHub Secrets** (5 min)
   - `TAURI_SIGNING_PRIVATE_KEY` = `cat ~/.tauri/key.txt`
   - `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` = your password

2. **Create Release Tag** (2 min)
   ```bash
   git tag v1.0.1
   git push origin v1.0.1
   ```

3. **Wait for Build** (10-15 min)
   - Monitor: GitHub Actions dashboard

4. **Test Updates** (5 min)
   - Open app and check for updates
   - Accept update and verify it installs

5. **Done!** 🎉
   - Users now have auto-updates enabled

---

## 📞 Emergency: Lost Private Key?

```bash
# Generate new keys
npx tauri signer generate -w ~/.tauri/key.txt

# Get new public key
cat ~/.tauri/key.txt.pub

# ⚠️ You MUST:
# 1. Update TAURI_SIGNING_PRIVATE_KEY in GitHub Secrets
# 2. Update pubkey in tauri.conf.json
# 3. Update TAURI_SIGNING_PRIVATE_KEY_PASSWORD
# 4. Old users cannot update until they manually download new version
```

---

**Need detailed help?** See:
- `TAURI_AUTOUPDATE_SETUP.md` - Complete guide
- `GITHUB_SECRETS_SETUP.md` - Secrets step-by-step
- `TAURI_AUTOUPDATE_QUICK_REF.md` - Quick reference

**Ready?** Start with: `git push origin v1.0.1` 🚀
