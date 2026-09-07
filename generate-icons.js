import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const inputImage = process.argv[2];

if (!inputImage || !fs.existsSync(inputImage)) {
  console.error("Please provide a valid input image path");
  process.exit(1);
}

const sizes = [
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'pwa-192x192.png', size: 192 },
  { name: 'pwa-512x512.png', size: 512 },
  { name: 'pwa-maskable-512x512.png', size: 512 }
];

async function generate() {
  for (const s of sizes) {
    await sharp(inputImage)
      .resize(s.size, s.size)
      .toFormat('png')
      .toFile(path.join(__dirname, 'public', s.name));
    console.log(`Generated ${s.name}`);
  }
}

generate().catch(console.error);
