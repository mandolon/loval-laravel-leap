#!/bin/bash

# Script to patch Excalidraw's image size limit
# This increases the 1440px limit to allow full-resolution images

echo "🔧 Patching Excalidraw to remove 1440px image limit..."

# Find the Excalidraw package directory
EXCALIDRAW_DIR="node_modules/@excalidraw/excalidraw"

if [ ! -d "$EXCALIDRAW_DIR" ]; then
  echo "❌ Excalidraw package not found. Run 'npm install' first."
  exit 1
fi

# Search for the 1440 limit in various possible locations
FOUND=false

# Check minified production bundle
PROD_FILE="$EXCALIDRAW_DIR/dist/excalidraw.production.min.js"
if [ -f "$PROD_FILE" ]; then
  echo "📝 Checking production bundle..."
  if grep -q "1440" "$PROD_FILE"; then
    echo "✅ Found 1440 limit in production bundle"
    # Replace 1440 with 10000 (or any larger number)
    # Common patterns: maxWidthOrHeight=1440, maxWidth:1440, etc.
    sed -i.bak 's/maxWidthOrHeight=1440/maxWidthOrHeight=10000/g' "$PROD_FILE"
    sed -i.bak 's/maxWidth:1440/maxWidth:10000/g' "$PROD_FILE"
    sed -i.bak 's/maxHeight:1440/maxHeight:10000/g' "$PROD_FILE"
    # Also look for the pattern where it might be a variable assignment
    sed -i.bak 's/=1440,/=10000,/g' "$PROD_FILE"
    sed -i.bak 's/=1440;/=10000;/g' "$PROD_FILE"
    sed -i.bak 's/=1440}/=10000}/g' "$PROD_FILE"
    FOUND=true
    echo "✅ Patched production bundle"
  fi
fi

# Check development bundle
DEV_FILE="$EXCALIDRAW_DIR/dist/excalidraw.development.js"
if [ -f "$DEV_FILE" ]; then
  echo "📝 Checking development bundle..."
  if grep -q "1440" "$DEV_FILE"; then
    echo "✅ Found 1440 limit in development bundle"
    sed -i.bak 's/maxWidthOrHeight = 1440/maxWidthOrHeight = 10000/g' "$DEV_FILE"
    sed -i.bak 's/maxWidth: 1440/maxWidth: 10000/g' "$DEV_FILE"
    sed -i.bak 's/maxHeight: 1440/maxHeight: 10000/g' "$DEV_FILE"
    sed -i.bak 's/= 1440,/= 10000,/g' "$DEV_FILE"
    sed -i.bak 's/= 1440;/= 10000;/g' "$DEV_FILE"
    FOUND=true
    echo "✅ Patched development bundle"
  fi
fi

# Check if there are any source TypeScript files
if [ -d "$EXCALIDRAW_DIR/src" ] || [ -d "$EXCALIDRAW_DIR/data" ]; then
  echo "📝 Checking source files..."
  find "$EXCALIDRAW_DIR" -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" \) | while read -r file; do
    if grep -q "1440" "$file"; then
      echo "✅ Found 1440 in: $file"
      sed -i.bak 's/maxWidthOrHeight = 1440/maxWidthOrHeight = 10000/g' "$file"
      sed -i.bak 's/maxWidth: 1440/maxWidth: 10000/g' "$file"
      sed -i.bak 's/maxHeight: 1440/maxHeight: 10000/g' "$file"
      FOUND=true
    fi
  done
fi

if [ "$FOUND" = true ]; then
  echo ""
  echo "✅ Successfully patched Excalidraw!"
  echo "🎯 Image size limit increased from 1440px to 10000px"
  echo ""
  echo "📦 Creating patch file with patch-package..."
  npx patch-package @excalidraw/excalidraw
  echo ""
  echo "✅ Patch file created! This will be automatically applied on 'npm install'"
  echo ""
  echo "🔄 Please refresh your browser to load the patched version"
else
  echo ""
  echo "⚠️  Could not find the 1440 limit in the expected locations"
  echo "This might mean:"
  echo "  - The package structure has changed"
  echo "  - The limit is defined differently"
  echo "  - Manual inspection is needed"
  echo ""
  echo "Please check the following files manually:"
  find "$EXCALIDRAW_DIR/dist" -name "*.js" 2>/dev/null
fi

# Clean up backup files
find "$EXCALIDRAW_DIR" -name "*.bak" -delete
