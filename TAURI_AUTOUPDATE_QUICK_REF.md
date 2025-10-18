# Tauri Auto-Update Quick Reference

## 🎯 What Was Done

✅ Generated signing key pair (`~/.tauri/key.txt` & `.pub`)  
✅ Updated `src-tauri/tauri.conf.json` with public key  
✅ Verified GitHub Actions workflow (`release.yml`)  
✅ Configured update endpoint  

## 🔑 Critical Next Steps

### 1. Add GitHub Secrets (MUST DO FIRST)

```bash
# Get your private key
cat ~/.tauri/key.txt

# Get your password (you entered this during key generation)
```

Go to: `GitHub → Settings → Secrets and variables → Actions`

Add two secrets:
- `TAURI_SIGNING_PRIVATE_KEY` = contents of `~/.tauri/key.txt`
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` = password you created

### 2. Trigger a Release

```bash
# Update version in src-tauri/tauri.conf.json
# Then tag and push
git tag v1.0.1
git push origin v1.0.1
```

Workflow will automatically:
- Build for macOS, Ubuntu, Windows
- Sign binaries
- Publish to GitHub releases
- Create `latest.json` for updates

### 3. User Updates Work Automatically

When users open the app:
- Auto-checks for updates
- Dialog shows new version
- User can update or skip
- Signature verified, safe to install

## 📋 Key Files

| File | Purpose |
|------|---------|
| `src-tauri/tauri.conf.json` | Has public key & endpoint |
| `~/.tauri/key.txt` | Private key (KEEP SECRET!) |
| `.github/workflows/release.yml` | Build & sign workflow |

## ⚠️ Security Reminders

- 🔒 Never commit `key.txt` to git
- 🔐 Backup the private key securely
- 🚫 Never share the password
- ✅ Always use GitHub Secrets for CI/CD

## 🧪 Test Locally

```bash
export TAURI_SIGNING_PRIVATE_KEY="$(cat ~/.tauri/key.txt)"
export TAURI_SIGNING_PRIVATE_KEY_PASSWORD="your_password"
cd src-tauri
cargo tauri build
```

## 📞 If Something Goes Wrong

1. **Check secrets are set**: GitHub → Settings → Secrets
2. **Verify key files exist**: `ls ~/.tauri/`
3. **Rebuild keys if lost**: `npx tauri signer generate -w ~/.tauri/key.txt`
4. **See full logs**: Check GitHub Actions workflow runs

---

**Public Key**: `dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlzaWduIHB1YmxpYyBrZXk6IDRCNTRFRENFNDU1QUEwNzAKUldSd29GcEZ6dTFVUzJ5YnhZcklhVGpMSEZHQnVNbXVDaitwSk1DVyt3aXJIMG41OTRXTW1jWlVtCg==`

**Ready for**: Production deployments with secure auto-updates! 🚀
