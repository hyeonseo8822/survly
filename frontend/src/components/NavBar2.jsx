import { Link } from 'react-router-dom';
import './css/NavBar.css';

function NavBar2({ active, setActive }) {
  return (
    <div className='navbar2'>
      <div className='route'>
        <Link to="/">
          <img
            className="logobox"
            src={`${process.env.PUBLIC_URL}/img/logobox.svg`}
            alt="logo"
          />
        </Link>
        <div className="post active">
          <p>게시</p>
        </div>
      </div>
      <div className='select'>
        <div
          className={`question ${active === "question" ? "selectActive" : ""}`}
          onClick={() => setActive("question")}
        >
          질문
        </div>
        <div
          className={`answer ${active === "answer" ? "selectActive" : ""}`}
          onClick={() => setActive("answer")}
        >
          응답
        </div>
      </div>
    </div>
  );
}

export default NavBar2;
