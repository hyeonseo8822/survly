const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const { connectDatabase } = require('./config/database');

const authRoutes = require('./routes/authRoutes');
const surveyRoutes = require('./routes/surveyRoutes');
const meRoutes = require('./routes/meRoutes');
const publicRoutes = require('./routes/publicRoutes');
const usersRoutes = require('./routes/usersRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
// Configure CORS to allow the frontend origin(s). Set ALLOWED_ORIGINS in .env as
// a comma-separated list (e.g. ALLOWED_ORIGINS=https://hyeonseo8822.github.io,https://your-deployed-backend.example)
const rawAllowed = process.env.ALLOWED_ORIGINS || 'https://hyeonseo8822.github.io';
const allowedOrigins = rawAllowed.split(',').map(s => s.trim()).filter(Boolean);
console.log('Allowed origins:', allowedOrigins);
app.use((req, res, next) => {
  const origin = req.headers.origin;
  console.log('CORS check origin:', origin);
  // Allow non-browser (curl, server-to-server) requests with no origin
  if (!origin) return next();

  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    return next();
  }

  console.warn('Blocked origin by CORS:', origin);
  return res.status(403).send('CORS origin not allowed');
});
// Serve uploads from local disk or redirect to S3 when configured.
if (process.env.S3_BUCKET && process.env.USE_S3 === 'true') {
  const bucket = process.env.S3_BUCKET;
  const region = process.env.AWS_REGION || 'us-east-1';
  app.use('/uploads', (req, res) => {
    const key = req.path.replace(/^\//, '');
    const s3Host = region === 'us-east-1'
      ? `${bucket}.s3.amazonaws.com`
      : `${bucket}.s3.${region}.amazonaws.com`;
    const url = `https://${s3Host}/${encodeURIComponent(key)}`;
    return res.redirect(302, url);
  });
} else if (process.env.GH_PAGES_BASE) {
  // If GH_PAGES_BASE is set (e.g. https://hyeonseo8822.github.io/survly),
  // redirect /uploads/* to the GH Pages static uploads folder.
  const ghBase = process.env.GH_PAGES_BASE.replace(/\/$/, '');
  app.use('/uploads', (req, res) => {
    const key = req.path.replace(/^\//, '');
    const url = `${ghBase}/uploads/${encodeURIComponent(key)}`;
    return res.redirect(302, url);
  });
} else {
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
}

app.use('/api/auth', authRoutes);
app.use('/api/surveys', surveyRoutes);
app.use('/api/me', meRoutes);
app.use('/api/users', usersRoutes);
app.use('/api', publicRoutes);

async function startServer() {
  try {
    await connectDatabase();
    console.log('MongoDB 연결 성공!');

    app.listen(PORT, () => {
      console.log(`서버 실행 중 → http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('MongoDB 연결 실패:', error);
    process.exit(1);
  }
}

startServer();
