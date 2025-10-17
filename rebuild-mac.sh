#!/bin/bash

# Complete Rebuild Script for macOS Intel Build
echo "=========================================="
echo "Starting Complete Rebuild Process"
echo "=========================================="

# 1. Pull latest changes
echo ""
echo "Step 1: Pulling latest changes from git..."
git pull origin main

# 2. Install/update dependencies
echo ""
echo "Step 2: Installing dependencies..."
npm install

# 3. Copy Tauri template files
echo ""
echo "Step 3: Copying Tauri configuration..."
cp src-tauri-template/Cargo.toml src-tauri/Cargo.toml

# 4. Build Vite app for desktop
echo ""
echo "Step 4: Building Vite app for desktop..."
npm run build:desktop

# 5. Build Tauri macOS Intel app
echo ""
echo "Step 5: Building macOS Intel app (this will take several minutes)..."
npx @tauri-apps/cli build --target x86_64-apple-darwin

echo ""
echo "=========================================="
echo "Build Complete!"
echo "=========================================="
echo ""
echo "Your app is located at:"
echo "src-tauri/target/x86_64-apple-darwin/release/bundle/dmg/"
echo ""
