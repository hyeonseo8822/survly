const jwt = require('jsonwebtoken');

function normalizeUserPayload(decoded) {
  if (!decoded || typeof decoded !== 'object') {
    return null;
  }

  const userId = decoded.userId || decoded.id || decoded.sub || null;
  if (!userId) {
    return null;
  }

  return {
    ...decoded,
    userId
  };
}

function extractTokenFromHeader(authHeader = '') {
  const header = String(authHeader || '').trim();
  if (!header) {
    return '';
  }

  const bearerPrefix = /^Bearer\s+/i;
  const rawToken = bearerPrefix.test(header) ? header.replace(bearerPrefix, '') : header;
  return rawToken.trim().replace(/^"|"$/g, '');
}

function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ success: false, message: '토큰이 없습니다' });
  }

  const token = extractTokenFromHeader(authHeader);
  if (!token) {
    return res.status(401).json({ success: false, message: '토큰 형식이 올바르지 않습니다' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = normalizeUserPayload(decoded);

    if (!req.user) {
      return res.status(401).json({ success: false, message: '인증 정보가 올바르지 않습니다. 다시 로그인해주세요.' });
    }

    next();
  } catch (error) {
    res.status(403).json({ success: false, message: '유효하지 않은 토큰입니다' });
  }
}

function softVerifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return next();
  }

  const token = extractTokenFromHeader(authHeader);
  if (!token) {
    return next();
  }

  try {
    req.user = normalizeUserPayload(jwt.verify(token, process.env.JWT_SECRET));
  } catch (error) {
    req.user = null;
  }

  next();
}

module.exports = {
  verifyToken,
  softVerifyToken
};
