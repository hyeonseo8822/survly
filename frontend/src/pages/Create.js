import { useState, useRef, useEffect } from 'react';
import './css/Create.css';
import NavBar2 from '../components/NavBar2';

function Create() {
  const [active, setActive] = useState("question");

  const titleRef = useRef(null);
  const explainRef = useRef(null);

  // 자동 높이 조절 함수
  const autoResize = (ref) => {
    if (ref.current) {
      ref.current.style.height = 'auto'; // 초기화
      ref.current.style.height = ref.current.scrollHeight + 'px'; // 내용 높이에 맞춤
    }
  };

  // 처음 렌더링 시 placeholder가 없을 때도 높이 맞춤
  useEffect(() => {
    autoResize(titleRef);
    autoResize(explainRef);
  }, []);

  return (
    <div className='container'>
      <div className='navBox'>
        <NavBar2 />
        <div className='select'>
          <div className={`question ${active === "question" ? "selectActive" : ""}`} onClick={() => setActive("question")}>
            질문
          </div>
          <div className={`answer ${active === "answer" ? "selectActive" : ""}`} onClick={() => setActive("answer")}>
            응답
          </div>
        </div>
      </div>

      <div className='titleBox'>
        <div className='titleInput'>
          <div className='title'>
            <textarea
              ref={titleRef}
              placeholder='제목 없는 설문지'
              onInput={() => autoResize(titleRef)}
            />
          </div>
          <div className='explain'>
            <textarea
              ref={explainRef}
              placeholder='설문지 설명'
              onInput={() => autoResize(explainRef)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Create;
