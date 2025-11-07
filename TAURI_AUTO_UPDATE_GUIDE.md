# Tauri Auto-Updater Setup Guide

## What We Did (Working Configuration)

### ✅ Configuration That Works

The auto-updater is configured for **unsigned updates** (simplified approach for testing/development):

```json
"plugins": {
  "updater": {
    "active": true,
    "endpoints": [
      "https://github.com/mandolon/app.rehome/releases/latest/download/latest.json"
    ],
    "dialog": true,
    "pubkey": ""
  }
}
```

### Key Points

1. **`active: true`** - Updater is enabled
2. **`pubkey: ""`** - Empty string = unsigned updates (no cryptographic verification)
3. **`endpoints`** - Points to GitHub releases
4. **`dialog: true`** - Shows update dialog to users

## Building for Mac

### Universal Binary (Intel + Apple Silicon)

```bash
npm run tauri:build:mac
```

This creates a universal binary that works on both Intel and Apple Silicon Macs.

### Build Output

The build creates these files in `src-tauri/target/universal-apple-darwin/release/bundle/`:
- `.app` bundle
- `.dmg` installer
- Other distribution formats

## GitHub Releases Setup

### 1. Create a GitHub Release

1. Go to your GitHub repo: `https://github.com/mandolon/app.rehome`
2. Click "Releases" → "Create a new release"
3. Create a tag (e.g., `v1.0.1`)
4. Upload your build artifacts:
   - `.dmg` file
   - `.app.tar.gz` (if applicable)

### 2. Create Update Manifest

Create a file named `latest.json` with this content:

```json
{
  "version": "1.0.1",
  "notes": "Bug fixes and improvements",
  "pub_date": "2025-01-15T12:00:00Z",
  "platforms": {
    "darwin-universal": {
      "url": "https://github.com/mandolon/app.rehome/releases/download/v1.0.1/rehome_universal.app.tar.gz"
    }
  }
}
```

### 3. Upload to Release

Add `latest.json` as an asset to your GitHub release.

## How Updates Work

1. App checks endpoint on startup
2. Compares version in `latest.json` with local version
3. If newer version exists, shows dialog to user
4. Downloads and installs update
5. Prompts user to restart

## Testing Updates

1. Build version `1.0.0` and install it
2. Create GitHub release `v1.0.1` with `latest.json`
3. Run the app - should detect and offer to install update

## For Production: Add Signing (Optional)

For production releases, you should add signing:

### Generate Keys

```bash
cd src-tauri
tauri signer generate -w ~/.tauri/myapp.key
```

This creates:
- `~/.tauri/myapp.key` (private key - keep secret!)
- `~/.tauri/myapp.key.pub` (public key)

### Update Config

```json
"pubkey": "dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlzaWduIHB1YmxpYyBrZXk6IEFCQ0RFRkdISQpSV1R..."
```

### Sign Updates

When building, the updater will automatically sign if you have the private key:

```bash
TAURI_SIGNING_PRIVATE_KEY="$(cat ~/.tauri/myapp.key)" npm run tauri:build:mac
```

## Troubleshooting

### Update Not Detected
- Verify `latest.json` is accessible at the endpoint URL
- Check version number in `latest.json` is higher than current
- Ensure URL format matches exactly

### Download Fails
- Verify the download URL in `latest.json` is correct
- Check file exists at that URL
- Ensure file is properly compressed (`.tar.gz` or `.zip`)

### Dialog Not Showing
- Check `dialog: true` in config
- Verify `UpdateChecker` component is imported in App.tsx
- Check browser console for errors

## Current Setup Summary

- **App Name**: rehome
- **Version**: 1.0.0
- **Update Type**: Unsigned (development/testing)
- **Platform**: Universal macOS binary
- **Release Channel**: GitHub Releases
