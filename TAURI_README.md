# Tauri Desktop App Documentation

Your project is fully configured as a cross-platform desktop application with auto-updates.

## 📚 Documentation Index

### Quick Start Guides
- **[TAURI_QUICK_START.md](TAURI_QUICK_START.md)** - Get started with Tauri development
- **[BUILD_MAC_QUICK_START.md](BUILD_MAC_QUICK_START.md)** - macOS build in 5 minutes
- **[AUTO_UPDATE_QUICK_REF.md](AUTO_UPDATE_QUICK_REF.md)** - Release new versions fast

### Comprehensive Guides
- **[MACOS_BUILD_GUIDE.md](MACOS_BUILD_GUIDE.md)** - Complete macOS build instructions
- **[AUTO_UPDATE_GUIDE.md](AUTO_UPDATE_GUIDE.md)** - Full auto-update system documentation
- **[BUILD_SUCCESS.md](BUILD_SUCCESS.md)** - Windows build report

### Reference
- **[MAC_COMMANDS_CHEAT_SHEET.md](MAC_COMMANDS_CHEAT_SHEET.md)** - Copy-paste commands
- **[MACOS_CONFIG_SUMMARY.md](MACOS_CONFIG_SUMMARY.md)** - Configuration details
- **[TAURI_MACOS_README.md](TAURI_MACOS_README.md)** - macOS config summary
- **[TAURI_SETUP.md](TAURI_SETUP.md)** - Detailed setup instructions

## ⚡ Quick Commands

### Development
```bash
npm run tauri:dev
```

### Build Production Apps

**Windows:**
```bash
npm run tauri:build
```

**macOS Universal (Intel + Apple Silicon):**
```bash
npm run tauri build -- --target universal-apple-darwin
```

**Linux:**
```bash
npm run tauri:build
```

## 🔄 Auto-Updates Configured

Your app checks for updates on startup and prompts users to install new versions.

**To release a new version:**
1. Update version in `tauri.conf.json.template` and `package.json`
2. Commit changes: `git commit -am "Release v1.0.1"`
3. Create tag: `git tag v1.0.1 && git push origin v1.0.1`
4. GitHub Actions builds and publishes automatically

See [AUTO_UPDATE_QUICK_REF.md](AUTO_UPDATE_QUICK_REF.md) for details.

## 🎯 Platform Support

| Platform | Architecture | Min Version | Output |
|----------|-------------|-------------|---------|
| Windows | x64 | 10+ | .msi, .exe |
| macOS | Universal | 10.13+ | .dmg |
| Linux | x64 | Recent | .deb, .AppImage |

## 🔧 Configuration Files

- `tauri.conf.json.template` - Main Tauri configuration
- `src-tauri-template/Cargo.toml` - Rust dependencies
- `src-tauri-template/main.rs` - Rust entry point
- `.env.desktop` - Desktop environment variables

## 📦 What's Already Configured

✅ Auto-updates (GitHub Releases)
✅ Universal macOS builds
✅ Unsigned distribution (no code signing needed)
✅ localStorage support for offline mode
✅ Tauri detection utilities
✅ Cross-platform icons

## 🚀 Next Steps

1. Test locally with `npm run tauri:dev`
2. Build for your platform
3. Push a version tag to trigger auto-builds
4. Distribute the installer files to users

---

**Need help?** Check the specific guide for your platform or task above.
