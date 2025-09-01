import { useState } from 'react';
import './css/Create.css';
import NavBar2 from '../components/NavBar2';

function Create() {
  const [active, setActive] = useState("question");

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
    </div>
  );
}

export default Create;
