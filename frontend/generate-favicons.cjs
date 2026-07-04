/**
 * generate-favicons.cjs
 * Generates all required favicon assets from SyncSocioLogo.png using sharp + png-to-ico
 */

const sharp = require('sharp');
const pngToIco = require('png-to-ico');
const fs = require('fs');
const path = require('path');

const INPUT = path.resolve(__dirname, 'public/SyncSocioLogo.png');
const OUT   = path.resolve(__dirname, 'public');

async function generate() {
  const sizes = [
    { name: 'favicon-16x16.png',          size: 16  },
    { name: 'favicon-32x32.png',           size: 32  },
    { name: 'apple-touch-icon.png',        size: 180 },
    { name: 'android-chrome-192x192.png',  size: 192 },
    { name: 'android-chrome-512x512.png',  size: 512 },
    // interim 32px for ICO generation
    { name: '_ico-32.png',                 size: 32  },
    { name: '_ico-16.png',                 size: 16  },
  ];

  console.log('Reading source logo:', INPUT);

  for (const { name, size } of sizes) {
    const outPath = path.join(OUT, name);
    await sharp(INPUT)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }  // white bg for square icons
      })
      .png()
      .toFile(outPath);
    console.log(`  ✓ ${name} (${size}x${size})`);
  }

  // Build favicon.ico from 16 + 32 px PNGs (multi-size ICO)
  console.log('Building favicon.ico ...');
  // default export accepts an array of file paths
  const icoFn = pngToIco.default || pngToIco;
  const icoBuffer = await icoFn([
    path.join(OUT, '_ico-16.png'),
    path.join(OUT, '_ico-32.png'),
  ]);
  fs.writeFileSync(path.join(OUT, 'favicon.ico'), icoBuffer);
  console.log('  ✓ favicon.ico (16x16 + 32x32)');

  // Clean up temporary ICO source files
  fs.unlinkSync(path.join(OUT, '_ico-32.png'));
  fs.unlinkSync(path.join(OUT, '_ico-16.png'));
  console.log('  ✓ Cleaned up temp files');

  console.log('\nAll favicon assets generated successfully!');
}

generate().catch(err => {
  console.error('Error generating favicons:', err);
  process.exit(1);
});
