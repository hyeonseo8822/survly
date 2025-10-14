import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './css/Create.css';
import NavBar2 from '../components/NavBar2';

function Create() {
  const [active, setActive] = useState("question");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [surveyId, setSurveyId] = useState(null);
  
  const { id } = useParams(); 
  const navigate = useNavigate();
  const titleRef = useRef(null);
  const explainRef = useRef(null);
  const questionRef = useRef(null);

  // 설문지 기본 정보
  const [surveyInfo, setSurveyInfo] = useState({
    title: '',
    description: '',
  });

  const [questions, setQuestions] = useState([
    { questionType: "objective", options: ["옵션 1"], isOn: false, question: '' }
  ]);

  const [responses, setResponses] = useState([]);

  const autoResize = (ref) => {
    if (ref.current) {
      ref.current.style.height = 'auto';
      ref.current.style.height = ref.current.scrollHeight + 'px';
    }
  };

  // 로그인 상태 확인 함수
  const checkAuthToken = () => {
    const token = localStorage.getItem('token');
    return token && token.trim() !== '';
  };

  // 컴포넌트 마운트 시 수정 모드인지 확인
  useEffect(() => {
    if (id) {
      setSurveyId(id);
    }
  }, [id]);

  useEffect(() => {
    autoResize(titleRef);
    autoResize(explainRef);
    autoResize(questionRef);
  }, []);

  // 응답 탭 활성화 시 데이터 로드
  useEffect(() => {
    const loadResponseData = async () => {
      if (!surveyId) return;
      
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`http://localhost:5000/api/surveys/${surveyId}/results`, {
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

    if (active === 'answer' && surveyId) {
      loadResponseData();
    }
  }, [active, surveyId]);

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        questionType: "objective",
        options: ["옵션 1"],
        isOn: false,
        question: '',
      },
    ]);
  };

  // 옵션 수정 함수
  const updateOption = (qIdx, optIdx, newValue) => {
    const newQ = [...questions];
    newQ[qIdx].options[optIdx] = newValue;
    setQuestions(newQ);
  };

  // 옵션 삭제 함수
  const deleteOption = (qIdx, optIdx) => {
    const newQ = [...questions];
    if (newQ[qIdx].options.length > 1) {
      newQ[qIdx].options.splice(optIdx, 1);
      setQuestions(newQ);
    }
  };

  // 설문지 저장/게시 (NavBar2의 게시 버튼에서 호출)
  const saveSurvey = async () => {
    if (loading) return; // 이미 로딩 중이면 중복 실행 방지

    // 로그인 상태 확인
    if (!checkAuthToken()) {
      alert('로그인이 필요합니다. 먼저 로그인해 주세요.');
      navigate('/login'); 
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // 유효성 검사
      if (!surveyInfo.title.trim()) {
        throw new Error('설문지 제목을 입력해주세요.');
      }

      if (questions.some(q => !q.question.trim())) {
        throw new Error('모든 질문을 입력해주세요.');
      }

      if (questions.some(q => q.questionType === 'objective' && q.options.some(opt => !opt.trim()))) {
        throw new Error('모든 옵션을 입력해주세요.');
      }

      // API 요청 데이터 준비
      const surveyData = {
        title: surveyInfo.title,
        description: surveyInfo.description || '',
        isPublic: true,
        questions: questions.map(q => ({
          type: q.questionType === 'objective' ? 'multiple-choice' : 'text',
          question: q.question,
          options: q.questionType === 'objective' ? q.options.filter(opt => opt.trim() !== '') : null,
          isRequired: q.isOn
        }))
      };

      // API 호출
      const response = await fetch('http://localhost:5000/api/surveys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(surveyData)
      });

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('token');
        alert('로그인이 만료되었습니다. 다시 로그인해 주세요.');
        navigate('/login');
        return;
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || `HTTP error! status: ${response.status}`);
      }

      if (result.success) {
        navigate('/'); // 성공 시 바로 홈으로 이동
      } else {
        throw new Error(result.message || '설문지 게시에 실패했습니다.');
      }

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 에러 메시지 자동 숨김
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  return (
    <div className='container'>
      <NavBar2 
        active={active} 
        setActive={setActive} 
        onButtonClick={saveSurvey} 
        loading={loading} 
        buttonText="게시"
        tab1Text="질문"
      />
      
      {error && (
        <div className='error-message'>
          {error}
        </div>
      )}

      {active === "answer" && (
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

      {active === "question" && (
        <div className='createContentWrapper'>
          <div className='titleBox'>
            <div className='titleInput'>
              <div className='title'>
                <textarea
                  ref={titleRef}
                  placeholder='제목 없는 설문지'
                  value={surveyInfo.title}
                  onInput={(e) => {
                    setSurveyInfo(prev => ({
                      ...prev,
                      title: e.target.value
                    }));
                    autoResize(titleRef);
                  }}
                />
              </div>
              <div className='explain'>
                <textarea
                  ref={explainRef}
                  placeholder='설문지 설명'
                  value={surveyInfo.description}
                  onInput={(e) => {
                    setSurveyInfo(prev => ({
                      ...prev,
                      description: e.target.value
                    }));
                    autoResize(explainRef);
                  }}
                />
              </div>
            </div>
          </div>

          {questions.map((q, qIdx) => (
            <div key={qIdx} className='createContent'>
              <div className='content'>
                <div className='questionContent'>
                  <div className='questionNav'>
                    <div className='questionbox'>
                      <textarea
                        placeholder='제목 없는 질문'
                        value={q.question}
                        onInput={(e) => {
                          const newQ = [...questions];
                          newQ[qIdx].question = e.target.value;
                          setQuestions(newQ);
                        }}
                      />
                    </div>
                    <div className='selectType'>
                      <select
                        value={q.questionType}
                        onChange={(e) => {
                          const newQ = [...questions];
                          newQ[qIdx].questionType = e.target.value;
                          if (e.target.value === 'objective' && (!newQ[qIdx].options || newQ[qIdx].options.length === 0)) {
                            newQ[qIdx].options = ['옵션 1'];
                          }
                          setQuestions(newQ);
                        }}
                      >
                        <option value='objective'>객관식</option>
                        <option value='subjective'>주관식</option>
                      </select>
                    </div>
                  </div>

                  {q.questionType === 'objective' && (
                    <div className='radioOptions'>
                      {q.options.map((opt, idx) => (
                        <div key={idx} className='radio-option-container'>
                          <input type='radio' name={`answer-${qIdx}`} disabled />
                          <input
                            type='text'
                            value={opt}
                            onChange={(e) => updateOption(qIdx, idx, e.target.value)}
                            className='radio-option-input'
                          />
                          {q.options.length > 1 && (
                            <button
                              onClick={() => deleteOption(qIdx, idx)}
                              className='delete-option-button'
                            >
                              ×
                            </button>
                          )}
                        </div>
                      ))}
                      <label
                        className='additionalOption add-option-label'
                        onClick={() => {
                          const newQ = [...questions];
                          newQ[qIdx].options.push(`옵션 ${newQ[qIdx].options.length + 1}`);
                          setQuestions(newQ);
                        }}
                      >
                        옵션 추가
                      </label>
                    </div>
                  )}

                  {q.questionType === 'subjective' && (
                    <div className='subjectiveInput'>
                      <input type='text' disabled placeholder='답변' />
                    </div>
                  )}

                  <div className='lineBox'></div>
                  <div className='contentBottom'>
                    <div className='delImg'>
                      <img
                        src={`${process.env.PUBLIC_URL}/img/delete.svg`}
                        alt='delete'
                        onClick={() => {
                          if (questions.length > 1) {
                            const newQ = questions.filter((_, i) => i !== qIdx);
                            setQuestions(newQ);
                          }
                        }}
                        className={`delete-question-image ${questions.length > 1 ? '' : 'disabled'}`}
                      />
                    </div>
                    <div className='lengthLine'></div>
                    <div className='essential'>
                      <p>필수</p>
                      <div
                        className={`switch ${q.isOn ? "on" : ""}`}
                        onClick={() => {
                          const newQ = [...questions];
                          newQ[qIdx].isOn = !newQ[qIdx].isOn;
                          setQuestions(newQ);
                        }}
                      >
                        <div className={`slider ${q.isOn ? "on" : ""}`}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          <div className='plusImg' onClick={addQuestion}>
            <img src={`${process.env.PUBLIC_URL}/img/plus.svg`} alt='plus' />
          </div>
        </div>
      )}
    </div>
  );
}

export default Create;