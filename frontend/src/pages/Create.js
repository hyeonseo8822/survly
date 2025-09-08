import { useState, useRef, useEffect } from 'react';
import './css/Create.css';
import NavBar2 from '../components/NavBar2';


function Create() {
  const [active, setActive] = useState("question");

  const titleRef = useRef(null);
  const explainRef = useRef(null);
  const questionRef = useRef(null);

  const autoResize = (ref) => {
    if (ref.current) {
      ref.current.style.height = 'auto';
      ref.current.style.height = ref.current.scrollHeight + 'px';
    }
  };


  const [questions, setQuestions] = useState([
    { questionType: "objective", options: ["옵션 1"], isOn: false }
  ]);

  useEffect(() => {
    autoResize(titleRef);
    autoResize(explainRef);
    autoResize(questionRef);
  }, []);


  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        questionType: "objective",
        options: ["옵션 1"],
        isOn: false,
      },
    ]);
  };
  return (
    <div className='container'>
      <NavBar2 active={active} setActive={setActive} />
      {active === "answer" && (
        <div className='answerContent'>
          <p>응답이 아직 없습니다.</p>
        </div>
      )}
      {active === "question" && (
        <div className='createContentWrapper'>
          <div className='titleBox'>
            <div className='titleInput'>
              <div className='title'>
                <textarea
                  placeholder='제목 없는 설문지'
                  onInput={(e) => {
                    const newQ = [...questions];
                    newQ[0].title = e.target.value;
                    setQuestions(newQ);
                  }}
                />
              </div>
              <div className='explain'>
                <textarea
                  placeholder='설문지 설명'
                  onInput={(e) => {
                    const newQ = [...questions];
                    newQ[0].explain = e.target.value;
                    setQuestions(newQ);
                  }}
                />
              </div>
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
                        <label key={idx}>
                          <input type='radio' name={`answer-${qIdx}`} disabled />
                          <span>{opt}</span>
                        </label>
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
                          const newQ = questions.filter((_, i) => i !== qIdx);
                          setQuestions(newQ);
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
