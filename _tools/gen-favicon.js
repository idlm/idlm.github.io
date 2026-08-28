#!/usr/bin/env node
// Generate a custom favicon set to match the macOS-Sonoma home page.
// Design: rounded-square with Instagram-style purple→pink→orange
// radial gradient, white "i" letter (for "idlm") centered.

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const OUT = '/root/blog/themes/next/source/images';

// Generate the SVG source (used as a vector fallback and the visual source
// for the raster renderings).
const svg = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${size}" height="${size}">
  <defs>
    <radialGradient id="g" cx="35%" cy="30%" r="80%">
      <stop offset="0%"   stop-color="#FFDC80"/>
      <stop offset="25%"  stop-color="#FCAF45"/>
      <stop offset="55%"  stop-color="#F77737"/>
      <stop offset="78%"  stop-color="#F23A7A"/>
      <stop offset="100%" stop-color="#7C3AED"/>
    </radialGradient>
    <clipPath id="round">
      <rect x="0" y="0" width="512" height="512" rx="112" ry="112"/>
    </clipPath>
  </defs>
  <g clip-path="url(#round)">
    <rect x="0" y="0" width="512" height="512" fill="url(#g)"/>
    <!-- soft top-left highlight -->
    <ellipse cx="140" cy="100" rx="220" ry="120" fill="white" opacity="0.18"/>
  </g>
  <!-- the "i" letter, white, bold -->
  <g fill="#ffffff" font-family="-apple-system, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif" font-weight="800" text-anchor="middle">
    <!-- dot of the i -->
    <circle cx="256" cy="158" r="38"/>
    <!-- stem of the i -->
    <rect x="216" y="220" width="80" height="200" rx="20"/>
  </g>
</svg>`.trim();

async function main() {
  const buffer = Buffer.from(svg(512));

  // Apple Touch Icon: 180x180
  await sharp(buffer).resize(180, 180).png().toFile(path.join(OUT, 'apple-touch-icon-next.png'));

  // Favicon 32x32
  await sharp(buffer).resize(32, 32).png().toFile(path.join(OUT, 'favicon-32x32-next.png'));

  // Favicon 16x16
  await sharp(buffer).resize(16, 16).png().toFile(path.join(OUT, 'favicon-16x16-next.png'));

  // Master SVG (modern browsers / source of truth)
  fs.writeFileSync(path.join(OUT, 'favicon-next.svg'), svg(512));

  console.log('Wrote:');
  for (const f of ['apple-touch-icon-next.png', 'favicon-32x32-next.png', 'favicon-16x16-next.png', 'favicon-next.svg']) {
    const stat = fs.statSync(path.join(OUT, f));
    console.log(`  ${f}  (${stat.size} bytes)`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
