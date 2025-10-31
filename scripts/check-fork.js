#!/usr/bin/env node
/**
 * Check if Excalidraw fork is available
 * Used during install to provide helpful warnings
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FORK_PATH = path.join(__dirname, '..', 'excalidraw-fork 2');
const PACKAGES_TO_CHECK = ['common', 'element', 'excalidraw', 'math', 'utils'];

console.log('\n🔍 Checking Excalidraw fork status...\n');

if (!fs.existsSync(FORK_PATH)) {
  console.log('⚠️  Excalidraw fork NOT found at:', FORK_PATH);
  console.log('📦 Will use npm packages from registry instead\n');
  console.log('ℹ️  This is expected in CI/Lovable environments\n');
  process.exit(0);
}

console.log('✅ Fork directory found:', FORK_PATH);

// Check if packages are built
let allBuilt = true;
const missingBuilds = [];

for (const pkg of PACKAGES_TO_CHECK) {
  const distPath = path.join(FORK_PATH, 'packages', pkg, 'dist');
  if (!fs.existsSync(distPath)) {
    allBuilt = false;
    missingBuilds.push(pkg);
  }
}

if (allBuilt) {
  console.log('✅ All fork packages are built');
  console.log('🚀 Ready to use custom fork\n');
} else {
  console.log('❌ Fork packages NOT built!');
  console.log('Missing builds for:', missingBuilds.join(', '));
  console.log('\n📝 To build fork packages, run:');
  console.log('   cd "excalidraw-fork 2"');
  console.log('   yarn install');
  console.log('   yarn build:packages');
  console.log('   cd ..\n');
  console.log('⚠️  Development may not work until fork is built\n');
}

process.exit(0);
