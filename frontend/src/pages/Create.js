import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './css/Create.css';
import NavBar2 from '../components/NavBar2';


function Create() {
  const [active, setActive] = useState("question"); // 현재 활성화된 탭 (이 컴포넌트에서는 'question'만 사용)
  const [loading, setLoading] = useState(false); // API 요청 로딩 상태
  const [error, setError] = useState(null); // 에러 메시지
  const [success, setSuccess] = useState(null); // 성공 메시지
  const [surveyId, setSurveyId] = useState(null); // 생성 또는 수정된 설문의 ID
  const [currentSurveyId, setCurrentSurveyId] = useState(null); // 수정 모드일 때 현재 설문의 ID를 유지하기 위한 상태
  const [selectedImage, setSelectedImage] = useState(null); // 새로 선택된 이미지 파일 객체
  const [imagePreview, setImagePreview] = useState(null); // 새로 선택된 이미지의 미리보기 URL
  const [existingImage, setExistingImage] = useState(null); // 수정 모드에서 기존에 있던 이미지의 URL
  const [shouldRemoveExistingImage, setShouldRemoveExistingImage] = useState(false); // 기존 이미지를 삭제할지 여부

  const { id } = useParams(); // URL 파라미터에서 'id'를 가져옴 (수정 모드 식별용)
  const navigate = useNavigate();
  const titleRef = useRef(null); // 제목 textarea 참조
  const explainRef = useRef(null); // 설명 textarea 참조

  // 설문지 기본 정보 (제목, 설명)
  const [surveyInfo, setSurveyInfo] = useState({
    title: '',
    description: '',
  });

  // 질문 목록 상태
  const [questions, setQuestions] = useState([
    { questionType: "objective", options: ["옵션 1"], isOn: false, question: '' }
  ]);


  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('로그인이 필요합니다. 로그인 페이지로 이동합니다.');
      navigate('/login');
      return;
    }

    // 2. 수정 모드인 경우 (URL에 id가 있는 경우) 기존 설문 데이터 불러오기
    if (id) {
      setSurveyId(id);
      setCurrentSurveyId(id); // 현재 ID 설정
      const fetchSurveyForEdit = async () => {
        setLoading(true);
        try {
          const response = await fetch(`http://localhost:5000/api/surveys/${id}`);
          if (!response.ok) throw new Error('설문 데이터를 불러오는데 실패했습니다.');
          
          const result = await response.json();
          if (result.success) {
            const fetchedSurvey = result.survey;
            // 불러온 데이터로 상태 업데이트
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
  }, [id, navigate]); // id나 navigate가 변경될 때만 실행

  // Effect 2: textarea 자동 높이 조절
  useEffect(() => {
    autoResize(titleRef);
    autoResize(explainRef);
    // 질문 textarea는 map 안에 있어 ref를 직접 사용하기 어려우므로, 필요 시 각 질문마다 ref를 관리해야 함
  }, [surveyInfo, questions]); // surveyInfo나 questions가 변경될 때마다 높이 재계산

  // Effect 3: 에러/성공 메시지 자동 숨김
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 5000); // 5초 후에 메시지 숨김
      return () => clearTimeout(timer);
    }
  }, [error, success]);


  /**
   * @function autoResize
   * @description textarea의 내용에 따라 높이를 자동으로 조절합니다.
   * @param {React.RefObject} ref - 높이를 조절할 textarea의 ref
   */
  const autoResize = (ref) => {
    if (ref.current) {
      ref.current.style.height = 'auto'; // 높이를 초기화
      ref.current.style.height = ref.current.scrollHeight + 'px'; // 스크롤 높이만큼 설정
    }
  };

  /**
   * @function checkAuthToken
   * @description localStorage에 유효한 토큰이 있는지 확인합니다.
   * @returns {boolean} 토큰 존재 여부
   */
  const checkAuthToken = () => {
    const token = localStorage.getItem('token');
    return token && token.trim() !== '';
  };

  /**
   * @function addQuestion
   * @description 질문 목록에 새로운 기본 질문 객체를 추가합니다.
   */
  const addQuestion = () => {
    setQuestions([
      ...questions,
      { questionType: "objective", options: ["옵션 1"], isOn: false, question: '' },
    ]);
  };

  /**
   * @function updateOption
   * @description 특정 질문의 특정 옵션 내용을 변경합니다.
   * @param {number} qIdx - 질문 인덱스
   * @param {number} optIdx - 옵션 인덱스
   * @param {string} newValue - 새로운 옵션 값
   */
  const updateOption = (qIdx, optIdx, newValue) => {
    const newQ = [...questions];
    newQ[qIdx].options[optIdx] = newValue;
    setQuestions(newQ);
  };

  /**
   * @function deleteOption
   * @description 특정 질문에서 특정 옵션을 삭제합니다. 옵션이 하나만 남았을 때는 삭제하지 않습니다.
   * @param {number} qIdx - 질문 인덱스
   * @param {number} optIdx - 옵션 인덱스
   */
  const deleteOption = (qIdx, optIdx) => {
    const newQ = [...questions];
    if (newQ[qIdx].options.length > 1) {
      newQ[qIdx].options.splice(optIdx, 1);
      setQuestions(newQ);
    }
  };

  /**
   * @function handleImageChange
   * @description 파일 입력(input type="file")에서 이미지 파일을 선택했을 때 호출됩니다.
   *              이미지 파일과 미리보기 URL을 state에 저장합니다.
   */
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file); // 파일 객체 저장
      setImagePreview(URL.createObjectURL(file)); // 미리보기용 URL 생성
      setExistingImage(null); // 새 이미지 선택 시 기존 이미지 정보는 초기화
      setShouldRemoveExistingImage(false);
    } else {
      setSelectedImage(null);
      setImagePreview(null);
    }
  };

  /**
   * @async
   * @function saveSurvey
   * @description '게시' 또는 '수정' 버튼 클릭 시 호출됩니다.
   *              입력된 설문 정보를 유효성 검사 후 FormData에 담아 서버로 전송합니다.
   */
  const saveSurvey = async () => {
    if (!checkAuthToken()) {
      alert('로그인이 필요합니다. 먼저 로그인해 주세요.');
      navigate('/login');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      // 1. 유효성 검사
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

      // 2. FormData 생성 (파일과 텍스트를 함께 보내기 위함)
      const formData = new FormData();
      formData.append('title', surveyInfo.title);
      formData.append('description', surveyInfo.description || '');
      formData.append('questions', JSON.stringify(questions.map(q => ({
        type: q.questionType === 'objective' ? 'multiple-choice' : 'text',
        question: q.question,
        options: q.questionType === 'objective' ? q.options.filter(opt => opt.trim() !== '') : null,
        isRequired: q.isOn
      }))));

      // 3. 이미지 데이터 처리
      if (selectedImage) { // 새 이미지가 있으면
        formData.append('surveyImage', selectedImage);
      } else if (shouldRemoveExistingImage) { // 기존 이미지를 삭제하기로 했으면
        formData.append('img', 'default_img');
      } else if (existingImage) { // 새 이미지는 없지만 기존 이미지가 있으면
        formData.append('img', existingImage.split('/').pop()); // URL에서 파일명만 추출하여 전송
      } else { // 아무 이미지도 없으면
        formData.append('img', 'default_img');
      }

      // 4. API 요청 정보 설정 (생성 vs 수정)
      let method = 'POST';
      let url = 'http://localhost:5000/api/surveys';

      if (currentSurveyId) { // 수정 모드
        method = 'PUT';
        url = `http://localhost:5000/api/surveys/${currentSurveyId}`;
      } else { // 생성 모드
        const isPublic = window.confirm('이 설문을 공개하시겠습니까? 공개 설문은 메인 페이지에 노출됩니다.');
        formData.append('isPublic', isPublic ? 1 : 0);
      }

      // 5. API 호출
      const response = await fetch(url, {
        method: method,
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: formData
      });

      const result = await response.json();

      // 6. 응답 처리
      if (response.status === 401 || response.status === 403) { // 인증 에러
        localStorage.removeItem('token');
        alert('로그인이 만료되었습니다. 다시 로그인해 주세요.');
        navigate('/login');
        return;
      }
      if (!response.ok) { // 기타 서버 에러
        throw new Error(result.message || `HTTP error! status: ${response.status}`);
      }

      if (result.success) {
        setSurveyId(result.surveyId || currentSurveyId);
        if (method === 'POST') { // 생성 성공
          if (formData.get('isPublic') === '1') {
            setSuccess('설문지가 성공적으로 게시되었습니다!');
            navigate('/');
          } else {
            const shareableLink = `${window.location.origin}/s/${result.link}`;
            setSuccess(`비공개 설문이 생성되었습니다! 다음 링크를 공유하세요: ${shareableLink}`);
            navigate('/');
          }
        } else { // 수정 성공
          setSuccess('설문지가 성공적으로 수정되었습니다!');
          setTimeout(() => navigate('/mypage'), 2000); // 2초 후 마이페이지로 이동
        }
      } else {
        throw new Error(result.message || '설문지 처리 중 오류가 발생했습니다.');
      }

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };


  // 수정 모드에서 데이터 로딩 중일 때
  if (loading && !surveyId) {
    return <div className='container'><div style={{ textAlign: 'center', padding: '50px' }}><p>로딩 중...</p></div></div>;
  }

  return (
    <div className='container'>
      <NavBar2 
        active={active} 
        setActive={setActive} 
        onButtonClick={saveSurvey} 
        showResponseTab={false} // 이 페이지에서는 '응답' 탭을 보여주지 않음
        buttonText={currentSurveyId ? "수정" : "게시"} // 모드에 따라 버튼 텍스트 변경
      />
      
      {/* 에러/성공 메시지 표시 */}
      {error && <div className='message error-message'>{error}</div>}
      {success && (
        <div className='message success-message'>
          {success}
          <br />
          <small>잠시 후 {currentSurveyId ? "마이페이지" : "홈 페이지"}로 이동합니다...</small>
        </div>
      )}

      {/* 설문지 작성 폼 */}
      {active === "question" && (
        <div className='createContentWrapper'>
          {/* 제목, 설명, 이미지 업로드 영역 */}
          <div className='titleBox'>
            <div className='titleInput'>
              <div className='title'>
                <textarea ref={titleRef} placeholder='제목 없는 설문지' value={surveyInfo.title}
                  onInput={(e) => {
                    setSurveyInfo(prev => ({ ...prev, title: e.target.value }));
                    autoResize(titleRef);
                  }}
                />
              </div>
              <div className='explain'>
                <textarea ref={explainRef} placeholder='설문지 설명' value={surveyInfo.description}
                  onInput={(e) => {
                    setSurveyInfo(prev => ({ ...prev, description: e.target.value }));
                    autoResize(explainRef);
                  }}
                />
              </div>
            </div>
            <div className='image-upload-section'>
              <label htmlFor="surveyImageUpload" className="image-upload-button">이미지 등록</label>
              <input id="surveyImageUpload" type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
              {(imagePreview || existingImage) && (
                <div className='image-preview-container'>
                  <img src={imagePreview || existingImage} alt="Survey Preview" className="image-preview" />
                  <button onClick={() => { 
                    setSelectedImage(null); 
                    setImagePreview(null); 
                    setExistingImage(null); 
                    setShouldRemoveExistingImage(true); // 서버에 이미지 삭제 요청을 보내기 위한 플래그
                  }} className="remove-image-button">X</button>
                </div>
              )}
            </div>
          </div>

          {/* 질문 목록 */}
          {questions.map((q, qIdx) => (
            <div key={qIdx} className='createContent'>
              <div className='content'>
                <div className='questionContent'>
                  <div className='questionNav'>
                    <div className='questionbox'>
                      <textarea placeholder='제목 없는 질문' value={q.question}
                        onInput={(e) => {
                          const newQ = [...questions];
                          newQ[qIdx].question = e.target.value;
                          setQuestions(newQ);
                        }}
                      />
                    </div>
                    <div className='selectType'>
                      <select value={q.questionType}
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

                  {/* 객관식 옵션 입력 */}
                  {q.questionType === 'objective' && (
                    <div className='radioOptions'>
                      {q.options.map((opt, idx) => (
                        <div key={idx} className="option-item">
                          <input type='radio' name={`answer-${qIdx}`} disabled />
                          <input type='text' value={opt} onChange={(e) => updateOption(qIdx, idx, e.target.value)} className="option-input" />
                          {q.options.length > 1 && (
                            <button onClick={() => deleteOption(qIdx, idx)} className="option-delete-btn">X</button>
                          )}
                        </div>
                      ))}
                      <label className='additionalOption' onClick={() => {
                        const newQ = [...questions];
                        newQ[qIdx].options.push(`옵션 ${newQ[qIdx].options.length + 1}`);
                        setQuestions(newQ);
                      }}>옵션 추가</label>
                    </div>
                  )}

                  {/* 주관식 답변 미리보기 */}
                  {q.questionType === 'subjective' && (
                    <div className='subjectiveInput'>
                      <input type='text' disabled placeholder='답변' />
                    </div>
                  )}

                  {/* 질문 하단 컨트롤 (삭제, 필수 여부) */}
                  <div className='lineBox'></div>
                  <div className='contentBottom'>
                    <div className='delImg'>
                      <img src={`${process.env.PUBLIC_URL}/img/delete.svg`} alt='delete'
                        onClick={() => {
                          if (questions.length > 1) {
                            const newQ = questions.filter((_, i) => i !== qIdx);
                            setQuestions(newQ);
                          }
                        }}
                        style={{ cursor: questions.length > 1 ? 'pointer' : 'not-allowed', opacity: questions.length > 1 ? 1 : 0.5 }}
                      />
                    </div>
                    <div className='lengthLine'></div>
                    <div className='essential'>
                      <p>필수</p>
                      <div className={`switch ${q.isOn ? "on" : ""}`}
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

          {/* 질문 추가 버튼 */}
          <div className='plusImg' onClick={addQuestion}>
            <img src={`${process.env.PUBLIC_URL}/img/plus.svg`} alt='plus' />
          </div>
        </div>
      )}
    </div>
  );
}

export default Create;