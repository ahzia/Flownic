#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple development script to copy manifest
const distDir = path.join(__dirname, '../dist');

// Copy manifest.json to dist folder
const manifestSrc = path.join(__dirname, '../manifest.json');
const manifestDest = path.join(distDir, 'manifest.json');
if (fs.existsSync(manifestSrc)) {
  fs.copyFileSync(manifestSrc, manifestDest);
  console.log('✅ Copied manifest.json to dist/');
} else {
  console.log('⚠️  manifest.json not found in root directory');
}

// Fix paths in playground.html for Chrome extension
// HTML is at dist/src/ui/playground.html, chunks are at dist/chunks/, assets at dist/assets/
// So from src/ui/ we need ../../chunks/ and ../../assets/ and ../../ui/ for JS
const playgroundHtmlPath = path.join(distDir, 'src/ui/playground.html');
if (fs.existsSync(playgroundHtmlPath)) {
  let html = fs.readFileSync(playgroundHtmlPath, 'utf8');
  // Replace absolute paths with correct relative paths
  html = html
    .replace(/src="\/ui\//g, 'src="../../ui/')
    .replace(/href="\/chunks\//g, 'href="../../chunks/')
    .replace(/href="\/assets\//g, 'href="../../assets/');
  fs.writeFileSync(playgroundHtmlPath, html);
  console.log('✅ Fixed paths in playground.html');
}

console.log('✅ Development setup complete!');
console.log('📁 Extension built in: dist/');
console.log('🔧 To load in Chrome:');
console.log('   1. Open chrome://extensions/');
console.log('   2. Enable "Developer mode"');
console.log('   3. Click "Load unpacked" and select the "dist" folder');
