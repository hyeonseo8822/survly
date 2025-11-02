import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './css/Create.css';
import NavBar2 from '../components/NavBar2';

function Create() {
  const [active, setActive] = useState("question");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [surveyId, setSurveyId] = useState(null);
  const [currentSurveyId, setCurrentSurveyId] = useState(null); // New state variable
  const [selectedImage, setSelectedImage] = useState(null); // 선택된 이미지 파일
  const [imagePreview, setImagePreview] = useState(null); // 이미지 미리보기 URL
  const [existingImage, setExistingImage] = useState(null); // 기존 이미지 파일명 (수정 모드)
  const [shouldRemoveExistingImage, setShouldRemoveExistingImage] = useState(false); // 기존 이미지 삭제 여부
  
  const { id } = useParams(); // survey ID for editing
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

  // 컴포넌트 마운트 시 로그인 상태 확인 및 수정 모드 데이터 로드
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('로그인이 필요합니다. 로그인 페이지로 이동합니다.');
      navigate('/login');
      return;
    }

    console.log('Create.js - useParams id:', id); // Debugging line

    if (id) { // Edit mode
      setSurveyId(id);
      setCurrentSurveyId(id); // Set the new state variable
      const fetchSurveyForEdit = async () => {
        setLoading(true);
        try {
          const response = await fetch(`http://localhost:5000/api/surveys/${id}`);
          if (!response.ok) {
            throw new Error('설문 데이터를 불러오는데 실패했습니다.');
          }
          const result = await response.json();
          if (result.success) {
            const fetchedSurvey = result.survey;
            setSurveyInfo({
              title: fetchedSurvey.title,
              description: fetchedSurvey.description,
            });
            setQuestions(fetchedSurvey.questions.map(q => ({
              questionType: q.type === 'multiple-choice' ? 'objective' : 'subjective',
              options: q.options || [],
              isOn: q.isRequired === 1,
              question: q.question,
            })));
            // 기존 이미지 설정
            if (fetchedSurvey.img && fetchedSurvey.img !== 'default_img') {
              setExistingImage(`http://localhost:5000/uploads/${fetchedSurvey.img}`);
            }
          } else {
            throw new Error(result.message || '설문 데이터를 불러오는데 실패했습니다.');
          }
        } catch (err) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      };
      fetchSurveyForEdit();
    }
  }, [id, navigate]);

  useEffect(() => {
    autoResize(titleRef);
    autoResize(explainRef);
    autoResize(questionRef);
  }, [surveyInfo, questions]); // Re-run autoResize when surveyInfo or questions change

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
    };
  };

  // 이미지 선택 핸들러
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
      setExistingImage(null); // 새 이미지 선택 시 기존 이미지 제거
      setShouldRemoveExistingImage(false); // 새 이미지 선택 시 삭제 플래그 초기화
    } else {
      setSelectedImage(null);
      setImagePreview(null);
    }
  };

  // 설문지 저장/게시/수정 (NavBar2의 버튼에서 호출)
  const saveSurvey = async () => {
    // 로그인 상태 확인
    if (!checkAuthToken()) {
      alert('로그인이 필요합니다. 먼저 로그인해 주세요.');
      navigate('/login'); 
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      // 유효성 검사
      if (!surveyInfo.title || surveyInfo.title.trim() === '') {
        alert('설문지 제목을 입력해주세요.');
        return;
      }

      if (questions.some(q => !q.question || q.question.trim() === '')) {
        alert('모든 질문을 입력해주세요.');
        return;
      }

      if (questions.some(q => q.questionType === 'objective' && (!q.options || q.options.some(opt => !opt || opt.trim() === '')))) {
        alert('모든 옵션을 입력해주세요.');
        return;
      }

      // FormData 준비
      const formData = new FormData();
      formData.append('title', surveyInfo.title);
      formData.append('description', surveyInfo.description || '');
      formData.append('questions', JSON.stringify(questions.map(q => ({
        type: q.questionType === 'objective' ? 'multiple-choice' : 'text',
        question: q.question,
        options: q.questionType === 'objective' ? q.options.filter(opt => opt.trim() !== '') : null,
        isRequired: q.isOn
      }))));

      if (selectedImage) {
        formData.append('surveyImage', selectedImage);
      } else if (shouldRemoveExistingImage) {
        // 기존 이미지를 삭제하기로 했다면 default_img로 설정
        formData.append('img', 'default_img');
      } else if (existingImage) {
        // 새 이미지가 없고 기존 이미지가 있다면 기존 이미지 파일명을 보냄
        formData.append('img', existingImage.split('/').pop()); // URL에서 파일명만 추출
      } else {
        // 이미지가 없고 기존 이미지도 없다면 default_img로 설정
        formData.append('img', 'default_img');
      }

      let method = 'POST';
      let url = 'http://localhost:5000/api/surveys';

      if (currentSurveyId) { // Use currentSurveyId here
        method = 'PUT';
        url = 'http://localhost:5000/api/surveys/' + currentSurveyId;
      } else { // Create mode
        const isPublic = window.confirm('이 설문을 공개하시겠습니까? 공개 설문은 메인 페이지에 노출됩니다.');
        formData.append('isPublic', isPublic ? 1 : 0);
      }

      console.log('saveSurvey - Method:', method); // Debugging line
      console.log('saveSurvey - URL:', url);     // Debugging line

      // API 호출
      const response = await fetch(url, {
        method: method,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData // FormData 사용
      });

      const result = await response.json();

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('token');
        alert('로그인이 만료되었습니다. 다시 로그인해 주세요.');
        navigate('/login');
        return;
      }

      if (!response.ok) {
        throw new Error(result.message || `HTTP error! status: ${response.status}`);
      }

      if (result.success) {
        setSurveyId(result.surveyId || currentSurveyId); // For edit, surveyId is already known

                  if (method === 'POST') {
                    if (formData.get('isPublic') === '1') { // FormData에서 isPublic 값 확인
                      setSuccess('설문지가 성공적으로 게시되었습니다!');
                      navigate('/'); // 즉시 메인 페이지로 이동
                    } else {
                      const shareableLink = `${window.location.origin}/s/${result.link}`;
                      setSuccess(`비공개 설문이 생성되었습니다! 다음 링크를 공유하세요: ${shareableLink}`);
                      navigate('/'); // 비공개 설문도 메인 페이지로 즉시 이동
                    }
                  } else { // PUT request
                    setSuccess('설문지가 성공적으로 수정되었습니다!');
                    setTimeout(() => {
                      navigate('/mypage'); // Go back to mypage after edit
                    }, 2000);
                  }      } else {
        throw new Error(result.message || '설문지 처리 중 오류가 발생했습니다.');
      }

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 에러/성공 메시지 자동 숨김
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  if (loading && !surveyId) {
    return (
      <div className='container'>
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <p>로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className='container'>
      <NavBar2 
        active={active} 
        setActive={setActive} 
        onButtonClick={saveSurvey} 
        showResponseTab={false}
        buttonText={currentSurveyId ? "수정" : "게시"} // Change button text based on mode
      />
      
      {/* 에러/성공 메시지 */}
      {error && (
        <div style={{ 
          backgroundColor: '#ffebee', 
          color: '#c62828', 
          padding: '10px', 
          margin: '10px 0', 
          borderRadius: '4px',
          textAlign: 'center'
        }}>
          {error}
        </div>
      )}
      
      {success && (
        <div style={{ 
          backgroundColor: '#e8f5e8', 
          color: '#2e7d32', 
          padding: '10px', 
          margin: '10px 0', 
          borderRadius: '4px',
          textAlign: 'center'
        }}>
          {success}
          <br />
          <small>잠시 후 {currentSurveyId ? "마이페이지" : "홈 페이지"}로 이동합니다...</small>
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

            {/* 이미지 업로드 섹션 */}
            <div className='image-upload-section'>
              <label htmlFor="surveyImageUpload" className="image-upload-button">이미지 등록</label>
              <input
                id="surveyImageUpload"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                style={{ display: 'none' }} // 기본 파일 입력 숨기기
              />
              {(imagePreview || existingImage) && (
                <div className='image-preview-container'>
                  <img 
                    src={imagePreview || existingImage}
                    alt="Survey Preview"
                    className="image-preview"
                  />
                  <button onClick={() => { 
                    setSelectedImage(null); 
                    setImagePreview(null); 
                    setExistingImage(null); 
                    setShouldRemoveExistingImage(true); 
                  }} className="remove-image-button">X</button>
                </div>
              )}
            </div>

          </div>

          {/* 질문들 */}
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

                  {/* 객관식 */}
                  {q.questionType === 'objective' && (
                    <div className='radioOptions'>
                      {q.options.map((opt, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                          <input type='radio' name={`answer-${qIdx}`} disabled />
                          <input
                            type='text'
                            value={opt}
                            onChange={(e) => updateOption(qIdx, idx, e.target.value)}
                            style={{
                              border: 'none',
                              borderBottom: '1px solid #ccc',
                              outline: 'none',
                              marginLeft: '8px',
                              padding: '4px',
                              flex: 1
                            }}
                          />
                          {q.options.length > 1 && (
                            <button
                              onClick={() => deleteOption(qIdx, idx)}
                              style={{
                                marginLeft: '10px',
                                background: 'none',
                                border: 'none',
                                color: '#dc3545',
                                cursor: 'pointer'
                              }}
                            >
                            </button>
                          )}
                        </div>
                      ))}
                      <label
                        className='additionalOption'
                        onClick={() => {
                          const newQ = [...questions];
                          newQ[qIdx].options.push(`옵션 ${newQ[qIdx].options.length + 1}`);
                          setQuestions(newQ);
                        }}
                        style={{ color: "#A0A0A0", cursor: "pointer" }}
                      >
                        옵션 추가
                      </label>
                    </div>
                  )}

                  {/* 주관식 */}
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
                        style={{ 
                          cursor: questions.length > 1 ? 'pointer' : 'not-allowed',
                          opacity: questions.length > 1 ? 1 : 0.5
                        }}
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

          {/* plus 버튼 */}
          <div className='plusImg' onClick={addQuestion}>
            <img src={`${process.env.PUBLIC_URL}/img/plus.svg`} alt='plus' />
          </div>
        </div>
      )}
    </div>
  );
}

export default Create;