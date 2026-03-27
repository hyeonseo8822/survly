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
      
      <div className="main-page">
        <section className="main-hero">
          <div className="main-hero__visual">
            <img src={'/img/image 2.png'} alt="오브젝트1" className="main-hero__shape main-hero__shape--one" />
            <img src={'/img/image 3.png'} alt="오브젝트2" className="main-hero__shape main-hero__shape--two" />
            <img src={'/img/image 4 (1).png'} alt="오브젝트3" className="main-hero__shape main-hero__shape--three" />
          </div>
          <div className="main-hero__content">
            <div className="main-hero__brand">Survly</div>
            <h1 className="main-hero__title">세상 모든 설문, 쉽고 빠르게</h1>
            <div className="main-hero__subtitle">원하는 설문을 검색하고, 직접 만들어보세요!</div>
            <div className="main-hero__search">
              <img
                src={'/img/magnifier.svg'}
                alt="magnifier"
              />
              <input
                id="search"
                type="text"
                placeholder="검색어를 입력해주세요"
                className="main-hero__search-input"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
            <div className="main-hero__actions">
              <Link to="/create" className="main-hero__cta">
                설문 만들기
              </Link>
            </div>
          </div>
        </section>
      </div>
      
      {/* 공개 설문 목록을 보여주는 컴포넌트 */}
      <Surveys />
    </>
  );
}

export default Main;
