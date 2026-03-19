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
app.use(cors());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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
