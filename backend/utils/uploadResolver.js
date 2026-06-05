const fs = require('fs');
const path = require('path');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
const PUBLIC_UPLOAD_ORIGINS = [
  'https://hyeonseo8822.github.io/survly',
  'https://survly.mirim-it-show.site:3000'
];
const uploadCache = new Map();

// Ensure a fetch implementation exists in Node environments that lack global.fetch.
let _fetch = (typeof fetch !== 'undefined') ? fetch : null;
if (!_fetch) {
  try {
    // Use node-fetch@2 which supports CommonJS require()
    _fetch = require('node-fetch');
    global.fetch = _fetch;
    console.debug('[uploadResolver] Using node-fetch polyfill');
  } catch (err) {
    console.warn('[uploadResolver] fetch not available and node-fetch not installed:', err.message);
    // _fetch remains null; remote reads will fail later with clearer logs
  }
}

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

    if (!_fetch) {
      console.debug(`[uploadResolver] No fetch available to read remote ${remoteUrl}`);
      continue;
    }

    try {
      console.debug(`[uploadResolver] Attempting to fetch remote upload: ${remoteUrl}`);
      const response = await _fetch(remoteUrl, { cache: 'no-store' });
      if (!response.ok) {
        console.debug(`[uploadResolver] Remote fetch returned ${response.status} for ${remoteUrl}`);
        continue;
      }

      const arrayBuffer = await response.arrayBuffer();
      if (!arrayBuffer || arrayBuffer.byteLength === 0) {
        console.debug(`[uploadResolver] Remote fetch returned empty body for ${remoteUrl}`);
        continue;
      }

      const mimeType = getMimeType(fileName, response.headers.get('content-type') || '');
      const buffer = Buffer.from(arrayBuffer);
      console.debug(`[uploadResolver] Successfully fetched and encoded ${remoteUrl} as data URL`);
      return `data:${mimeType};base64,${buffer.toString('base64')}`;
    } catch (err) {
      console.warn(`[uploadResolver] Error fetching ${remoteUrl}: ${err && err.message ? err.message : err}`);
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
      console.debug(`[uploadResolver] Cache hit for ${cacheKey}`);
      return uploadCache.get(cacheKey);
    }

    console.debug(`[uploadResolver] Local file missing, attempting remote fetch for ${fileNameOrValue}`);
    const remoteDataUrl = await readRemoteDataUrl(fileNameOrValue);
    const resolvedValue = remoteDataUrl || '';
    uploadCache.set(cacheKey, resolvedValue);
    if (resolvedValue) {
      console.debug(`[uploadResolver] Resolved ${fileNameOrValue} from remote and cached result`);
    } else {
      console.debug(`[uploadResolver] Could not resolve ${fileNameOrValue} from any remote origin`);
    }
    return resolvedValue;
  }

  const buffer = fs.readFileSync(filePath);
  const mimeType = getMimeType(fileNameOrValue);

  console.debug(`[uploadResolver] Resolved ${fileNameOrValue} from local uploads directory`);
  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

module.exports = {
  resolveUploadDataUrl,
  extractUploadFileName
};