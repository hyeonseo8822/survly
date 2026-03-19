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
      const trimmed = keyword.trim();
      if (!trimmed) return;
      navigate(`/search?keyword=${encodeURIComponent(trimmed)}&mode=survey`);
    }
  };

  return (
    <>
      {/* 상단 네비게이션 바 컴포넌트 */}
      <NavBar />
      
      <main className="main-page">
        <section className="main-hero">
          <div className="main-hero__content">
            <div className="main-hero__brand">Survly</div>
            <h1 className="main-hero__title">당신이 궁금한 것, 설문으로 알아보세요</h1>
            <p className="main-hero__subtitle">Find out what people are curious about through a survey</p>

            <div className='main-hero__search'>
              <img
                src={`${process.env.PUBLIC_URL}/img/magnifier.svg`}
                alt='magnifier'
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

          <div className="main-hero__visual" aria-hidden="true">
            <div className="main-hero__glow main-hero__glow--large"></div>
            <div className="main-hero__glow main-hero__glow--small"></div>
            <img
              className="main-hero__shape main-hero__shape--one"
              src={`${process.env.PUBLIC_URL}/img/image%202.png`}
              alt=""
            />
            <img
              className="main-hero__shape main-hero__shape--two"
              src={`${process.env.PUBLIC_URL}/img/image%203.png`}
              alt=""
            />
            <img
              className="main-hero__shape main-hero__shape--three"
              src={`${process.env.PUBLIC_URL}/img/image%204%20(1).png`}
              alt=""
            />
          </div>
        </section>
      </main>
      
      {/* 공개 설문 목록을 보여주는 컴포넌트 */}
      <Surveys />
    </>
  );
}

export default Main;
