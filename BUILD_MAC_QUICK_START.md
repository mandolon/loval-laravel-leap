# macOS Build - Quick Start

## One-Time Setup (5 minutes)

```bash
# 1. Install Xcode Command Line Tools
xcode-select --install

# 2. Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env

# 3. Add Rust targets for universal binary
rustup target add aarch64-apple-darwin   # Apple Silicon (M1/M2/M3/M4)
rustup target add x86_64-apple-darwin    # Intel

# 4. Install Node dependencies
npm install
```

## Build Universal App (10-15 min)

```bash
# Build for both Intel and Apple Silicon
npm run tauri:build:mac
```

## Output Files

**DMG Installer** (distribute this):
```
src-tauri/target/universal-apple-darwin/release/bundle/dmg/
  └── loval-laravel-leap_1.0.0_universal.dmg
```

**App Bundle**:
```
src-tauri/target/universal-apple-darwin/release/bundle/macos/
  └── loval-laravel-leap.app
```

## Verify Universal Binary

```bash
lipo -info src-tauri/target/universal-apple-darwin/release/loval-laravel-leap
# Output: Architectures in the fat file: loval-laravel-leap are: x86_64 arm64 ✅
```

## Configuration Summary

- ✅ **Architecture**: Universal (Intel + Apple Silicon)
- ✅ **Minimum macOS**: 10.13 High Sierra (2017)
- ✅ **Signing**: None (unsigned/not notarized)
- ✅ **Size**: ~8-12 MB
- ✅ **Distribution**: Direct .dmg download

## User Installation

Users downloading the **unsigned app** need to:

1. Download the `.dmg` file
2. Open it and drag app to Applications
3. **Right-click** the app → "Open" (not double-click)
4. Click "Open" in the security warning
5. App will run normally from then on

## Alternative Builds

```bash
# Intel only (smaller, 4-6 MB)
npm run tauri:build:mac:intel

# Apple Silicon only (smaller, 4-6 MB)
npm run tauri:build:mac:apple-silicon
```

## Troubleshooting

**Build fails?**
- Restart terminal after installing Rust
- Check targets: `rustup target list | grep apple-darwin`

**App won't open for users?**
- They must right-click → "Open" (not double-click)
- Or run: `xattr -cr /Applications/loval-laravel-leap.app`

---

📖 **Full details**: See `MACOS_BUILD_GUIDE.md`
