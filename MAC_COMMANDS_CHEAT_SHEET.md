# macOS Build - Command Cheat Sheet

## 🚀 Quick Reference - Copy/Paste These Commands

### ONE-TIME SETUP (Run on Mac, in any folder)

```bash
# 1. Install Xcode Command Line Tools (popup will appear)
xcode-select --install

# 2. Install Rust (press Enter when prompted)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 3. CLOSE Terminal and OPEN a new one, then:

# 4. Add Rust targets for universal binary
rustup target add aarch64-apple-darwin
rustup target add x86_64-apple-darwin

# 5. Go to Documents and clone repository
cd ~/Documents
git clone https://github.com/mandolon/loval-laravel-leap.git
cd loval-laravel-leap

# 6. Install Node dependencies
npm install
```

✅ **Setup complete!**

---

### BUILD THE APP (Inside project folder)

```bash
# Navigate to project
cd ~/Documents/loval-laravel-leap

# Build universal app (Intel + Apple Silicon)
npm run tauri:build:mac
```

⏱️ **Wait: ~15-20 minutes**

---

### FIND THE .DMG FILE

```bash
# List the DMG
ls -lh src-tauri/target/universal-apple-darwin/release/bundle/dmg/

# Open folder in Finder
open src-tauri/target/universal-apple-darwin/release/bundle/dmg/

# Copy to Desktop
cp src-tauri/target/universal-apple-darwin/release/bundle/dmg/*.dmg ~/Desktop/
```

---

### VERIFY IT'S UNIVERSAL

```bash
# Check architecture
lipo -info src-tauri/target/universal-apple-darwin/release/loval-laravel-leap

# Should show: x86_64 arm64 ✅
```

---

### TEST THE APP

```bash
# Open the .app directly
open src-tauri/target/universal-apple-darwin/release/bundle/macos/loval-laravel-leap.app

# Or open the DMG
open src-tauri/target/universal-apple-darwin/release/bundle/dmg/*.dmg
```

---

## 📋 Alternative Build Commands

```bash
# Intel only (smaller file)
npm run tauri:build:mac:intel

# Apple Silicon only (smaller file)
npm run tauri:build:mac:apple-silicon

# Development mode (with hot-reload)
npm run tauri:dev
```

---

## 🔧 Verification Commands

```bash
# Check if you're in the right folder
pwd
# Should show: /Users/YourName/Documents/loval-laravel-leap

# Check Rust is installed
rustc --version
cargo --version

# Check Rust targets
rustup target list | grep apple-darwin
# Should show both as (installed)

# Check Node is installed
node --version
npm --version

# List files in project
ls

# Check macOS version
sw_vers

# Check Mac processor (Intel or Apple Silicon)
uname -m
# x86_64 = Intel
# arm64 = Apple Silicon
```

---

## 🆘 Troubleshooting Commands

```bash
# Rust not found? Load it:
source $HOME/.cargo/env

# Clean build (if build fails)
rm -rf src-tauri/target
npm run tauri:build:mac

# Clean everything and start over
rm -rf src-tauri/target
rm -rf node_modules
npm install
npm run tauri:build:mac

# Remove quarantine from app (for users)
xattr -cr /Applications/loval-laravel-leap.app
```

---

## 📂 Important Paths

```bash
# Your home folder
~/
# Same as: /Users/YourName

# Documents
~/Documents
# Same as: /Users/YourName/Documents

# Desktop
~/Desktop
# Same as: /Users/YourName/Desktop

# Project folder (after clone)
~/Documents/loval-laravel-leap
# Same as: /Users/YourName/Documents/loval-laravel-leap

# Built DMG location (universal)
~/Documents/loval-laravel-leap/src-tauri/target/universal-apple-darwin/release/bundle/dmg/

# Built DMG location (Intel only)
~/Documents/loval-laravel-leap/src-tauri/target/x86_64-apple-darwin/release/bundle/dmg/

# Built DMG location (Apple Silicon only)
~/Documents/loval-laravel-leap/src-tauri/target/aarch64-apple-darwin/release/bundle/dmg/
```

---

## ⌨️ Mac Terminal Shortcuts

| Action | Shortcut |
|--------|----------|
| Open Terminal | `⌘ + Space`, type "Terminal" |
| New Tab | `⌘ + T` |
| Close Tab | `⌘ + W` |
| Clear Screen | `⌘ + K` or type `clear` |
| Stop Command | `Ctrl + C` |
| Previous Command | `↑` (Up arrow) |
| Auto-complete | `Tab` |
| Copy | `⌘ + C` |
| Paste | `⌘ + V` |

---

## 📦 Output Files Reference

### Universal Binary Build:

**DMG Installer** (share this):
```
loval-laravel-leap_1.0.0_universal.dmg
Size: ~8-12 MB
Works on: Intel + Apple Silicon
```

**App Bundle**:
```
loval-laravel-leap.app
Location: bundle/macos/
```

**Binary**:
```
loval-laravel-leap
Location: release/
```

### Intel Only Build:

**DMG Installer**:
```
loval-laravel-leap_1.0.0_x64.dmg
Size: ~4-6 MB
Works on: Intel Macs only
```

### Apple Silicon Only Build:

**DMG Installer**:
```
loval-laravel-leap_1.0.0_aarch64.dmg
Size: ~4-6 MB
Works on: M1/M2/M3/M4 Macs only
```

---

## 🎯 Complete Command Sequence (Copy All)

For someone building for the first time, they can copy/paste this entire block:

```bash
# Open Terminal (Command + Space, type "Terminal")

# Install Xcode tools
xcode-select --install
# Click "Install" in popup, wait for completion

# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
# Press Enter when prompted

# IMPORTANT: Close Terminal and open a NEW one, then continue:

# Add Rust targets
rustup target add aarch64-apple-darwin
rustup target add x86_64-apple-darwin

# Clone and setup project
cd ~/Documents
git clone https://github.com/mandolon/loval-laravel-leap.git
cd loval-laravel-leap
npm install

# Build the app
npm run tauri:build:mac

# Copy DMG to Desktop when done
cp src-tauri/target/universal-apple-darwin/release/bundle/dmg/*.dmg ~/Desktop/

# Done! DMG is on Desktop
```

---

## 📖 Full Documentation

- 🎨 **Visual Guide**: `MAC_BUILD_VISUAL_GUIDE.md` (step-by-step with examples)
- 🖥️ **Terminal Guide**: `MAC_TERMINAL_GUIDE.md` (Mac basics for Windows users)
- 📋 **Full Guide**: `MACOS_BUILD_GUIDE.md` (complete details)
- 🚀 **Quick Start**: `BUILD_MAC_QUICK_START.md` (fast overview)
- ✅ **Checklist**: `MACOS_BUILD_CHECKLIST.md` (checklist format)
- 📝 **Summary**: `MACOS_CONFIG_SUMMARY.md` (configuration details)

---

## 💡 Pro Tips

1. **Always verify you're in the project folder** before running npm commands:
   ```bash
   pwd  # Should show: .../loval-laravel-leap
   ```

2. **Terminal won't find Rust?** Restart Terminal after installing Rust

3. **Build taking forever?** First build downloads everything, takes 15-20 min. Subsequent builds: 10-15 min.

4. **Need to rebuild?** Just run `npm run tauri:build:mac` again

5. **Sharing with users?** Share the `.dmg` file, not the `.app` folder

6. **Users can't open?** Tell them to **right-click** → "Open", not double-click

---

🎉 **That's it! You're ready to build macOS apps!**
