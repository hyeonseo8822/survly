import { Link } from 'react-router-dom';
import './css/NavBar.css';

function NavBar2({ 
  active, 
  setActive, 
  onButtonClick, 
  loading, 
  buttonText = '게시', 
  tab1Text = '질문', 
  showResponseTab = true 
}) {
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
        <div 
          className={`post active ${loading ? 'disabled' : ''}`}
          onClick={!loading ? onButtonClick : null}  
        >
          <p>{loading ? '처리 중...' : buttonText}</p>
        </div>
      </div>
      <div className='select'>
        <div
          className={`question ${active === "question" || active === "answer" ? "selectActive" : ""}`}
          onClick={() => setActive(tab1Text === '질문' ? "question" : "answer")}
        >
          {tab1Text}
        </div>
        {showResponseTab && (
          <div
            className={`answer ${active === "responses" ? "selectActive" : ""}`}
            onClick={() => setActive("responses")}
          >
            응답
          </div>
        )}
      </div>
    </div>
  );
}

export default NavBar2;
