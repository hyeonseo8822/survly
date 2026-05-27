export function resolveUploadUrl(value) {
  if (!value) {
    return '';
  }

  // Treat explicit default token or raw upload paths as "missing" so the
  // frontend shows a safe fallback instead of attempting to load
  // `/survly/uploads/...` which 404s on GitHub Pages.
  if (value === 'default_img') return '';
  if (String(value).includes('/uploads/') && !String(value).startsWith('data:')) return '';

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
    // If we reach here, it's a relative uploads path; avoid mapping it to
    // the GH Pages app base — treat as missing to prevent 404s.
    return '';
  }

  return joinAppBase(normalizedPath);
}