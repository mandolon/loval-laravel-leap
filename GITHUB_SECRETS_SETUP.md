# GitHub Secrets Setup for Tauri Auto-Updates

## 🔐 What You Need to Do

Your GitHub Actions workflow needs two secrets to sign your application updates. Follow these steps:

## Step 1: Get Your Private Key

Run this command on your machine:

```bash
cat ~/.tauri/key.txt
```

This will output something like:
```
-----BEGIN ENCRYPTED PRIVATE KEY-----
[lots of characters]
-----END ENCRYPTED PRIVATE KEY-----
```

**Copy the entire output** (including the BEGIN and END lines).

## Step 2: Add TAURI_SIGNING_PRIVATE_KEY Secret

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `TAURI_SIGNING_PRIVATE_KEY`
5. Value: Paste the entire private key from Step 1
6. Click **Add secret**

## Step 3: Add TAURI_SIGNING_PRIVATE_KEY_PASSWORD Secret

1. Click **New repository secret** again
2. Name: `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`
3. Value: Enter the **password** you created when generating the keys
4. Click **Add secret**

## ✅ Verify Setup

After adding both secrets:

```bash
# This should NOT return anything (secrets are masked)
# Go to Actions → Recent workflow run to verify it was passed
```

Your secrets are now ready! Next time you create a release tag, GitHub Actions will:
1. Use your private key to sign the binaries
2. Use your password to decrypt the key
3. Upload signed artifacts to releases
4. Users will verify the signature using the public key

## 🔒 Security Best Practices

- ✅ Use strong passwords for the private key
- ✅ Store the password securely (password manager)
- ✅ Back up the private key to a secure location
- ✅ Review who has access to repository secrets
- ✅ Rotate keys annually for production apps
- ❌ Never paste secrets in chat, issues, or PRs
- ❌ Never commit the private key to git
- ❌ Never use the same key for multiple apps

## 🧪 Test the Workflow

1. Make sure both secrets are set
2. Create a test release tag:
   ```bash
   git tag v1.0.0-test
   git push origin v1.0.0-test
   ```
3. Go to GitHub → Actions and monitor the workflow
4. Check for errors in the build logs

## ❌ Troubleshooting

### "Build failed - Signing error"
- Verify both secrets are added (not just one)
- Check that the password is exactly correct
- Try running the build locally first

### "Signature verification failed on user machine"
- Make sure the public key in `tauri.conf.json` matches `~/.tauri/key.txt.pub`
- Verify the workflow actually completed successfully

### "Could not find private key"
- Ensure `TAURI_SIGNING_PRIVATE_KEY` secret is set with the full key
- Check it includes the BEGIN and END lines

## 📚 Related Files

- Workflow: `.github/workflows/release.yml`
- Config: `src-tauri/tauri.conf.json`
- Public key: `~/.tauri/key.txt.pub`
- Private key: `~/.tauri/key.txt` (your machine only)

---

**Need help?** Check the Tauri docs: https://tauri.app/en/develop/guides/publishing/sign/
