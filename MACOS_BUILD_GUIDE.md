# macOS Desktop App Build Guide

## Overview

This guide covers building a **universal macOS application** that:
- ✅ Works on both **Intel Macs** and **Apple Silicon Macs** (M1, M2, M3, M4)
- ✅ Supports **macOS 10.13 (High Sierra, 2017)** and newer
- ✅ Creates an **unsigned .dmg** installer (no code signing required)
- ✅ Can be distributed to users without App Store

## Prerequisites (On Your Mac)

### 1. Install Xcode Command Line Tools

```bash
xcode-select --install
```

Verify installation:
```bash
xcode-select -p
# Should output: /Library/Developer/CommandLineTools or /Applications/Xcode.app/Contents/Developer
```

### 2. Install Rust

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

Restart your terminal, then verify:
```bash
rustc --version
cargo --version
```

### 3. Install Node.js (if not already installed)

```bash
# Using Homebrew (recommended)
brew install node

# Or download from https://nodejs.org/
```

Verify:
```bash
node --version  # Should be v18 or higher
npm --version
```

### 4. Add Rust Build Targets for Universal Binary

This is **critical** for building apps that work on both Intel and Apple Silicon:

```bash
# Add Apple Silicon target
rustup target add aarch64-apple-darwin

# Add Intel target
rustup target add x86_64-apple-darwin
```

Verify targets are installed:
```bash
rustup target list | grep apple-darwin
# Should show:
# aarch64-apple-darwin (installed)
# x86_64-apple-darwin (installed)
```

## Project Setup (On Your Mac)

### 1. Clone the Repository

```bash
git clone https://github.com/mandolon/loval-laravel-leap.git
cd loval-laravel-leap
```

### 2. Install Dependencies

```bash
npm install
```

This installs all Node dependencies including Tauri CLI.

### 3. Copy Tauri Configuration (if needed)

If `src-tauri/tauri.conf.json` doesn't exist:

```bash
cp tauri.conf.json.template src-tauri/tauri.conf.json
```

## Build Options

### Option 1: Universal Binary (Recommended)

**Best for distribution** - Works on both Intel and Apple Silicon Macs.

```bash
npm run tauri:build:mac
```

Or directly:
```bash
npm run tauri build -- --target universal-apple-darwin
```

**Build Time**: ~10-15 minutes (builds for both architectures)

**Output Location**:
- DMG: `src-tauri/target/universal-apple-darwin/release/bundle/dmg/loval-laravel-leap_1.0.0_universal.dmg`
- App Bundle: `src-tauri/target/universal-apple-darwin/release/bundle/macos/loval-laravel-leap.app`

**File Size**: ~8-12 MB (contains both Intel and ARM binaries)

### Option 2: Intel Only (x86_64)

For older Intel Macs only:

```bash
npm run tauri:build:mac:intel
```

**Output Location**:
- DMG: `src-tauri/target/x86_64-apple-darwin/release/bundle/dmg/loval-laravel-leap_1.0.0_x64.dmg`
- App Bundle: `src-tauri/target/x86_64-apple-darwin/release/bundle/macos/loval-laravel-leap.app`

**File Size**: ~4-6 MB

### Option 3: Apple Silicon Only (ARM64)

For M1/M2/M3/M4 Macs only:

```bash
npm run tauri:build:mac:apple-silicon
```

**Output Location**:
- DMG: `src-tauri/target/aarch64-apple-darwin/release/bundle/dmg/loval-laravel-leap_1.0.0_aarch64.dmg`
- App Bundle: `src-tauri/target/aarch64-apple-darwin/release/bundle/macos/loval-laravel-leap.app`

**File Size**: ~4-6 MB

## Configuration Details

### tauri.conf.json - macOS Settings

```json
{
  "bundle": {
    "macOS": {
      "minimumSystemVersion": "10.13",  // macOS High Sierra (2017)
      "signingIdentity": null,          // No code signing
      "hardenedRuntime": false,         // Disabled (no signing)
      "entitlements": null,             // No special permissions required
      "frameworks": [],                 // No additional frameworks needed
      "exceptionDomain": ""
    }
  }
}
```

### Key Settings Explained:

- **`minimumSystemVersion: "10.13"`**
  - Supports macOS High Sierra (2017) and newer
  - Compatible with "Rustbelt" Macs (older but still functional)
  - Covers ~99% of active Macs

- **`signingIdentity: null`**
  - No Apple Developer account required
  - No code signing fees ($99/year)
  - Users will see "unidentified developer" warning (normal for unsigned apps)

- **`hardenedRuntime: false`**
  - Disabled because we're not signing
  - Simplifies distribution

## Testing the Built App

### 1. Test the .app Bundle Directly

```bash
# Navigate to the build output
cd src-tauri/target/universal-apple-darwin/release/bundle/macos/

# Run the app
open loval-laravel-leap.app
```

### 2. Test the .dmg Installer

```bash
# Open the DMG
open src-tauri/target/universal-apple-darwin/release/bundle/dmg/loval-laravel-leap_1.0.0_universal.dmg

# Drag the app to Applications folder
# Then run from Applications
```

### 3. Verify Universal Binary

Check if the app contains both architectures:

```bash
lipo -info src-tauri/target/universal-apple-darwin/release/loval-laravel-leap

# Should output:
# Architectures in the fat file: loval-laravel-leap are: x86_64 arm64
```

## Distributing to Users

### For Unsigned Apps (Your Current Setup)

When users download and try to open the app, macOS will show:

> "loval-laravel-leap.app" can't be opened because it is from an unidentified developer.

**Tell users to do this:**

1. **Method 1: Right-click Open**
   - Right-click (or Control-click) the app
   - Select "Open"
   - Click "Open" in the dialog
   - App will run and be trusted from now on

2. **Method 2: System Settings**
   - Go to System Settings → Privacy & Security
   - Scroll to "Security" section
   - Click "Open Anyway" next to the warning about the app

3. **Method 3: Terminal Command** (for tech-savvy users)
   ```bash
   xattr -dr com.apple.quarantine /Applications/loval-laravel-leap.app
   ```

### Distribution Methods

#### 1. Direct DMG Download
- Upload the `.dmg` file to your website or file host
- Users download and install
- **Recommended for**: Small teams, beta testing

#### 2. GitHub Releases
- Upload to GitHub Releases page
- Automatic version tracking
- Easy update notifications
- **Recommended for**: Open source projects

#### 3. Your Own Server
- Host on your own domain
- Full control over distribution
- Can track downloads
- **Recommended for**: Commercial products

## macOS Compatibility Chart

| macOS Version | Year | Intel | Apple Silicon | Supported |
|---------------|------|-------|---------------|-----------|
| macOS 15 Sequoia | 2024 | ✅ | ✅ | ✅ |
| macOS 14 Sonoma | 2023 | ✅ | ✅ | ✅ |
| macOS 13 Ventura | 2022 | ✅ | ✅ | ✅ |
| macOS 12 Monterey | 2021 | ✅ | ✅ | ✅ |
| macOS 11 Big Sur | 2020 | ✅ | ✅ | ✅ |
| macOS 10.15 Catalina | 2019 | ✅ | ❌ | ✅ |
| macOS 10.14 Mojave | 2018 | ✅ | ❌ | ✅ |
| macOS 10.13 High Sierra | 2017 | ✅ | ❌ | ✅ |
| macOS 10.12 Sierra | 2016 | ✅ | ❌ | ❌ |

**Universal Binary** = One .dmg works on ALL supported versions (Intel + Apple Silicon)

## Troubleshooting

### Build Fails: "cargo not found"

```bash
# Restart terminal after installing Rust
# Or manually load cargo:
source $HOME/.cargo/env
```

### Build Fails: "target not found"

```bash
# Make sure you installed both targets:
rustup target add aarch64-apple-darwin
rustup target add x86_64-apple-darwin
```

### App Won't Open: "damaged and can't be opened"

This happens when macOS quarantines downloaded apps.

**Solution for users:**
```bash
xattr -cr /Applications/loval-laravel-leap.app
```

**Better: Distribute via .dmg** (not just .app) - DMGs are better recognized by macOS.

### Build Takes Too Long

Universal builds compile twice (Intel + ARM).

**Speed it up:**
- Build architecture-specific instead: `npm run tauri:build:mac:apple-silicon`
- Use a newer Mac with more cores
- Disable LTO in Cargo.toml (reduces optimization but faster builds)

### App Size Too Large

Current universal binary: ~8-12 MB

**To reduce size:**
1. Remove unused dependencies
2. Build architecture-specific instead of universal
3. Use `strip = true` in Cargo.toml (already enabled)

## Advanced: Code Signing (Future)

If you later get an Apple Developer account ($99/year):

### 1. Update tauri.conf.json

```json
{
  "bundle": {
    "macOS": {
      "signingIdentity": "Developer ID Application: Your Name (TEAMID)",
      "hardenedRuntime": true,
      "entitlements": "entitlements.plist"
    }
  }
}
```

### 2. Sign and Notarize

```bash
# Sign
codesign --deep --force --verify --verbose --sign "Developer ID" --options runtime loval-laravel-leap.app

# Notarize (required for Gatekeeper)
xcrun notarytool submit loval-laravel-leap.dmg --apple-id you@email.com --password app-specific-password --team-id TEAMID
```

**Benefits of Signing:**
- No "unidentified developer" warning
- Can distribute via Mac App Store
- Users can double-click to open (no right-click needed)

## Build Commands Reference

```bash
# Install dependencies
npm install

# Add Rust targets (one-time setup)
rustup target add aarch64-apple-darwin
rustup target add x86_64-apple-darwin

# Build universal binary (Intel + Apple Silicon)
npm run tauri:build:mac

# Build Intel only
npm run tauri:build:mac:intel

# Build Apple Silicon only
npm run tauri:build:mac:apple-silicon

# Development mode (with hot-reload)
npm run tauri:dev

# Check binary architecture
lipo -info src-tauri/target/universal-apple-darwin/release/loval-laravel-leap
```

## CI/CD for macOS Builds (GitHub Actions)

Create `.github/workflows/build-macos.yml`:

```yaml
name: Build macOS App

on:
  push:
    tags:
      - 'v*'

jobs:
  build-macos:
    runs-on: macos-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Setup Rust
        uses: dtolnay/rust-toolchain@stable
        with:
          targets: aarch64-apple-darwin,x86_64-apple-darwin
      
      - name: Install dependencies
        run: npm install
      
      - name: Build universal binary
        run: npm run tauri:build:mac
      
      - name: Upload DMG
        uses: actions/upload-artifact@v4
        with:
          name: macos-dmg
          path: src-tauri/target/universal-apple-darwin/release/bundle/dmg/*.dmg
```

## Summary

✅ **Configured for**: Universal binary (Intel + Apple Silicon)  
✅ **Minimum macOS**: 10.13 High Sierra (2017)  
✅ **Unsigned**: No Apple Developer account needed  
✅ **Distribution**: Share .dmg file directly  
✅ **File Size**: ~8-12 MB for universal binary  
✅ **Build Command**: `npm run tauri:build:mac`  

Your macOS app is ready to build and distribute! 🚀
