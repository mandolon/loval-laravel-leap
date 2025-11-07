# Complete Rebuild Script for Windows Build
Write-Host "=========================================="
Write-Host "Starting Complete Rebuild Process"
Write-Host "=========================================="

# 1. Pull latest changes
Write-Host ""
Write-Host "Step 1: Pulling latest changes from git..."
git pull origin main

# 2. Install/update dependencies
Write-Host ""
Write-Host "Step 2: Installing dependencies..."
npm install

# 3. Copy Tauri template files (preserve custom icon)
Write-Host ""
Write-Host "Step 3: Copying Tauri configuration..."
if (Test-Path "src-tauri\icons\icon.png") {
    Copy-Item "src-tauri\icons\icon.png" "src-tauri\icons\icon.png.backup"
}
Copy-Item "src-tauri-template\Cargo.toml" "src-tauri\Cargo.toml"
if (Test-Path "src-tauri\icons\icon.png.backup") {
    Move-Item "src-tauri\icons\icon.png.backup" "src-tauri\icons\icon.png" -Force
}

# 4. Build Excalidraw fork packages
Write-Host ""
Write-Host "Step 4: Building Excalidraw fork packages..."
Push-Location "excalidraw-fork 2"
yarn install --frozen-lockfile
yarn build:packages
Pop-Location

# 5. Build Vite app for desktop
Write-Host ""
Write-Host "Step 5: Building Vite app for desktop..."
npm run build:desktop

# 6. Build Tauri Windows app
Write-Host ""
Write-Host "Step 6: Building Windows app (this will take several minutes)..."
npx @tauri-apps/cli build --target x86_64-pc-windows-msvc

Write-Host ""
Write-Host "=========================================="
Write-Host "Build Complete!"
Write-Host "=========================================="
Write-Host ""
Write-Host "Your app is located at:"
Write-Host "src-tauri\target\x86_64-pc-windows-msvc\release\bundle\msi\"
Write-Host ""

