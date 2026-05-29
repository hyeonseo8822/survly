import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.join(__dirname, '..', 'dist');
const indexFile = path.join(distDir, 'index.html');
const targetFile = path.join(distDir, '404.html');

try {
  if (!fs.existsSync(distDir)) {
    console.error('dist 폴더를 찾을 수 없습니다. 먼저 빌드를 실행하세요.');
    process.exit(1);
  }

  if (!fs.existsSync(indexFile)) {
    console.error('index.html을 찾을 수 없습니다. 빌드가 올바르게 생성되었는지 확인하세요.');
    process.exit(1);
  }

  fs.copyFileSync(indexFile, targetFile);
  console.log('Copied index.html to 404.html for GitHub Pages SPA fallback.');
} catch (err) {
  console.error('Failed to copy index.html to 404.html:', err);
  process.exit(1);
}
