# Tauri Desktop App - Quick Start

## What You Need to Do Locally (30 minutes max)

### 1. Install Prerequisites

**Rust** (required):
```bash
# Install from https://rustup.rs/
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Verify (restart terminal first)
cargo --version
rustc --version
```

**Platform-specific tools**:

- **Windows**: Install [Visual Studio C++ Build Tools](https://visualstudio.microsoft.com/downloads/) with "Desktop development with C++"
- **macOS**: `xcode-select --install`
- **Linux (Ubuntu/Debian)**:
  ```bash
  sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
  ```

### 2. Initialize Tauri

```bash
# From your project root
npm install
npm run tauri init

# When prompted, answer:
# App name: loval-laravel-leap
# Window title: Loval Laravel Leap
# Web assets: ../dist
# Dev server: http://localhost:8080
# Frontend dev command: npm run dev
# Frontend build command: npm run build:desktop
```

### 3. Configure Tauri

After `tauri init`, you'll have a `src-tauri/` directory. Replace these files:

**Copy `tauri.conf.json.template` → `src-tauri/tauri.conf.json`**

**Copy `src-tauri-template/main.rs` → `src-tauri/src/main.rs`**

**Copy `src-tauri-template/Cargo.toml` → `src-tauri/Cargo.toml`**

### 4. Add App Icons (Optional but Recommended)

1. Create a 512x512 PNG of your app logo
2. Use [icon.kitchen](https://icon.kitchen/) to generate all icon formats
3. Replace files in `src-tauri/icons/` with generated icons

### 5. Add Scripts to package.json

Since `package.json` is read-only in Lovable, manually add these scripts:

```json
{
  "scripts": {
    "tauri": "tauri",
    "tauri:dev": "tauri dev",
    "tauri:build": "tauri build",
    "build:desktop": "vite build --mode desktop"
  }
}
```

## Development & Testing

### Run Desktop App (with hot reload)
```bash
npm run tauri:dev
```

This opens your app in a native window. Changes to React code auto-reload.

### Build Desktop Installers
```bash
npm run tauri:build
```

Installers will be in `src-tauri/target/release/bundle/`:
- **Windows**: `.msi` installer in `msi/` folder
- **macOS**: `.dmg` installer in `dmg/` folder  
- **Linux**: `.deb` and `.AppImage` in respective folders

## Test Checklist (5 minutes)

Run these tests in `tauri:dev` mode:

- [ ] Create a workspace
- [ ] Create a project
- [ ] Create a task
- [ ] Close app, reopen → data persists (localStorage works!)
- [ ] Switch between workspaces
- [ ] Window resize/minimize/maximize

## Environment Modes

### Offline Mode (Default)
File: `.env.desktop` (already created)
```
VITE_USE_LOCAL_STORAGE=true
```
- No network requests
- Data stored locally
- Works offline

### Network Mode (For Laravel API)
Change `.env.desktop`:
```
VITE_USE_LOCAL_STORAGE=false
VITE_API_BASE_URL=http://127.0.0.1:8000/api
```
Then start Laravel: `php artisan serve`

## Troubleshooting

**"cargo not found"**
→ Restart terminal after installing Rust, run: `source $HOME/.cargo/env`

**Build fails with missing dependencies**
→ Install platform-specific tools (see Prerequisites section)

**App window is blank**
→ Check `tauri.conf.json` paths match your project structure

**localStorage doesn't persist**
→ It does! Data is in OS-specific app data directory (not browser storage)

## What's Already Done for You

✅ Environment files (`.env.desktop`)  
✅ Tauri detection in React code (`src/main.tsx`)  
✅ Tauri utilities (`src/lib/tauri.ts`)  
✅ Config templates (`tauri.conf.json.template`, `src-tauri-template/`)  
✅ React Query hooks ready for offline mode  
✅ localStorage persistence working  

## What's Next (Later)

- [ ] Code signing for Windows/macOS distribution
- [ ] Auto-updater configuration
- [ ] File system access (file dialogs, export/import)
- [ ] Deep linking / URL schemes
- [ ] System tray integration

## Resources

- [Tauri Docs](https://tauri.app/)
- [Rust Installation](https://rustup.rs/)
- [Icon Generator](https://icon.kitchen/)
- Full guide: See `TAURI_SETUP.md`
