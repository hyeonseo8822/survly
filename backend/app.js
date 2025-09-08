require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 5000;

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME
});

db.connect((err) => {
  if (err) {
    console.error('MySQL 연결 실패:', err);
    return;
  }
  console.log('MySQL 연결 성공!');
});

app.get('/', (req, res) => {
  res.send('Hello Survly!');
});

app.listen(PORT, () => {
  console.log(`서버 실행 중 → http://localhost:${PORT}`);
});



app.post('/api/auth/register', async (req, res) => {
  const { email, password, userId } = req.body;

  if (!email || !password || !userId) {
    return res.status(400).json({ success: false, message: '필수 입력값 누락' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const sql = 'INSERT INTO users (email, password, userId) VALUES (?, ?, ?)';
    db.query(sql, [email, hashedPassword, userId], (err, result) => {
      if (err) return res.status(500).json({ success: false, error: err });
      res.json({ success: true, userId: result.insertId });
    });
  } catch (error) {
    res.status(500).json({ success: false, error });
  }
});

app.post('/api/auth/login', (req, res) => {
  const { userId, password } = req.body;
  if (!userId || !password) {
    return res.status(400).json({ success: false, message: '필수 입력값 누락' });
  }

  const sql = 'SELECT * FROM users WHERE userId = ?';
  db.query(sql, [userId], async (err, results) => {
    if (err) return res.status(500).json({ success: false, error: err });
    if (results.length === 0) return res.status(401).json({ success: false, message: '존재하지 않는 사용자' });

    const user = results[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ success: false, message: '비밀번호 불일치' });

    const token = jwt.sign({ userId: user.userId }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, userId: user.userId });
  });
});



app.post('/api/surveys', (req, res) => {
  const { title, description, isPublic, questions } = req.body;

  if (!title || !questions) {
    return res.status(400).json({ success: false, message: '필수 입력값 누락' });
  }

  const sql = 'INSERT INTO surveys (title, description, isPublic) VALUES (?, ?, ?)';
  db.query(sql, [title, description, isPublic], (err, result) => {
    if (err) return res.status(500).json({ success: false, error: err });

    const surveyId = result.insertId;

    questions.forEach((q) => {
      db.query(
        'INSERT INTO survey_questions (surveyId, type, question) VALUES (?, ?, ?)',
        [surveyId, q.type, q.question],
        (err, qResult) => {
          if (err) console.error(err);
          if (q.options) {
            q.options.forEach((opt) => {
              db.query(
                'INSERT INTO survey_options (questionId, optionText) VALUES (?, ?)',
                [qResult.insertId, opt],
                (err2) => {
                  if (err2) console.error(err2);
                }
              );
            });
          }
        }
      );
    });

    res.json({ success: true, surveyId });
  });
});

app.get('/api/surveys', (req, res) => {
  const { isPublic, keyword, page = 1, limit = 10 } = req.query;
  const offset = (page - 1) * limit;

  let sql = 'SELECT * FROM surveys WHERE 1=1';
  const params = [];

  if (isPublic) {
    sql += ' AND isPublic = ?';
    params.push(isPublic === 'true' ? 1 : 0);
  }

  if (keyword) {
    sql += ' AND title LIKE ?';
    params.push(`%${keyword}%`);
  }

  sql += ' LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));

  db.query(sql, params, (err, results) => {
    if (err) return res.status(500).json({ success: false, error: err });
    res.json({ success: true, surveys: results, total: results.length, page: Number(page), limit: Number(limit) });
  });
});

app.post('/api/surveys/:surveyId/responses', (req, res) => {
  const { surveyId } = req.params;
  const { answers } = req.body;

  if (!answers) return res.status(400).json({ success: false, message: 'answers 누락' });

  answers.forEach((a) => {
    db.query(
      'INSERT INTO survey_responses (surveyId, questionId, answer) VALUES (?, ?, ?)',
      [surveyId, a.questionId, a.answer],
      (err) => {
        if (err) console.error(err);
      }
    );
  });

  res.json({ success: true, message: '응답 제출 완료' });
});

app.get('/api/surveys/:surveyId/results', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ success: false, message: '토큰 없음' });

  const token = authHeader.split(' ')[1];
  try {
    jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(403).json({ success: false, message: '유효하지 않은 토큰' });
  }

  const { surveyId } = req.params;

  const sql = `
    SELECT q.id as questionId, q.type, q.question, r.answer
    FROM survey_questions q
    LEFT JOIN survey_responses r ON q.id = r.questionId
    WHERE q.surveyId = ?
  `;

  db.query(sql, [surveyId], (err, results) => {
    if (err) return res.status(500).json({ success: false, error: err });

    const formatted = {};
    results.forEach((row) => {
      if (!formatted[row.questionId]) {
        formatted[row.questionId] = { question: row.question, summary: {}, comments: [] };
      }
      if (row.type === 'multiple-choice') {
        formatted[row.questionId].summary[row.answer] = (formatted[row.questionId].summary[row.answer] || 0) + 1;
      } else {
        formatted[row.questionId].comments.push(row.answer);
      }
    });

    res.json({ success: true, surveyId, results: Object.values(formatted) });
  });
});
