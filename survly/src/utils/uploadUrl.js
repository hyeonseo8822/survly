export function resolveUploadUrl(value) {
  if (!value) {
    return '';
  }

  const rawValue = typeof value === 'string' ? value : String(value);

  // Treat explicit default token or raw upload paths as "missing" so the
  // frontend shows a safe fallback instead of attempting to load
  // `/survly/uploads/...` which 404s on GitHub Pages.
  if (rawValue === 'default_img') return '';
  // If the value contains an inline data: URL anywhere (for example a
  // malformed "/uploads/data:..."), return the embedded data URL directly
  // so we never construct a bogus /uploads/data:... page request.
  if (rawValue.includes('data:')) {
    const idx = rawValue.indexOf('data:');
    return rawValue.slice(idx);
  }
  if (rawValue.startsWith('data:')) {
    return rawValue;
  }

  const appBase = import.meta.env.BASE_URL || '/';
  const joinAppBase = (path) => {
    const normalizedBase = appBase.endsWith('/') ? appBase : `${appBase}/`;
    return new URL(path.replace(/^\/+/, ''), window.location.origin + normalizedBase).toString();
  };

  // VITE_UPLOADS_BASE overrides VITE_API_BASE for upload paths.
  // Set it to an empty string in .env.production to serve uploads from the
  // static GitHub Pages origin instead of the API server.
  const uploadsBase = import.meta.env.VITE_UPLOADS_BASE !== undefined
    ? import.meta.env.VITE_UPLOADS_BASE
    : (import.meta.env.VITE_API_BASE || '');
  const joinApiBase = (path) => {
    if (!uploadsBase) {
      return '';
    }

    const normalizedApiBase = uploadsBase.endsWith('/') ? uploadsBase : `${uploadsBase}/`;
    return new URL(path.replace(/^\/+/, ''), normalizedApiBase).toString();
  };

  if (rawValue.startsWith('http://') || rawValue.startsWith('https://')) {
    try {
      const parsedUrl = new URL(rawValue);
      const uploadsIndex = parsedUrl.pathname.lastIndexOf('/uploads/');
      if (uploadsIndex !== -1) {
        const filePath = parsedUrl.pathname.slice(uploadsIndex + '/uploads/'.length).replace(/^\/+/, '');
        return joinApiBase(`uploads/${filePath}`) || joinAppBase(`uploads/${filePath}`);
      }
    } catch {
      // Fall back to the original value below.
    }

    return rawValue;
  }

  const normalizedPath = rawValue.replace(/^\/+/, '');

  if (normalizedPath.startsWith('uploads/')) {
    return joinApiBase(normalizedPath) || joinAppBase(normalizedPath);
  }

  if (normalizedPath.includes('/uploads/')) {
    const uploadsIndex = normalizedPath.lastIndexOf('/uploads/');
    const uploadPath = normalizedPath.slice(uploadsIndex + '/uploads/'.length).replace(/^\/+/, '');
    if (!uploadPath) {
      return '';
    }
    return joinApiBase(`uploads/${uploadPath}`) || joinAppBase(`uploads/${uploadPath}`);
  }

  if (/^[^/]+\.[a-z0-9]+$/i.test(normalizedPath)) {
    return joinApiBase(`uploads/${normalizedPath}`) || joinAppBase(`uploads/${normalizedPath}`);
  }

  return joinAppBase(normalizedPath);
}