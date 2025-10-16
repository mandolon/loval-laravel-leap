# Tauri Desktop App Setup Guide

## Prerequisites (Install Locally)

1. **Rust toolchain**
   ```bash
   # Install Rust from https://rustup.rs/
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   
   # Verify installation
   cargo --version
   rustc --version
   ```

2. **Node.js 18+** (already have this)
   ```bash
   node --version  # Should be 18+
   ```

3. **Tauri CLI** (already added as dev dependency)
   ```bash
   npm install
   ```

## Initialize Tauri (Run Once)

```bash
# Initialize Tauri in your project
npm run tauri init

# When prompted:
# - App name: loval-laravel-leap
# - Window title: Loval Laravel Leap
# - Web assets: ../dist
# - Dev server: http://localhost:8080
# - Frontend dev command: npm run dev
# - Frontend build command: npm run build
```

This creates the `src-tauri/` directory with all necessary files.

## Configuration Files

After `tauri init`, update these files:

### 1. `src-tauri/tauri.conf.json`

Replace the generated config with:

```json
{
  "$schema": "https://schema.tauri.app/config/2.0.0",
  "productName": "loval-laravel-leap",
  "version": "1.0.0",
  "identifier": "app.lovable.loval-laravel-leap",
  "build": {
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build -- --mode desktop",
    "devUrl": "http://localhost:8080",
    "frontendDist": "../dist"
  },
  "app": {
    "withGlobalTauri": true,
    "windows": [
      {
        "title": "Loval Laravel Leap",
        "width": 1280,
        "height": 800,
        "minWidth": 800,
        "minHeight": 600,
        "resizable": true,
        "fullscreen": false,
        "decorations": true,
        "center": true
      }
    ],
    "security": {
      "csp": "default-src 'self'; img-src 'self' data: blob: https:; media-src 'self' blob:; connect-src 'self' http: https: ws: wss:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-eval';"
    }
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ],
    "resources": [],
    "copyright": "",
    "category": "Productivity",
    "shortDescription": "Project and task management for construction professionals",
    "longDescription": "A comprehensive project and task management application designed for construction professionals to manage workspaces, projects, clients, and tasks efficiently."
  },
  "plugins": {}
}
```

### 2. `src-tauri/Cargo.toml`

Ensure it has these dependencies:

```toml
[dependencies]
tauri = { version = "2", features = ["protocol-asset"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
```

### 3. `src-tauri/src/main.rs`

Update to:

```rust
// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

## Icons (Required)

Create app icons and place them in `src-tauri/icons/`:

1. Use an online icon generator (e.g., https://icon.kitchen/)
2. Upload a 512x512 PNG of your app logo
3. Download the generated icons pack
4. Replace the files in `src-tauri/icons/` with:
   - `32x32.png`
   - `128x128.png`
   - `128x128@2x.png`
   - `icon.icns` (macOS)
   - `icon.ico` (Windows)

## Development Workflow

### Local Development
```bash
# Run in desktop mode with hot reload
npm run tauri:dev
```

This opens your app in a native window. Changes auto-reload.

### Production Build
```bash
# Build desktop installers
npm run tauri:build
```

Installers will be in `src-tauri/target/release/bundle/`:
- **Windows**: `.msi` and `.exe` in `msi/` and `nsis/`
- **macOS**: `.dmg` and `.app` in `dmg/` and `macos/`
- **Linux**: `.deb`, `.AppImage` in `deb/` and `appimage/`

## Testing Checklist (Tomorrow)

### Day 1 Tests (Offline Mode)
- [ ] Run `npm run tauri:dev`
- [ ] Create/edit/delete workspace
- [ ] Create/edit/delete project
- [ ] Create/edit/delete task
- [ ] Close app, reopen → verify data persists
- [ ] Switch between workspaces
- [ ] Dark mode toggle works
- [ ] Window resize/minimize/maximize

### Network Mode Tests (Optional)
- [ ] Change `.env.desktop`: `VITE_USE_LOCAL_STORAGE=false`
- [ ] Start Laravel API locally: `php artisan serve`
- [ ] Verify app connects to `http://127.0.0.1:8000/api`
- [ ] Create/read/update/delete via API

## Platform-Specific Notes

### Windows
- Requires Visual Studio C++ Build Tools
- Install from: https://visualstudio.microsoft.com/downloads/
- Select "Desktop development with C++"

### macOS
- Requires Xcode Command Line Tools
  ```bash
  xcode-select --install
  ```

### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev \
  build-essential \
  curl \
  wget \
  file \
  libxdo-dev \
  libssl-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev
```

## Troubleshooting

### Build fails with "cargo not found"
- Restart terminal after installing Rust
- Run: `source $HOME/.cargo/env`

### "Failed to resolve module" in Tauri window
- Verify `vite.config.ts` has correct base path
- Check `tauri.conf.json` frontendDist path

### localStorage doesn't persist
- Tauri uses platform-specific app data directory
- Data is safe and survives app restarts
- Location varies by OS:
  - Windows: `%APPDATA%/app.lovable.loval-laravel-leap`
  - macOS: `~/Library/Application Support/app.lovable.loval-laravel-leap`
  - Linux: `~/.local/share/app.lovable.loval-laravel-leap`

### CSP errors in console
- Update `security.csp` in `tauri.conf.json`
- Add specific domains if connecting to external APIs

## Deployment (Later)

### Code Signing
```bash
# Windows
set TAURI_SIGNING_PRIVATE_KEY=path/to/key.pfx
set TAURI_SIGNING_PASSWORD=your_password

# macOS
export APPLE_SIGNING_IDENTITY="Developer ID Application: Your Name"
export APPLE_ID=your@email.com
export APPLE_PASSWORD=app-specific-password
```

### Auto-Updates (Future)
1. Add tauri-plugin-updater
2. Host releases on GitHub or custom server
3. Configure update endpoint in tauri.conf.json

## Resources

- [Tauri Docs](https://tauri.app/)
- [Tauri Discord](https://discord.com/invite/tauri)
- [Rust Book](https://doc.rust-lang.org/book/)
