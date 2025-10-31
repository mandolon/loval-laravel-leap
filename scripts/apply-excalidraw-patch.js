#!/usr/bin/env node
/**
 * Patch Excalidraw's 1440px Image Limit
 * 
 * This script modifies the installed @excalidraw/excalidraw package
 * to increase the image size limit from 1440px to 10000px
 */

const fs = require('fs');
const path = require('path');

const EXCALIDRAW_DIR = path.join(__dirname, '../node_modules/@excalidraw/excalidraw');
const TARGET_FILES = [
  'dist/excalidraw.production.min.js',
  'dist/excalidraw.development.js',
  'dist/index.js'
];

console.log('🔧 Patching Excalidraw image size limit...\n');

let patchedCount = 0;
let foundLimit = false;

TARGET_FILES.forEach(relPath => {
  const filePath = path.join(EXCALIDRAW_DIR, relPath);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⏭️  Skip: ${relPath} (not found)`);
    return;
  }
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Pattern 1: maxWidthOrHeight:1440
    content = content.replace(/maxWidthOrHeight:\s*1440/g, 'maxWidthOrHeight:10000');
    
    // Pattern 2: maxWidthOrHeight=1440
    content = content.replace(/maxWidthOrHeight=1440/g, 'maxWidthOrHeight=10000');
    
    // Pattern 3: max:1440 (in reduce.toBlob calls)
    content = content.replace(/max:\s*1440/g, 'max:10000');
    
    // Pattern 4: Variable assignments
    content = content.replace(/=1440([,;}])/g, '=10000$1');
    
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Patched: ${relPath}`);
      patchedCount++;
      foundLimit = true;
    } else {
      console.log(`⚠️  No changes: ${relPath} (1440 not found)`);
    }
  } catch (error) {
    console.error(`❌ Error patching ${relPath}:`, error.message);
  }
});

console.log('\n' + '='.repeat(50));
if (patchedCount > 0) {
  console.log(`✅ Successfully patched ${patchedCount} file(s)`);
  console.log('📏 Image size limit: 1440px → 10000px');
  console.log('\n🔄 Please refresh your browser to load the patched version');
} else if (foundLimit) {
  console.log('⚠️  Found 1440 limit but could not patch');
  console.log('This might mean the package structure has changed');
} else {
  console.log('❌ Could not find 1440px limit in expected files');
  console.log('The package structure may have changed');
  console.log('\nTry inspecting the files manually:');
  TARGET_FILES.forEach(f => {
    const fullPath = path.join(EXCALIDRAW_DIR, f);
    if (fs.existsSync(fullPath)) {
      console.log(`  - ${fullPath}`);
    }
  });
}
console.log('='.repeat(50) + '\n');
