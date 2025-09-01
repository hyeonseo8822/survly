require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');

const app = express();
const PORT = process.env.PORT || 3000;

// DB 연결
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,   // 따로 관리
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME
});

// DB 연결 확인
db.connect((err) => {
  if (err) {
    console.error('MySQL 연결 실패:', err);
    return;
  }
  console.log('MySQL 연결 성공!');
});

// 라우트 예시
app.get('/', (req, res) => {
  res.send('Hello Survly!');
});

app.listen(PORT, () => {
  console.log(`서버 실행 중 → http://localhost:${PORT}`);
});
