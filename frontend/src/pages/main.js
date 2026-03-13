import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './css/App.css';
import NavBar from '../components/NavBar';
import Surveys from '../components/Survey';


function Main() {
  // 사용자가 검색창에 입력한 검색어를 관리하는 state
  const [keyword, setKeyword] = useState('');
  
  // React Router의 navigate 함수를 사용하여 페이지 이동을 처리합니다.
  const navigate = useNavigate();

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      navigate(`/search?keyword=${keyword}`);
    }
  };

  return (
    <>
      {/* 상단 네비게이션 바 컴포넌트 */}
      <NavBar />
      
      <div className="container">
        {/* 설문 생성 페이지로 이동하는 버튼 */}
        <Link to="/create">
          <div className='goSurvey'>
            <img src={`${process.env.PUBLIC_URL}/img/goSurvey.svg`}
              alt='button' />
          </div>
        </Link>
        
        {/* 검색창 */}
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
            onChange={(e) => setKeyword(e.target.value)} // 입력 값에 따라 keyword state 업데이트
            onKeyDown={handleKeyDown} // 키 입력 시 handleKeyDown 함수 호출
          />
        </div>
        
        {/* 배경 이미지 */}
        <img className='back'
          src={`${process.env.PUBLIC_URL}/img/background.svg`}
          alt="Logo"
        />
      </div>
      
      {/* 공개 설문 목록을 보여주는 컴포넌트 */}
      <Surveys />
    </>
  );
}

export default Main;
