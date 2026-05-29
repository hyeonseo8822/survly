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
const uploadRoutes = require('./routes/uploadRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
// Configure CORS to allow the frontend origin(s). Set ALLOWED_ORIGINS in .env as
// a comma-separated list (e.g. ALLOWED_ORIGINS=https://hyeonseo8822.github.io,https://your-deployed-backend.example)
const rawAllowed = process.env.ALLOWED_ORIGINS || 'https://hyeonseo8822.github.io';
const allowedOrigins = rawAllowed.split(',').map(s => s.trim()).filter(Boolean);
if (process.env.NODE_ENV !== 'production') {
  console.log('Allowed origins:', allowedOrigins);
}

app.use((req, res, next) => {
  const origin = req.headers.origin;

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
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders(res) {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  }
}));

app.use('/api/auth', authRoutes);
app.use('/api/surveys', surveyRoutes);
app.use('/api/me', meRoutes);
app.use('/api/users', usersRoutes);
app.use('/api', publicRoutes);
app.use('/api', uploadRoutes);

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
