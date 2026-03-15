const sharp = require('sharp');
const path = require('path');

const SIZE = 1024;
const BG = '#FAF9F7';
const DOT_COLOR = '#1A1A1A';
const RADIUS = 60; // 120px diameter
const GAP = 80;

// 3 dots centered vertically: total height = 3*120 + 2*80 = 520
const groupHeight = 3 * RADIUS * 2 + 2 * GAP;
const startY = (SIZE - groupHeight) / 2 + RADIUS;
const cx = SIZE / 2;

const dots = [0, 1, 2].map(i => {
  const cy = startY + i * (RADIUS * 2 + GAP);
  return `<circle cx="${cx}" cy="${cy}" r="${RADIUS}" fill="${DOT_COLOR}" />`;
}).join('\n');

const svg = `<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${SIZE}" height="${SIZE}" fill="${BG}" />
  ${dots}
</svg>`;

const assetsDir = path.join(__dirname, '..', 'assets');

async function main() {
  const buf = Buffer.from(svg);

  await sharp(buf).png().toFile(path.join(assetsDir, 'icon.png'));
  console.log('Created assets/icon.png (1024x1024)');

  await sharp(buf).png().toFile(path.join(assetsDir, 'adaptive-icon.png'));
  console.log('Created assets/adaptive-icon.png (1024x1024)');

  await sharp(buf).resize(180, 180).png().toFile(path.join(assetsDir, 'icon-180.png'));
  console.log('Created assets/icon-180.png (180x180)');
}

main().catch(err => { console.error(err); process.exit(1); });
