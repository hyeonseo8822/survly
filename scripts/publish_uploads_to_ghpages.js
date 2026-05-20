/**
 * Copy files from backend/uploads -> survly/public/uploads, then build and publish front-end to gh-pages.
 * Usage: node scripts/publish_uploads_to_ghpages.js
 * Note: requires `gh-pages` or the existing deploy_frontend_to_gh_pages.ps1 script from the repo.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const repoRoot = path.join(__dirname, '..');
const backendUploads = path.join(repoRoot, 'backend', 'uploads');
const frontendPublicUploads = path.join(repoRoot, 'survly', 'public', 'uploads');

if (!fs.existsSync(backendUploads)) {
  console.error('backend/uploads does not exist. Nothing to copy.');
  process.exit(1);
}

if (!fs.existsSync(frontendPublicUploads)) {
  fs.mkdirSync(frontendPublicUploads, { recursive: true });
}

const files = fs.readdirSync(backendUploads);
if (files.length === 0) {
  console.log('No files in backend/uploads to copy.');
} else {
  for (const f of files) {
    const src = path.join(backendUploads, f);
    const dst = path.join(frontendPublicUploads, f);
    fs.copyFileSync(src, dst);
    console.log('Copied', f);
  }
}

console.log('Files copied to survly/public/uploads. Now building and publishing the frontend...');
try {
  // Use the project's PowerShell deploy script if available on Windows.
  if (process.platform === 'win32') {
    execSync('powershell -NoProfile -ExecutionPolicy Bypass -File deploy_frontend_to_gh_pages.ps1', { cwd: repoRoot, stdio: 'inherit' });
  } else {
    // Fallback: run npm build + npx gh-pages
    execSync('cd survly && npm run build && npx gh-pages -d dist', { cwd: repoRoot, stdio: 'inherit' });
  }
  console.log('Publish complete. Uploaded files should be available under <GH_PAGES_BASE>/uploads/<filename>');
} catch (err) {
  console.error('Publish failed:', err.message || err);
  process.exit(1);
}
