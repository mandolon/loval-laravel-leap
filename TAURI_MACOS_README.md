# Tauri macOS Build Instructions

## Quick Start

Your project is configured for universal macOS builds (Intel + Apple Silicon).

### Build Commands

Since `package.json` is managed automatically, use these direct commands:

```bash
# Universal binary (recommended - works on all Macs)
npm run tauri build -- --target universal-apple-darwin

# Intel only
npm run tauri build -- --target x86_64-apple-darwin

# Apple Silicon only
npm run tauri build -- --target aarch64-apple-darwin
```

### Prerequisites (One-Time Setup)

1. **Install Xcode Command Line Tools**
   ```bash
   xcode-select --install
   ```

2. **Install Rust**
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```

3. **Add Rust Targets**
   ```bash
   rustup target add aarch64-apple-darwin
   rustup target add x86_64-apple-darwin
   ```

4. **Install Node Dependencies**
   ```bash
   npm install
   ```

### Output Location

After building, find your .dmg file at:
```
src-tauri/target/universal-apple-darwin/release/bundle/dmg/
```

### Configuration

The macOS configuration is in `tauri.conf.json.template`:
- Minimum OS: macOS 10.13 (High Sierra, 2017)
- Signing: Disabled (no developer account needed)
- Hardened Runtime: Disabled (for easier distribution)

## Full Documentation

See these files for complete details:
- `MACOS_BUILD_GUIDE.md` - Comprehensive guide
- `MACOS_CONFIG_SUMMARY.md` - Configuration summary
- `MAC_COMMANDS_CHEAT_SHEET.md` - Quick command reference
- `BUILD_SUCCESS.md` - Windows build report
