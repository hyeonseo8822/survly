import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './css/Create.css';
import NavBar2 from '../components/NavBar2';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";
import './css/Answer.css';

function Answer() {
  const [active, setActive] = useState("answer");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [survey, setSurvey] = useState(null);
  const [userAnswers, setUserAnswers] = useState({});
  const [responses, setResponses] = useState([]);
  const [isCreator, setIsCreator] = useState(false);

  const { id, link } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (id) {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('로그인이 필요합니다. 로그인 페이지로 이동합니다.');
        navigate('/login');
      }
    }
  }, [id, navigate]);

  useEffect(() => {
    const fetchSurvey = async () => {
      setLoading(true);
      setError(null);
      let url = '';
      if (link) {
        url = `http://localhost:5000/api/s/${link}`;
      } else if (id) {
        url = `http://localhost:5000/api/surveys/${id}`;
      } else {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.success) {
          setSurvey(data.survey);
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
  }, [id, link, navigate]);

  useEffect(() => {
    const loadResponseData = async () => {
      if (!survey?.id) return;
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`http://localhost:5000/api/surveys/${survey.id}/results`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
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
  }, [active, survey?.id]);

  const handleAnswerChange = (questionId, value) => {
    setUserAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const submitAnswer = async () => {
    if (loading || !survey?.id) return;
    try {
      setLoading(true);
      setError(null);
      const answersToSubmit = Object.keys(userAnswers).map(questionId => ({ questionId: parseInt(questionId), answer: userAnswers[questionId] }));
      const token = localStorage.getItem('token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) {
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
        if (isCreator) {
          setActive('responses');
        } else {
          setUserAnswers({});
        }
      } else {
        throw new Error(result.message || '답변 제출에 실패했습니다.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const showResponseTab = isCreator && !link;

  if (loading && !survey) return <div className='container'><p>로딩 중...</p></div>;
  if (error) return <div className='container'><p>오류: {error}</p></div>;

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
      />
      {error && <div className='error-message'>{error}</div>}
      {active === 'answer' && survey && (
        <div className='createContentWrapper'>
          <div className='titleBox'>
            <div className='titleInput'>
              <div className='title'>{survey.title}</div>
              <div className='explain'>{survey.description}</div>
            </div>
          </div>
          {survey.questions.map((q) => (
            <div key={q.questionId} className='createContent'>
              <div className='content'>
                <div className='questionContent'>
                  <div className='questionNav'>
                    <div className='questionbox'><p>{q.question}</p></div>
                  </div>
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
                  {q.type === 'text' && (
                    <div className='subjectiveInput'>
                      <input type='text' placeholder='답변을 입력하세요' onChange={(e) => handleAnswerChange(q.questionId, e.target.value)} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {active === 'responses' && survey && (
        <div className='answerContentWrapper'>
          <div className="answer-title-box">
            <div className="answer-title">{survey.title}</div>
            <div className="answer-description">{survey.description}</div>
          </div>
          {loading ? <p className="loading-message">응답을 불러오는 중...</p> : responses.length === 0 ? <p className="loading-message">응답이 아직 없습니다.</p> : (
            <>
              {responses.map((result, idx) => (
                <div key={idx} className='result-item-box'>
                  <h4>{result.question}</h4>
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
                  ) : (
                    <div>
                      <strong>주관식 응답:</strong>
                      <ul className="text-answers-list">
                        {result.comments.map((comment, commentIdx) => <li key={commentIdx}>{comment}</li>)}
                      </ul>
                    </div>
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