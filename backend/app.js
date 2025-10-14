
require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors')

const app = express();
app.use(express.json());

app.use(cors());

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

// 회원가입
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

// 로그인
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

// JWT 토큰 검증 미들웨어
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ success: false, message: '토큰이 없습니다' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ success: false, message: '토큰 형식이 올바르지 않습니다' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ success: false, message: '유효하지 않은 토큰입니다' });
  }
};

// 설문지 생성 (인증 필요)
app.post('/api/surveys', verifyToken, (req, res) => {
  const { title, description, isPublic, questions } = req.body;
  console.log(req.body);
  const userId = req.user.userId; // 토큰에서 userId 가져오기

  console.log('Received survey data:', req.body); // Log the entire request body

  if (!title || !questions || !Array.isArray(questions)) {
    return res.status(400).json({ success: false, message: '필수 입력값 누락' });
  }

  db.beginTransaction(err => {
    if (err) {
      console.error("Transaction Start Error:", err);
      return res.status(500).json({ success: false, message: '서버 오류', error: err });
    }

    const surveySql = 'INSERT INTO surveys (title, description, isPublic, userId) VALUES (?, ?, ?, ?)';
    db.query(surveySql, [title, description, isPublic ? 1 : 0, userId], (err, result) => {
      if (err) {
        return db.rollback(() => {
          console.error("Survey Insert Error:", err);
          res.status(500).json({ success: false, message: '설문 저장 실패', error: err });
        });
      }

      const surveyId = result.insertId;

      if (questions.length === 0) {
        return db.commit(err => {
          if (err) {
            return db.rollback(() => {
              res.status(500).json({ success: false, message: '커밋 실패', error: err });
            });
          }
          console.log('설문지 생성 완료 (질문 없음):', surveyId);
          res.status(201).json({ success: true, surveyId });
        });
      }

      let completedQuestions = 0;
      let errorOccurred = false;

      const handleError = (step, error) => {
        if (!errorOccurred) {
          errorOccurred = true;
          db.rollback(() => {
            console.error(`${step} Error:`, error);
            res.status(500).json({ success: false, message: `${step} 실패`, error: error });
          });
        }
      };

      questions.forEach((q) => {
        if (errorOccurred) return;

        console.log('Processing question:', q); // Log each question
        const isRequired = q.isRequired === true ? 1 : 0;
        console.log(`Value for isRequired: ${q.isRequired}, which is being converted to: ${isRequired}`);


        const questionSql = 'INSERT INTO questions (surveyId, type, question, isRequired) VALUES (?, ?, ?, ?)';
        db.query(questionSql, [surveyId, q.type, q.question, isRequired ? 1 : 0], (err, qResult) => {
          if (errorOccurred) return;
          if (err) {
            return handleError('질문 저장', err);
          }

          const questionId = qResult.insertId;
          const options = q.options;

          if (options && options.length > 0) {
            let completedOptions = 0;
            options.forEach((opt) => {
              if (errorOccurred) return;
              const optionSql = 'INSERT INTO options (questionId, optionText) VALUES (?, ?)';
              db.query(optionSql, [questionId, opt], (err2) => {
                if (errorOccurred) return;
                if (err2) {
                  return handleError('옵션 저장', err2);
                }
                
                completedOptions++;
                if (completedOptions === options.length) {
                  completedQuestions++;
                  if (completedQuestions === questions.length && !errorOccurred) {
                    db.commit(err => {
                      if (err) {
                        return handleError('커밋', err);
                      }
                      console.log('설문지 생성 완료:', surveyId);
                      res.status(201).json({ success: true, surveyId });
                    });
                  }
                }
              });
            });
          } else {
            completedQuestions++;
            if (completedQuestions === questions.length && !errorOccurred) {
              db.commit(err => {
                if (err) {
                  return handleError('커밋', err);
                }
                console.log('설문지 생성 완료:', surveyId);
                res.status(201).json({ success: true, surveyId });
              });
            }
          }
        });
      });
    });
  });
});

// 설문지 목록 조회
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

// 설문지 개별 조회 (질문과 옵션 포함)
app.get('/api/surveys/:surveyId', (req, res) => {
  const { surveyId } = req.params;

  // 설문지 기본 정보 조회
  const surveyQuery = 'SELECT * FROM surveys WHERE id = ?';
  db.query(surveyQuery, [surveyId], (err, surveyResults) => {
    if (err) return res.status(500).json({ success: false, error: err });
    if (surveyResults.length === 0) {
      return res.status(404).json({ success: false, message: '설문지를 찾을 수 없습니다.' });
    }

    const survey = surveyResults[0];

    // 질문과 옵션 조회
    const questionsQuery = `
      SELECT 
        q.id as questionId,
        q.type,
        q.question,
        o.id as optionId,
        o.optionText
      FROM questions q
      LEFT JOIN options o ON q.id = o.questionId
      WHERE q.surveyId = ?
      ORDER BY q.id, o.id
    `;

    db.query(questionsQuery, [surveyId], (err, questionResults) => {
      if (err) return res.status(500).json({ success: false, error: err });

      // 질문별로 그룹화
      const questionsMap = {};
      questionResults.forEach(row => {
        if (!questionsMap[row.questionId]) {
          questionsMap[row.questionId] = {
            questionId: row.questionId,
            type: row.type,
            question: row.question,
            options: []
          };
        }
        
        if (row.optionId && row.optionText) {
          questionsMap[row.questionId].options.push(row.optionText);
        }
      });

      const questions = Object.values(questionsMap);

      res.json({
        success: true,
        survey: {
          id: survey.id,
          title: survey.title,
          description: survey.description,
          isPublic: survey.isPublic,
          questions: questions
        }
      });
    });
  });
});

// 설문지 수정
app.put('/api/surveys/:surveyId', (req, res) => {
  const { surveyId } = req.params;
  const { title, description, isPublic, questions } = req.body;

  if (!title || !questions) {
    return res.status(400).json({ success: false, message: '필수 입력값 누락' });
  }

  // 트랜잭션 시작
  db.beginTransaction((err) => {
    if (err) return res.status(500).json({ success: false, error: err });

    // 1. 설문지 기본 정보 업데이트
    const updateSurveyQuery = 'UPDATE surveys SET title = ?, description = ?, isPublic = ? WHERE id = ?';
    db.query(updateSurveyQuery, [title, description, isPublic ? 1 : 0, surveyId], (err) => {
      if (err) {
        return db.rollback(() => {
          res.status(500).json({ success: false, error: err });
        });
      }

      // 2. 기존 옵션 삭제
      const deleteOptionsQuery = 'DELETE o FROM options o INNER JOIN questions q ON o.questionId = q.id WHERE q.surveyId = ?';
      db.query(deleteOptionsQuery, [surveyId], (err) => {
        if (err) {
          return db.rollback(() => {
            res.status(500).json({ success: false, error: err });
          });
        }

        // 3. 기존 질문 삭제
        const deleteQuestionsQuery = 'DELETE FROM questions WHERE surveyId = ?';
        db.query(deleteQuestionsQuery, [surveyId], (err) => {
          if (err) {
            return db.rollback(() => {
              res.status(500).json({ success: false, error: err });
            });
          }

          // 4. 새 질문 삽입
          let completedQuestions = 0;
          questions.forEach((q) => {
            db.query(
              'INSERT INTO questions (surveyId, type, question, isRequired) VALUES (?, ?, ?, ?)',
              [surveyId, q.type, q.question, q.isRequired ? 1 : 0],
              (err, qResult) => {
                if (err) {
                  return db.rollback(() => {
                    res.status(500).json({ success: false, error: err });
                  });
                }

                if (q.options && q.options.length > 0) {
                  let completedOptions = 0;
                  q.options.forEach((opt) => {
                    db.query(
                      'INSERT INTO options (questionId, optionText) VALUES (?, ?)',
                      [qResult.insertId, opt],
                      (err2) => {
                        if (err2) {
                          return db.rollback(() => {
                            res.status(500).json({ success: false, error: err2 });
                          });
                        }
                        completedOptions++;
                        
                        if (completedOptions === q.options.length) {
                          completedQuestions++;
                          if (completedQuestions === questions.length) {
                            db.commit((err) => {
                              if (err) {
                                return db.rollback(() => {
                                  res.status(500).json({ success: false, error: err });
                                });
                              }
                              res.json({ success: true, message: '설문지가 성공적으로 수정되었습니다.' });
                            });
                          }
                        }
                      }
                    );
                  });
                } else {
                  completedQuestions++;
                  if (completedQuestions === questions.length) {
                    db.commit((err) => {
                      if (err) {
                        return db.rollback(() => {
                          res.status(500).json({ success: false, error: err });
                        });
                      }
                      res.json({ success: true, message: '설문지가 성공적으로 수정되었습니다.' });
                    });
                  }
                }
              }
            );
          });
        });
      });
    });
  });
});

// 설문지 삭제
app.delete('/api/surveys/:surveyId', (req, res) => {
  const { surveyId } = req.params;

  // 트랜잭션 시작
  db.beginTransaction((err) => {
    if (err) return res.status(500).json({ success: false, error: err });

    // 1. 응답 삭제
    const deleteResponsesQuery = 'DELETE FROM responses WHERE surveyId = ?';
    db.query(deleteResponsesQuery, [surveyId], (err) => {
      if (err) {
        return db.rollback(() => {
          res.status(500).json({ success: false, error: err });
        });
      }

      // 2. 옵션 삭제
      const deleteOptionsQuery = 'DELETE o FROM options o INNER JOIN questions q ON o.questionId = q.id WHERE q.surveyId = ?';
      db.query(deleteOptionsQuery, [surveyId], (err) => {
        if (err) {
          return db.rollback(() => {
            res.status(500).json({ success: false, error: err });
          });
        }

        // 3. 질문 삭제
        const deleteQuestionsQuery = 'DELETE FROM questions WHERE surveyId = ?';
        db.query(deleteQuestionsQuery, [surveyId], (err) => {
          if (err) {
            return db.rollback(() => {
              res.status(500).json({ success: false, error: err });
            });
          }

          // 4. 설문지 삭제
          const deleteSurveyQuery = 'DELETE FROM surveys WHERE id = ?';
          db.query(deleteSurveyQuery, [surveyId], (err) => {
            if (err) {
              return db.rollback(() => {
                res.status(500).json({ success: false, error: err });
              });
            }

            db.commit((err) => {
              if (err) {
                return db.rollback(() => {
                  res.status(500).json({ success: false, error: err });
                });
              }
              res.json({ success: true, message: '설문지가 성공적으로 삭제되었습니다.' });
            });
          });
        });
      });
    });
  });
});

// 설문지 응답 제출 (인증 필요)
app.post('/api/surveys/:surveyId/responses', verifyToken, (req, res) => {
  const { surveyId } = req.params;
  const { answers } = req.body;
  const userId = req.user.userId; // 토큰에서 userId 가져오기

  if (!answers || !Array.isArray(answers)) {
    return res.status(400).json({ success: false, message: 'answers 배열이 필요합니다.' });
  }

  let completedAnswers = 0;
  const totalAnswers = answers.length;

  if (totalAnswers === 0) {
    return res.status(400).json({ success: false, message: '최소 하나의 답변이 필요합니다.' });
  }

  // 각 답변에 userId를 추가하여 DB에 저장
  answers.forEach((a) => {
    db.query(
      'INSERT INTO responses (surveyId, questionId, answer, userId) VALUES (?, ?, ?, ?)',
      [surveyId, a.questionId, a.answer, userId],
      (err) => {
        if (err) {
          console.error('응답 저장 오류:', err);
          // 여기서 return을 하면 forEach 루프만 종료되므로, 전체 응답에 대한 처리가 필요
          // 하지만 현재 구조에서는 각 쿼리가 비동기라 에러 처리가 복잡함.
          // 일단 개별적으로 에러를 로깅만 함.
          return;
        }
        
        completedAnswers++;
        if (completedAnswers === totalAnswers) {
          res.json({ success: true, message: '응답 제출 완료' });
        }
      }
    );
  });
});

// 설문지 응답 결과 조회
app.get('/api/surveys/:surveyId/results', (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ success: false, message: '토큰 없음' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ success: false, message: '토큰 형식 오류' });
  }

  try {
    jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(403).json({ success: false, message: '유효하지 않은 토큰' });
  }

  const { surveyId } = req.params;

  const sql = `
    SELECT 
      q.id as questionId, 
      q.type, 
      q.question, 
      r.answer
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
        formatted[row.questionId] = { 
          question: row.question, 
          type: row.type,
          summary: {}, 
          comments: [] 
        };
      }
      
      if (row.answer) {
        if (row.type === 'multiple-choice') {
          formatted[row.questionId].summary[row.answer] = (formatted[row.questionId].summary[row.answer] || 0) + 1;
        } else {
          formatted[row.questionId].comments.push(row.answer);
        }
      }
    });

    res.json({ 
      success: true, 
      surveyId: Number(surveyId), 
      results: Object.values(formatted) 
    });
  });
});
