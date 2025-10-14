import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './css/Create.css';
import NavBar2 from '../components/NavBar2'; // NavBar는 추후 수정

function Answer() {
  const [active, setActive] = useState("answer"); // 기본 탭을 '답변'으로
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [survey, setSurvey] = useState(null);
  const [userAnswers, setUserAnswers] = useState({}); // 사용자 답변 저장
  const [responses, setResponses] = useState([]); // 다른 사람들의 응답 결과

  const { id } = useParams();
  const navigate = useNavigate();

  // 설문 데이터 로드
  useEffect(() => {
    const fetchSurvey = async () => {
      setLoading(true);
      try {
        const response = await fetch(`http://localhost:5000/api/surveys/${id}`);
        const data = await response.json();
        if (data.success) {
          setSurvey(data.survey);
        } else {
          throw new Error(data.message || '설문을 불러오지 못했습니다.');
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchSurvey();
  }, [id]);

  // '응답' 탭 활성화 시 다른 사람들의 응답 결과 로드
  useEffect(() => {
    const loadResponseData = async () => {
      if (!id) return;
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`http://localhost:5000/api/surveys/${id}/results`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        const data = await response.json();
        if (data.success) {
          setResponses(data.results);
        } else {
          setError(data.message || '응답을 불러오는 중 오류가 발생했습니다.');
        }
      } catch (err) {
        setError('응답을 불러오는 중 오류가 발생했습니다: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    if (active === 'responses') {
      loadResponseData();
    }
  }, [active, id]);

  const handleAnswerChange = (questionId, value) => {
    setUserAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  // 답변 제출 함수
  const submitAnswer = async () => {
    if (loading) return;

    // 로그인 상태 확인
    const token = localStorage.getItem('token');
    if (!token) {
      alert('답변을 제출하려면 로그인이 필요합니다.');
      navigate('/login');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const answersToSubmit = Object.keys(userAnswers).map(questionId => ({
        questionId: parseInt(questionId),
        answer: userAnswers[questionId]
      }));

      const response = await fetch(`http://localhost:5000/api/surveys/${id}/responses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ answers: answersToSubmit })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || '답변 제출에 실패했습니다.');
      }

      if (result.success) {
        alert('답변이 성공적으로 제출되었습니다!');
        setActive('responses'); // 제출 후 응답 탭으로 이동
      } else {
        throw new Error(result.message || '답변 제출에 실패했습니다.');
      }

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !survey) {
    return <div className='container'><p>로딩 중...</p></div>;
  }

  if (error) {
    return <div className='container'><p>오류: {error}</p></div>;
  }

  return (
    <>
      <style>{`
        .titleInput .title {
          font-size: 36px;
          font-weight: 700;
          padding-bottom: 15px;
          border-bottom: 2px solid #eee;
        }
        .titleInput .explain {
          font-size: 18px;
          color: #555;
          margin-top: 10px;
        }
        .questionbox p {
          font-size: 22px;
          font-weight: 600;
        }
        .radio-option-container label {
          font-size: 18px;
        }
        .subjectiveInput input {
          font-size: 18px;
        }
        .answerContent h3 {
          font-size: 24px;
          font-weight: 600;
          margin-bottom: 20px;
        }
        .answerContent .survey-result-item {
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 20px;
          background-color: #f9f9f9;
        }
        .answerContent .survey-result-item h4 {
          font-size: 20px;
          font-weight: 600;
          border-bottom: 1px solid #eee;
          padding-bottom: 10px;
          margin-bottom: 15px;
        }
      `}</style>
      <div className='container'>
        <NavBar2 
          active={active} 
          setActive={setActive} 
          onButtonClick={submitAnswer} 
          loading={loading} 
          buttonText="제출"
          tab1Text="답변"
        />
        
        {error && (
          <div className='error-message'>
            {error}
          </div>
        )}

        {active === 'answer' && survey && (
          <div className='createContentWrapper'>
            <div className='titleBox'>
              <div className='titleInput'>
                <div className='title'>{survey.title}</div>
                <div className='explain'>{survey.description}</div>
              </div>
            </div>

            {survey.questions.map((q, qIdx) => (
              <div key={q.questionId} className='createContent'>
                <div className='content'>
                  <div className='questionContent'>
                    <div className='questionNav'>
                      <div className='questionbox'>
                        <p>{q.question}</p>
                      </div>
                    </div>

                    {q.type === 'multiple-choice' && (
                      <div className='radioOptions'>
                        {q.options.map((opt, idx) => (
                          <div key={idx} className='radio-option-container'>
                            <input 
                              type='radio' 
                              name={`answer-${q.questionId}`}
                              value={opt}
                              onChange={(e) => handleAnswerChange(q.questionId, e.target.value)}
                            />
                            <label>{opt}</label>
                          </div>
                        ))}
                      </div>
                    )}

                    {q.type === 'text' && (
                      <div className='subjectiveInput'>
                        <input 
                          type='text' 
                          placeholder='답변을 입력하세요' 
                          onChange={(e) => handleAnswerChange(q.questionId, e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {active === 'responses' && (
           <div className='answerContent'>
           {loading ? (
             <p>응답을 불러오는 중...</p>
           ) : responses.length === 0 ? (
             <p>응답이 아직 없습니다.</p>
           ) : (
             <div>
               <h3>설문 결과</h3>
               {responses.map((result, idx) => (
                 <div key={idx} className='survey-result-item'>
                   <h4>{result.question}</h4>
                   {Object.keys(result.summary).length > 0 ? (
                     <div>
                       <strong>객관식 응답 통계:</strong>
                       <ul>
                         {Object.entries(result.summary).map(([answer, count]) => (
                           <li key={answer}>
                             {answer}: {count}개
                           </li>
                         ))}
                       </ul>
                     </div>
                   ) : (
                     <div>
                       <strong>주관식 응답:</strong>
                       <ul>
                         {result.comments.map((comment, commentIdx) => (
                           <li key={commentIdx}>{comment}</li>
                         ))}
                       </ul>
                     </div>
                   )}
                 </div>
               ))}
             </div>
           )}
         </div>
        )}
      </div>
    </>
  );
}

export default Answer;
