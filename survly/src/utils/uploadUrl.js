export function resolveUploadUrl(value) {
  if (!value) {
    return '';
  }

  if (value.startsWith('data:')) {
    return value;
  }

  const appBase = import.meta.env.BASE_URL || '/';
  const joinAppBase = (path) => {
    const normalizedBase = appBase.endsWith('/') ? appBase : `${appBase}/`;
    return new URL(path.replace(/^\/+/, ''), window.location.origin + normalizedBase).toString();
  };

  if (value.startsWith('http://') || value.startsWith('https://')) {
    try {
      const parsedUrl = new URL(value);
      const uploadsIndex = parsedUrl.pathname.lastIndexOf('/uploads/');
      if (uploadsIndex !== -1) {
        const filePath = parsedUrl.pathname.slice(uploadsIndex + '/uploads/'.length).replace(/^\/+/, '');
        return joinAppBase(`uploads/${filePath}`);
      }
    } catch {
      // Fall back to the original value below.
    }

    return value;
  }

  const normalizedPath = String(value).replace(/^\/+/, '');
  if (normalizedPath.startsWith('uploads/')) {
    return joinAppBase(normalizedPath);
  }

  return joinAppBase(normalizedPath);
}