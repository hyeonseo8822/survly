export function resolveUploadUrl(value) {
  if (!value) {
    return '';
  }

  if (value.startsWith('data:')) {
    return value;
  }

  if (value.startsWith('http://') || value.startsWith('https://')) {
    try {
      const parsedUrl = new URL(value);
      const uploadsIndex = parsedUrl.pathname.lastIndexOf('/uploads/');
      if (uploadsIndex !== -1) {
        const filePath = parsedUrl.pathname.slice(uploadsIndex + '/uploads/'.length).replace(/^\/+/, '');
        return `${import.meta.env.VITE_API_BASE}/uploads/${filePath}`;
      }
    } catch {
      // Fall back to the original value below.
    }

    return value;
  }

  const normalizedPath = String(value).replace(/^\/+/, '');
  if (normalizedPath.startsWith('uploads/')) {
    return `${import.meta.env.VITE_API_BASE}/${normalizedPath}`;
  }

  return `${import.meta.env.VITE_API_BASE}/${normalizedPath}`;
}

export function resolveBackendUploadUrl(value) {
  if (!value) {
    return '';
  }

  if (value.startsWith('data:')) {
    return value;
  }

  const toBackendPath = (rawPath) => {
    const normalizedPath = String(rawPath).replace(/^\/+/, '');
    return `${import.meta.env.VITE_API_BASE}/${normalizedPath}`;
  };

  if (value.startsWith('http://') || value.startsWith('https://')) {
    try {
      const parsedUrl = new URL(value);
      const uploadsIndex = parsedUrl.pathname.lastIndexOf('/uploads/');
      if (uploadsIndex !== -1) {
        return toBackendPath(parsedUrl.pathname.slice(uploadsIndex + 1));
      }
    } catch {
      // Fall back to the original value below.
    }

    return value;
  }

  return toBackendPath(value);
}