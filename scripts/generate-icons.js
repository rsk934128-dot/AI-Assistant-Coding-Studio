import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const sourceImagePath = path.resolve('src/assets/images/ai_app_logo_1793027805452.jpg');

if (!fs.existsSync(sourceImagePath)) {
  console.error('Source image not found:', sourceImagePath);
  process.exit(1);
}

const androidResPath = path.resolve('android/app/src/main/res');
const publicPath = path.resolve('public');

const mipmaps = [
  { dir: 'mipmap-mdpi', size: 48, fgSize: 108 },
  { dir: 'mipmap-hdpi', size: 72, fgSize: 162 },
  { dir: 'mipmap-xhdpi', size: 96, fgSize: 216 },
  { dir: 'mipmap-xxhdpi', size: 144, fgSize: 324 },
  { dir: 'mipmap-xxxhdpi', size: 192, fgSize: 432 },
];

async function generateIcons() {
  console.log('Generating Android & Web icons from', sourceImagePath);

  // 1. Android Mipmaps
  for (const item of mipmaps) {
    const targetDir = path.join(androidResPath, item.dir);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // Square launcher icon
    await sharp(sourceImagePath)
      .resize(item.size, item.size)
      .png()
      .toFile(path.join(targetDir, 'ic_launcher.png'));

    // Round launcher icon
    await sharp(sourceImagePath)
      .resize(item.size, item.size)
      .png()
      .toFile(path.join(targetDir, 'ic_launcher_round.png'));

    // Foreground icon for adaptive icon
    await sharp(sourceImagePath)
      .resize(item.fgSize, item.fgSize)
      .png()
      .toFile(path.join(targetDir, 'ic_launcher_foreground.png'));

    console.log(`Generated ${item.dir} icons (${item.size}x${item.size})`);
  }

  // 2. Web & PWA icons
  await sharp(sourceImagePath)
    .resize(64, 64)
    .png()
    .toFile(path.join(publicPath, 'favicon.png'));

  await sharp(sourceImagePath)
    .resize(180, 180)
    .png()
    .toFile(path.join(publicPath, 'apple-touch-icon.png'));

  await sharp(sourceImagePath)
    .resize(192, 192)
    .png()
    .toFile(path.join(publicPath, 'pwa-192x192.png'));

  await sharp(sourceImagePath)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicPath, 'pwa-512x512.png'));

  await sharp(sourceImagePath)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicPath, 'pwa-maskable-512x512.png'));

  await sharp(sourceImagePath)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicPath, 'app-logo.png'));

  console.log('All Android & Web icons generated successfully!');
}

generateIcons().catch((err) => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
