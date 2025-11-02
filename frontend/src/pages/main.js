import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './css/App.css';
import NavBar from '../components/NavBar';
import Surveys from '../components/Survey';

function Main() {
  const [keyword, setKeyword] = useState('');
  const navigate = useNavigate();

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      navigate(`/search?keyword=${keyword}`);
    }
  };

  return (<>
    <NavBar />
    <div className="container">
      <Link to="/create">
        <div className='goSurvey'>
          <img src={`${process.env.PUBLIC_URL}/img/goSurvey.svg`}
            alt='button' />
        </div>
      </Link>
      <div className='search'>
        <img
          src={`${process.env.PUBLIC_URL}/img/magnifier.svg`}
          alt='magnifier'
        />
        <input
          id="search"
          type="text"
          placeholder="검색어를 입력해주세요"
          className="search-input"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>
      <img className='back'
        src={`${process.env.PUBLIC_URL}/img/background.svg`}
        alt="Logo"
      />
    </div>
    <Surveys />
  </>
  );
}

export default Main;
