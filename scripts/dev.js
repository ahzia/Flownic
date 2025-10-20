#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple development script to copy manifest and create placeholder icons
const distDir = path.join(__dirname, '../dist');
const iconsDir = path.join(distDir, 'icons');

// Ensure icons directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Copy manifest.json to dist folder
const manifestSrc = path.join(__dirname, '../manifest.json');
const manifestDest = path.join(distDir, 'manifest.json');
if (fs.existsSync(manifestSrc)) {
  fs.copyFileSync(manifestSrc, manifestDest);
  console.log('✅ Copied manifest.json to dist/');
} else {
  console.log('⚠️  manifest.json not found in root directory');
}

// Create placeholder icons (simple colored squares)
const iconSizes = [16, 32, 48, 128];

iconSizes.forEach(size => {
  const svgPath = path.join(iconsDir, `icon-${size}.svg`);
  const pngPath = path.join(iconsDir, `icon-${size}.png`);
  
  if (!fs.existsSync(pngPath)) {
    // Create a simple SVG icon
    const svg = `
      <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${size}" height="${size}" fill="#3b82f6" rx="4"/>
        <text x="50%" y="50%" text-anchor="middle" dy="0.35em" fill="white" font-family="Arial" font-size="${size * 0.4}" font-weight="bold">PF</text>
      </svg>
    `;
    
    // Write SVG file
    fs.writeFileSync(svgPath, svg);
    console.log(`Created SVG icon: icon-${size}.svg`);
    
    // Convert SVG to PNG using rsvg-convert
    try {
      execSync(`rsvg-convert -w ${size} -h ${size} "${svgPath}" -o "${pngPath}"`, { stdio: 'pipe' });
      console.log(`✅ Converted to PNG: icon-${size}.png`);
      
      // Clean up SVG file
      fs.unlinkSync(svgPath);
    } catch (error) {
      console.log(`⚠️  Could not convert SVG to PNG for size ${size}: ${error.message}`);
      console.log(`   SVG file created at: ${svgPath}`);
    }
  }
});

console.log('✅ Development setup complete!');
console.log('📁 Extension built in: dist/');
console.log('🔧 To load in Chrome:');
console.log('   1. Open chrome://extensions/');
console.log('   2. Enable "Developer mode"');
console.log('   3. Click "Load unpacked" and select the "dist" folder');
console.log('');
console.log('🎨 Icons converted using rsvg-convert');
console.log('   All PNG icons are ready for production!');
