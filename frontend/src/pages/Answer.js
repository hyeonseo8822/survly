import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './css/Create.css'; 
import NavBar2 from '../components/NavBar2';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts"; // 차트 라이브러리
import './css/Answer.css';


function Answer() {
  const [active, setActive] = useState("answer"); // 현재 활성화된 탭 ('answer' 또는 'responses')
  const [loading, setLoading] = useState(false); // 로딩 상태
  const [error, setError] = useState(null); // 에러 상태
  const [survey, setSurvey] = useState(null); // 불러온 설문 데이터
  const [userAnswers, setUserAnswers] = useState({}); // 사용자가 입력한 답변
  const [responses, setResponses] = useState([]); // 설문 결과 데이터
  const [isCreator, setIsCreator] = useState(false); // 현재 사용자가 설문 작성자인지 여부

  const { id, link } = useParams(); // URL 파라미터에서 id 또는 link 추출
  const navigate = useNavigate();

  useEffect(() => {
    if (id) { // URL에 id 파라미터가 있을 경우
      const token = localStorage.getItem('token');
      if (!token) {
        alert('로그인이 필요합니다. 로그인 페이지로 이동합니다.');
        navigate('/login');
      }
    }
  }, [id, navigate]); // id나 navigate 함수가 변경될 때 실행

  // Effect 2: 설문 데이터 불러오기
  // id 또는 link가 변경되면 해당 설문 정보를 서버에서 가져옵니다.
  useEffect(() => {
    const fetchSurvey = async () => {
      setLoading(true);
      setError(null);
      let url = '';
      if (link) { // 비공개 링크로 접근한 경우
        url = `http://localhost:5000/api/s/${link}`;
      } else if (id) { // 설문 ID로 접근한 경우
        url = `http://localhost:5000/api/surveys/${id}`;
      } else {
        setLoading(false);
        return; // id와 link 모두 없으면 실행 중단
      }

      try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.success) {
          setSurvey(data.survey);
          // 설문 작성자와 현재 로그인한 사용자가 동일한지 확인
          const loggedInUserId = localStorage.getItem('userId');
          if (loggedInUserId && data.survey.userId === loggedInUserId) {
            setIsCreator(true);
          }
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
  }, [id, link, navigate]); // id, link, navigate가 변경될 때마다 실행

  // Effect 3: '응답' 탭 활성화 시 결과 데이터 불러오기
  useEffect(() => {
    const loadResponseData = async () => {
      if (!survey?.id) return; // 설문 ID가 없으면 중단
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`http://localhost:5000/api/surveys/${survey.id}/results`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } // 결과 조회는 인증 필요
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
  }, [active, survey?.id]); // active 탭이나 survey.id가 변경될 때 실행

  // --- Event Handlers ---

  /**
   * @function handleAnswerChange
   * @description 사용자가 답변을 입력/선택할 때마다 userAnswers state를 업데이트합니다.
   * @param {number} questionId - 질문 ID
   * @param {string} value - 입력/선택된 값
   */
  const handleAnswerChange = (questionId, value) => {
    setUserAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  /**
   * @async
   * @function submitAnswer
   * @description '제출' 버튼 클릭 시 실행됩니다. 필수 질문 검증 후 서버에 답변을 전송합니다.
   */
  const submitAnswer = async () => {
    if (loading || !survey?.id) return;

    // 필수 질문(isRequired)에 모두 답변했는지 검증
    for (const q of survey.questions) {
      if (q.isRequired === 1) {
        const answer = userAnswers[q.questionId];
        if (!answer || (typeof answer === 'string' && answer.trim() === '')) {
          alert(`'${q.question}'은(는) 필수 질문입니다. 답변을 입력해주세요.`);
          return; // 검증 실패 시 제출 중단
        }
      }
    }

    try {
      setLoading(true);
      setError(null);
      const answersToSubmit = Object.keys(userAnswers).map(questionId => ({ questionId, answer: userAnswers[questionId] }));
      const token = localStorage.getItem('token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) { // 로그인 상태이면 Authorization 헤더 추가
        headers['Authorization'] = `Bearer ${token}`;
      }
      const response = await fetch(`http://localhost:5000/api/surveys/${survey.id}/responses`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ answers: answersToSubmit })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || '답변 제출에 실패했습니다.');
      if (result.success) {
        alert('답변이 성공적으로 제출되었습니다!');
        navigate('/'); // 제출 성공 시 홈으로 이동
      } else {
        throw new Error(result.message || '답변 제출에 실패했습니다.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // '응답' 탭을 보여줄지 결정하는 로직
  // 공개 설문(link가 null)이거나, 비공개 설문이면서 현재 사용자가 작성자일 경우에만 true
  const showResponseTab = survey && survey.link === null ? true : (!link && isCreator);


  // 초기 로딩 중일 때
  if (loading && !survey) return <div className='container'><p>로딩 중...</p></div>;
  // 에러 발생 시
  if (error && active !== 'responses') return <div className='container'><p>오류: {error}</p></div>;

  return (
    <div className="answer-container">
      <NavBar2
        active={active}
        setActive={setActive}
        onButtonClick={submitAnswer}
        loading={loading}
        buttonText="제출"
        tab1Text="답변"
        showResponseTab={showResponseTab}
        showButton={active !== 'responses'} // '응답' 탭에서는 제출 버튼 숨김
      />
      {/* '응답' 탭에서 발생한 에러는 탭 안에 표시 */}
      {error && active === 'responses' && <div className='error-message'>{error}</div>}
      
      {/* '답변' 탭 뷰 */}
      {active === 'answer' && survey && (
        <div className='answerContentWrapper'>
          <div className="answer-title-box">
            <div className="answer-title">{survey.title}</div>
            <div className="answer-description">{survey.description}</div>
          </div>
          {survey.questions.map((q) => (
            <div key={q.questionId} className='result-item-box'>
              <h4>
                {q.question}
                {q.isRequired === 1 && <span style={{ color: 'red' }}> *</span>}
              </h4>
              {/* 객관식 질문 */}
              {q.type === 'multiple-choice' && (
                <div className='radioOptions'>
                  {q.options.map((opt, idx) => (
                    <div key={idx} className='radio-option-container'>
                      <input type='radio' name={`answer-${q.questionId}`} value={opt} onChange={(e) => handleAnswerChange(q.questionId, e.target.value)} />
                      <label>{opt}</label>
                    </div>
                  ))}
                </div>
              )}
              {/* 주관식 질문 */}
              {q.type === 'text' && (
                <div className='subjectiveInput'>
                  <input type='text' placeholder='답변을 입력하세요' onChange={(e) => handleAnswerChange(q.questionId, e.target.value)} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* '응답' 탭 뷰 */}
      {active === 'responses' && survey && (
        <div className='answerContentWrapper'>
          {loading ? (
            <p className="loading-message">응답을 불러오는 중...</p>
          ) : responses.length === 0 ? (
            <p className="no-responses-message">아직 응답이 없습니다.</p>
          ) : (
            <>
              <div className="answer-title-box">
                <div className="answer-title">{survey.title}</div>
                <div className="answer-description">{survey.description}</div>
              </div>
              {responses.map((result, idx) => (
                <div key={idx} className='result-item-box'>
                  <h4>{result.question}</h4>
                  {/* 객관식 결과: 차트로 표시 */}
                  {result.summary && Object.keys(result.summary).length > 0 ? (
                    <div style={{ width: "95%", height: 250, margin: '20px auto' }}>
                      <strong>객관식 응답 통계:</strong>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={Object.entries(result.summary).map(([answer, count]) => ({ answer, count: Number(count) }))} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="answer" />
                          <YAxis allowDecimals={false} />
                          <Tooltip />
                          <Bar dataKey="count" fill="#6AB9FF" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : /* 주관식 결과: 목록으로 표시 */
                  result.comments && result.comments.length > 0 ? (
                    <div>
                      <strong>주관식 응답:</strong>
                      <ul className="text-answers-list">
                        {result.comments.map((comment, commentIdx) => <li key={commentIdx}>{comment}</li>)}
                      </ul>
                    </div>
                  ) : (
                    <p>아직 응답이 없습니다.</p>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default Answer;