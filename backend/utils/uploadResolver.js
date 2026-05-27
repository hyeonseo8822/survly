const fs = require('fs');
const path = require('path');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
const PUBLIC_UPLOAD_ORIGINS = [
  'https://hyeonseo8822.github.io/survly',
  'https://survly.onrender.com'
];
const uploadCache = new Map();

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

function getMimeType(fileName, contentType = '') {
  if (contentType.startsWith('image/')) {
    return contentType.split(';')[0];
  }

  const ext = path.extname(fileName).toLowerCase();
  if (ext === '.png') {
    return 'image/png';
  }

  if (ext === '.gif') {
    return 'image/gif';
  }

  if (ext === '.webp') {
    return 'image/webp';
  }

  if (ext === '.svg') {
    return 'image/svg+xml';
  }

  return 'image/jpeg';
}

async function readRemoteDataUrl(fileName) {
  for (const origin of PUBLIC_UPLOAD_ORIGINS) {
    const remoteUrl = `${origin}/uploads/${encodeURIComponent(fileName)}`;

    try {
      const response = await fetch(remoteUrl, { cache: 'no-store' });
      if (!response.ok) {
        continue;
      }

      const arrayBuffer = await response.arrayBuffer();
      if (!arrayBuffer || arrayBuffer.byteLength === 0) {
        continue;
      }

      const mimeType = getMimeType(fileName, response.headers.get('content-type') || '');
      const buffer = Buffer.from(arrayBuffer);
      return `data:${mimeType};base64,${buffer.toString('base64')}`;
    } catch {
      // Try the next origin.
    }
  }

  return '';
}

async function resolveUploadDataUrl(value) {
  const fileNameOrValue = extractUploadFileName(value);

  if (!fileNameOrValue) {
    return '';
  }

  if (fileNameOrValue.startsWith('data:')) {
    return fileNameOrValue;
  }

  const filePath = path.join(UPLOADS_DIR, fileNameOrValue);
  if (!fs.existsSync(filePath)) {
    const cacheKey = String(value || '');
    if (uploadCache.has(cacheKey)) {
      return uploadCache.get(cacheKey);
    }

    const remoteDataUrl = await readRemoteDataUrl(fileNameOrValue);
    const resolvedValue = remoteDataUrl || '';
    uploadCache.set(cacheKey, resolvedValue);
    return resolvedValue;
  }

  const buffer = fs.readFileSync(filePath);
  const mimeType = getMimeType(fileNameOrValue);

  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

module.exports = {
  resolveUploadDataUrl,
  extractUploadFileName
};