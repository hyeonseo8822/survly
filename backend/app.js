require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const crypto = require('crypto');
const multer = require('multer');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());

// 정적 파일 서비스 (업로드된 이미지)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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

app.listen(PORT, () => {
  console.log(`서버 실행 중 → http://localhost:${PORT}`);
});

// --- Multer 설정 ---
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // 업로드될 파일이 저장될 경로
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// --- Auth Endpoints ---

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

    // Use string userId in JWT payload
    const token = jwt.sign({ userId: user.userId }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, userId: user.userId });
  });
});

// --- Middleware ---

const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ success: false, message: '토큰이 없습니다' });
  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: '토큰 형식이 올바르지 않습니다' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(403).json({ success: false, message: '유효하지 않은 토큰입니다' });
  }
};

const softVerifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return next();
  const token = authHeader.split(' ')[1];
  if (!token) return next();
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    next();
  }
};

// --- Survey Endpoints ---

app.post('/api/surveys', verifyToken, upload.single('surveyImage'), (req, res) => {
  console.log('req.file:', req.file);
  console.log('req.body:', req.body);

  let { title, description, questions, isPublic, img } = req.body;
  const userId = req.user.userId; 
  
  // questions 파싱
  try {
    questions = JSON.parse(questions);
  } catch (e) {
    return res.status(400).json({ success: false, message: '질문 데이터 형식이 올바르지 않습니다.' });
  }

  // isPublic 값 숫자형으로 변환
  isPublic = isPublic === '1' ? 1 : 0;

  // 이미지 파일명 결정
  const finalImg = req.file ? req.file.filename : (img || 'default_img');

  if (!userId) return res.status(401).json({ success: false, message: '인증 토큰이 올바르지 않습니다. 다시 로그인해주세요.' });
  if (!title || !questions || !Array.isArray(questions)) return res.status(400).json({ success: false, message: '필수 입력값 누락 또는 질문 데이터 형식이 올바르지 않습니다.' });

  let link = null;
  if (!isPublic) {
    link = crypto.randomBytes(8).toString('hex');
  }

  db.beginTransaction(err => {
    if (err) return res.status(500).json({ success: false, message: '서버 오류', error: err });

    const surveySql = 'INSERT INTO surveys (title, description, isPublic, userId, link, img) VALUES (?, ?, ?, ?, ?, ?)';
    db.query(surveySql, [title, description, isPublic, userId, link, finalImg], (err, result) => {
      if (err) {
        return db.rollback(() => res.status(500).json({ success: false, message: '설문 저장 실패', error: err }));
      }
      const surveyId = result.insertId;
      if (questions.length === 0) {
        return db.commit(err => {
          if (err) return db.rollback(() => res.status(500).json({ success: false, message: '커밋 실패', error: err }));
          res.status(201).json({ success: true, surveyId, link });
        });
      }

      let completedQuestions = 0;
      questions.forEach((q) => {
        const questionSql = 'INSERT INTO questions (surveyId, type, question, isRequired) VALUES (?, ?, ?, ?)';
        db.query(questionSql, [surveyId, q.type, q.question, q.isRequired ? 1 : 0], (err, qResult) => {
          if (err) return db.rollback(() => res.status(500).json({ success: false, message: '질문 저장 실패', error: err }));
          const questionId = qResult.insertId;
          const options = q.options;
          if (options && options.length > 0) {
            let completedOptions = 0;
            options.forEach((opt) => {
              const optionSql = 'INSERT INTO options (questionId, optionText) VALUES (?, ?)';
              db.query(optionSql, [questionId, opt], (err2) => {
                if (err2) return db.rollback(() => res.status(500).json({ success: false, message: '옵션 저장 실패', error: err2 }));
                completedOptions++;
                if (completedOptions === options.length) {
                  completedQuestions++;
                  if (completedQuestions === questions.length) {
                    db.commit(err => {
                      if (err) return db.rollback(() => res.status(500).json({ success: false, message: '커밋 실패', error: err }));
                      res.status(201).json({ success: true, surveyId, link });
                    });
                  }
                }
              });
            });
          } else {
            completedQuestions++;
            if (completedQuestions === questions.length) {
              db.commit(err => {
                if (err) return db.rollback(() => res.status(500).json({ success: false, message: '커밋 실패', error: err }));
                res.status(201).json({ success: true, surveyId, link });
              });
            }
          }
        });
      });
    });
  });
});

app.put('/api/surveys/:surveyId', verifyToken, upload.single('surveyImage'), (req, res) => {
  console.log('req.file:', req.file);
  console.log('req.body:', req.body);

  const { surveyId } = req.params;
  let { title, description, questions, img } = req.body;
  const userId = req.user.userId; 

  // questions 파싱
  try {
    questions = JSON.parse(questions);
  } catch (e) {
    return res.status(400).json({ success: false, message: '질문 데이터 형식이 올바르지 않습니다.' });
  }

  // 이미지 파일명 결정
  const finalImg = req.file ? req.file.filename : (img || 'default_img');

  if (!userId) return res.status(401).json({ success: false, message: '인증 토큰이 올바르지 않습니다. 다시 로그인해주세요.' });
  if (!title || !questions || !Array.isArray(questions)) return res.status(400).json({ success: false, message: '필수 입력값 누락 또는 질문 데이터 형식이 올바르지 않습니다.' });

  db.beginTransaction(err => {
    if (err) return res.status(500).json({ success: false, message: '서버 오류', error: err });

    // 1. Check if user owns the survey
    db.query('SELECT userId FROM surveys WHERE id = ?', [surveyId], (err, results) => {
      if (err) return db.rollback(() => res.status(500).json({ success: false, message: '설문 소유자 확인 실패', error: err }));
      if (results.length === 0) return db.rollback(() => res.status(404).json({ success: false, message: '설문을 찾을 수 없습니다.' }));
      if (results[0].userId !== userId) return db.rollback(() => res.status(403).json({ success: false, message: '설문을 수정할 권한이 없습니다.' }));

      // 2. Update survey basic info
      const updateSurveySql = 'UPDATE surveys SET title = ?, description = ?, img = ? WHERE id = ?';
      db.query(updateSurveySql, [title, description, finalImg, surveyId], (err) => {
        if (err) return db.rollback(() => res.status(500).json({ success: false, message: '설문 기본 정보 업데이트 실패', error: err }));

        // 3. Delete existing options
        const deleteOptionsSql = 'DELETE FROM options WHERE questionId IN (SELECT id FROM questions WHERE surveyId = ?)';
        db.query(deleteOptionsSql, [surveyId], (err) => {
          if (err) return db.rollback(() => res.status(500).json({ success: false, message: '기존 옵션 삭제 실패', error: err }));

          // 4. Delete existing questions
          const deleteQuestionsSql = 'DELETE FROM questions WHERE surveyId = ?';
          db.query(deleteQuestionsSql, [surveyId], (err) => {
            if (err) return db.rollback(() => res.status(500).json({ success: false, message: '기존 질문 삭제 실패', error: err }));

            // 5. Insert new questions and options
            let completedQuestions = 0;
            if (questions.length === 0) {
              return db.commit(err => {
                if (err) return db.rollback(() => res.status(500).json({ success: false, message: '커밋 실패', error: err }));
                res.json({ success: true, message: '설문지가 성공적으로 수정되었습니다.' });
              });
            }

            questions.forEach((q) => {
              const insertQuestionSql = 'INSERT INTO questions (surveyId, type, question, isRequired) VALUES (?, ?, ?, ?)';
              db.query(insertQuestionSql, [surveyId, q.type, q.question, q.isRequired ? 1 : 0], (err, qResult) => {
                if (err) return db.rollback(() => res.status(500).json({ success: false, message: '새 질문 삽입 실패', error: err }));
                const questionId = qResult.insertId;
                const options = q.options;

                if (options && options.length > 0) {
                  let completedOptions = 0;
                  options.forEach((opt) => {
                    const insertOptionSql = 'INSERT INTO options (questionId, optionText) VALUES (?, ?)';
                    db.query(insertOptionSql, [questionId, opt], (err2) => {
                      if (err2) return db.rollback(() => res.status(500).json({ success: false, message: '새 옵션 삽입 실패', error: err2 }));
                      completedOptions++;
                      if (completedOptions === options.length) {
                        completedQuestions++;
                        if (completedQuestions === questions.length) {
                          db.commit(err => {
                            if (err) return db.rollback(() => res.status(500).json({ success: false, message: '커밋 실패', error: err }));
                            res.json({ success: true, message: '설문지가 성공적으로 수정되었습니다.' });
                          });
                        }
                      }
                    });
                  });
                } else {
                  completedQuestions++;
                  if (completedQuestions === questions.length) {
                    db.commit(err => {
                      if (err) return db.rollback(() => res.status(500).json({ success: false, message: '커밋 실패', error: err }));
                      res.json({ success: true, message: '설문지가 성공적으로 수정되었습니다.' });
                    });
                  }
                }
              });
            });
          });
        });
      });
    });
  });
});

app.delete('/api/surveys/:surveyId', verifyToken, (req, res) => {
  const { surveyId } = req.params;
  const userId = req.user.userId; // From token

  if (!userId) return res.status(401).json({ success: false, message: '인증 토큰이 올바르지 않습니다. 다시 로그인해주세요.' });

  db.beginTransaction(err => {
    if (err) return res.status(500).json({ success: false, message: '서버 오류', error: err });

    // 1. Check if user owns the survey
    db.query('SELECT userId FROM surveys WHERE id = ?', [surveyId], (err, results) => {
      if (err) return db.rollback(() => res.status(500).json({ success: false, message: '설문 소유자 확인 실패', error: err }));
      if (results.length === 0) return db.rollback(() => res.status(404).json({ success: false, message: '설문을 찾을 수 없습니다.' }));
      if (results[0].userId !== userId) return db.rollback(() => res.status(403).json({ success: false, message: '설문을 삭제할 권한이 없습니다.' }));

      // 2. Delete responses
      const deleteResponsesSql = 'DELETE FROM responses WHERE surveyId = ?';
      db.query(deleteResponsesSql, [surveyId], (err) => {
        if (err) return db.rollback(() => res.status(500).json({ success: false, message: '응답 삭제 실패', error: err }));

        // 3. Delete options
        const deleteOptionsSql = 'DELETE FROM options WHERE questionId IN (SELECT id FROM questions WHERE surveyId = ?)';
        db.query(deleteOptionsSql, [surveyId], (err) => {
          if (err) return db.rollback(() => res.status(500).json({ success: false, message: '옵션 삭제 실패', error: err }));

          // 4. Delete questions
          const deleteQuestionsSql = 'DELETE FROM questions WHERE surveyId = ?';
          db.query(deleteQuestionsSql, [surveyId], (err) => {
            if (err) return db.rollback(() => res.status(500).json({ success: false, message: '질문 삭제 실패', error: err }));

            // 5. Delete survey
            const deleteSurveySql = 'DELETE FROM surveys WHERE id = ? AND userId = ?';
            db.query(deleteSurveySql, [surveyId, userId], (err) => {
              if (err) return db.rollback(() => res.status(500).json({ success: false, message: '설문 삭제 실패', error: err }));

              db.commit(err => {
                if (err) return db.rollback(() => res.status(500).json({ success: false, message: '커밋 실패', error: err }));
                res.json({ success: true, message: '설문지가 성공적으로 삭제되었습니다.' });
              });
            });
          });
        });
      });
    });
  });
});

app.get('/api/surveys', (req, res) => {
  const { isPublic, keyword, page = 1, limit = 6 } = req.query;
  const offset = (page - 1) * limit;
  let countSql = 'SELECT COUNT(*) as total FROM surveys WHERE 1=1';
  let sql = 'SELECT * FROM surveys WHERE 1=1';
  const params = [];
  const countParams = [];

  if (isPublic !== undefined) {
    const condition = ' AND isPublic = ?';
    sql += condition;
    countSql += condition;
    params.push(isPublic === 'true' ? 1 : 0);
    countParams.push(isPublic === 'true' ? 1 : 0);
  }
  if (keyword) {
    const condition = ' AND title LIKE ?';
    sql += condition;
    countSql += condition;
    params.push(`%${keyword}%`);
    countParams.push(`%${keyword}%`);
  }
  sql += ' ORDER BY id DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));

  db.query(countSql, countParams, (err, countResult) => {
    if (err) return res.status(500).json({ success: false, error: err });
    const totalSurveys = countResult[0].total;
    db.query(sql, params, (err, results) => {
      if (err) return res.status(500).json({ success: false, error: err });
      res.json({ success: true, surveys: results, totalSurveys: totalSurveys, page: Number(page), totalPages: Math.ceil(totalSurveys / limit) });
    });
  });
});

const getSurveyDetails = (res, survey) => {
  const questionsQuery = `
    SELECT q.id as questionId, q.type, q.question, q.isRequired, o.id as optionId, o.optionText
    FROM questions q
    LEFT JOIN options o ON q.id = o.questionId
    WHERE q.surveyId = ?
    ORDER BY q.id, o.id
  `;
  db.query(questionsQuery, [survey.id], (err, questionResults) => {
    if (err) return res.status(500).json({ success: false, error: err });
    const questionsMap = {};
    questionResults.forEach(row => {
      if (!questionsMap[row.questionId]) {
        questionsMap[row.questionId] = { questionId: row.questionId, type: row.type, question: row.question, isRequired: row.isRequired, options: [] };
      }
      if (row.optionId && row.optionText) {
        questionsMap[row.questionId].options.push(row.optionText);
      }
    });
    res.json({ success: true, survey: { ...survey, questions: Object.values(questionsMap) } });
  });
};

app.get('/api/surveys/:surveyId', (req, res) => {
  const { surveyId } = req.params;
  const surveyQuery = 'SELECT * FROM surveys WHERE id = ?';
  db.query(surveyQuery, [surveyId], (err, surveyResults) => {
    if (err) return res.status(500).json({ success: false, error: err });
    if (surveyResults.length === 0) return res.status(404).json({ success: false, message: '설문지를 찾을 수 없습니다.' });
    getSurveyDetails(res, surveyResults[0]);
  });
});

app.get('/api/s/:link', (req, res) => {
  const { link } = req.params;
  const surveyQuery = 'SELECT * FROM surveys WHERE link = ?';
  db.query(surveyQuery, [link], (err, surveyResults) => {
    if (err) return res.status(500).json({ success: false, error: err });
    if (surveyResults.length === 0) return res.status(404).json({ success: false, message: '설문지를 찾을 수 없습니다.' });
    getSurveyDetails(res, surveyResults[0]);
  });
});

// --- User-specific Endpoints ---

app.get('/api/me/surveys', verifyToken, (req, res) => {
  const userId = req.user.userId; 
  if (!userId) return res.status(401).json({ success: false, message: '인증 토큰이 올바르지 않습니다. 다시 로그인해주세요.' });

  const { page = 1, limit = 6 } = req.query;
  const offset = (page - 1) * limit;

  let countSql = 'SELECT COUNT(*) as total FROM surveys WHERE userId = ?';
  let sql = 'SELECT * FROM surveys WHERE userId = ? ORDER BY id DESC LIMIT ? OFFSET ?';

  db.query(countSql, [userId], (err, countResult) => {
    if (err) return res.status(500).json({ success: false, error: err });
    const totalSurveys = countResult[0].total;

    db.query(sql, [userId, Number(limit), Number(offset)], (err, results) => {
      if (err) return res.status(500).json({ success: false, error: err });
      res.json({
        success: true,
        surveys: results,
        totalSurveys: totalSurveys,
        page: Number(page),
        totalPages: Math.ceil(totalSurveys / limit)
      });
    });
  });
});

app.get('/api/me/responses/surveys', verifyToken, (req, res) => {
  const userId = req.user.userId; 
  if (!userId) return res.status(401).json({ success: false, message: '인증 토큰이 올바르지 않습니다. 다시 로그인해주세요.' });

  const { page = 1, limit = 6 } = req.query;
  const offset = (page - 1) * limit;

  let countSql = `
    SELECT COUNT(DISTINCT s.id) as total
    FROM surveys s
    INNER JOIN responses r ON s.id = r.surveyId
    WHERE r.userId = ? AND s.isPublic = 1
  `;
  let sql = `
    SELECT DISTINCT s.*
    FROM surveys s
    INNER JOIN responses r ON s.id = r.surveyId
    WHERE r.userId = ? AND s.isPublic = 1
    ORDER BY s.id DESC
    LIMIT ? OFFSET ?
  `;

  db.query(countSql, [userId], (err, countResult) => {
    if (err) return res.status(500).json({ success: false, error: err });
    const totalSurveys = countResult[0].total;

    db.query(sql, [userId, Number(limit), Number(offset)], (err, results) => {
      if (err) return res.status(500).json({ success: false, error: err });
      res.json({
        success: true,
        surveys: results,
        totalSurveys: totalSurveys,
        page: Number(page),
        totalPages: Math.ceil(totalSurveys / limit)
      });
    });
  });
});

// --- Response Endpoints ---

app.post('/api/surveys/:surveyId/responses', softVerifyToken, (req, res) => {
  const { surveyId } = req.params;
  const { answers } = req.body;
  const userId = req.user ? req.user.userId : null;

  if (!answers || !Array.isArray(answers) || answers.length === 0) {
    return res.status(400).json({ success: false, message: '최소 하나의 답변이 필요합니다.' });
  }

  let completedAnswers = 0;
  answers.forEach((a) => {
    const sql = 'INSERT INTO responses (surveyId, questionId, answer, userId) VALUES (?, ?, ?, ?)';
    db.query(sql, [surveyId, a.questionId, a.answer, userId], (err) => {
      if (err) {
        console.error('응답 저장 오류:', err);
        return;
      }
      completedAnswers++;
      if (completedAnswers === answers.length) {
        res.json({ success: true, message: '응답 제출 완료' });
      }
    });
  });
});

app.get('/api/surveys/:surveyId/results', verifyToken, (req, res) => {
  const { surveyId } = req.params;
  const sql = `
    SELECT q.id as questionId, q.type, q.question, r.answer
    FROM questions q
    LEFT JOIN responses r ON q.id = r.questionId
    WHERE q.surveyId = ?
    ORDER BY q.id, r.id
  `;
  db.query(sql, [surveyId], (err, results) => {
    if (err) return res.status(500).json({ success: false, error: err });
    const formatted = {};
    results.forEach((row) => {
      if (!formatted[row.questionId]) {
        formatted[row.questionId] = { question: row.question, type: row.type, summary: {}, comments: [] };
      }
      if (row.answer) {
        if (row.type === 'multiple-choice') {
          formatted[row.questionId].summary[row.answer] = (formatted[row.questionId].summary[row.answer] || 0) + 1;
        } else {
          formatted[row.questionId].comments.push(row.answer);
        }
      }
    });
    res.json({ success: true, surveyId: Number(surveyId), results: Object.values(formatted) });
  });
});
