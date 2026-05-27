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
        return `${import.meta.env.BASE_URL}uploads/${filePath}`;
      }
    } catch {
      // Fall back to the original value below.
    }

    return value;
  }

  const normalizedPath = String(value).replace(/^\/+/, '');
  if (normalizedPath.startsWith('uploads/')) {
    return `${import.meta.env.BASE_URL}${normalizedPath}`;
  }

  return `${import.meta.env.BASE_URL}${normalizedPath}`;
}