const fs = require('fs');
const path = require('path');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

function extractUploadFileName(value) {
  const rawValue = String(value || '').trim();
  if (!rawValue) {
    return '';
  }

  if (rawValue.startsWith('data:')) {
    return rawValue;
  }

  if (rawValue.startsWith('http://') || rawValue.startsWith('https://')) {
    try {
      const parsedUrl = new URL(rawValue);
      const uploadsIndex = parsedUrl.pathname.lastIndexOf('/uploads/');
      if (uploadsIndex !== -1) {
        return path.basename(parsedUrl.pathname.slice(uploadsIndex + '/uploads/'.length));
      }
      return path.basename(parsedUrl.pathname);
    } catch {
      return path.basename(rawValue);
    }
  }

  if (rawValue.startsWith('/uploads/')) {
    return path.basename(rawValue);
  }

  if (rawValue.startsWith('uploads/')) {
    return path.basename(rawValue);
  }

  return path.basename(rawValue);
}

function resolveUploadDataUrl(value) {
  const fileNameOrValue = extractUploadFileName(value);

  if (!fileNameOrValue) {
    return '';
  }

  if (fileNameOrValue.startsWith('data:')) {
    return fileNameOrValue;
  }

  const filePath = path.join(UPLOADS_DIR, fileNameOrValue);
  if (!fs.existsSync(filePath)) {
    return String(value || '');
  }

  const buffer = fs.readFileSync(filePath);
  const ext = path.extname(fileNameOrValue).toLowerCase();
  const mimeType = ext === '.png'
    ? 'image/png'
    : ext === '.gif'
      ? 'image/gif'
      : ext === '.webp'
        ? 'image/webp'
        : 'image/jpeg';

  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

module.exports = {
  resolveUploadDataUrl,
  extractUploadFileName
};