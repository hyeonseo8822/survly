import { Link, useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import './css/NavBar.css';

/**
 * @component NavBar
 * @description 상단 네비게이션 바 컴포넌트입니다.
 *              사용자의 로그인 상태에 따라 다른 메뉴를 보여줍니다.
 */
function NavBar() {
  const user = localStorage.getItem('userId') || null;
  const [isMypageMenuOpen, setIsMypageMenuOpen] = useState(false);
  const [keyword, setKeyword] = useState('');
  const navigate = useNavigate();
  const mypageMenuRef = useRef(null);

  useEffect(() => {
    const handleDocClick = (e) => {
      if (isMypageMenuOpen && mypageMenuRef.current && !mypageMenuRef.current.contains(e.target)) {
        setIsMypageMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleDocClick);
    return () => document.removeEventListener('mousedown', handleDocClick);
  }, [isMypageMenuOpen]);

  // user는 로컬스토리지에서 초기값을 읽어오도록 lazy initializer 사용

  const handleSearch = () => {
    const trimmed = keyword.trim();
    if (!trimmed) return;
    navigate(`/search?keyword=${encodeURIComponent(trimmed)}`);
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className='navbar'>
      <Link to="/">
        <div className="brandmark">
          <img src={import.meta.env.BASE_URL + 'img/logo.svg'} alt="Survly" className="brandmark-logo" />
        </div>
      </Link>

      <div className="navbar-search" role="search">
        <input
          type="text"
          placeholder="설문 또는 사용자 아이디를 검색하세요"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          aria-label="통합 검색"
        />
        <button type="button" onClick={handleSearch} aria-label="검색 실행" className="navbar-search-btn">
          <img src={import.meta.env.BASE_URL + 'img/magnifier.svg'} alt="" />
        </button>
      </div>

      <div className='navbar-right'>
        <div className="items">
          <Link to="/create" className='nav'>Create</Link>
          {user && (
            <div className="mypage-menu" ref={mypageMenuRef}>
              <button className="mypage-menu-trigger nav" type="button" onClick={() => setIsMypageMenuOpen((s) => !s)} aria-expanded={isMypageMenuOpen} aria-haspopup="true">
                Mypage
              </button>
              {isMypageMenuOpen && (
                <div className="mypage-menu-dropdown" role="menu">
                  <Link to="/mypage" className="mypage-menu-item" onClick={() => setIsMypageMenuOpen(false)}>마이페이지</Link>
                  <button type="button" className="mypage-menu-item mypage-menu-item--logout" onClick={() => { localStorage.removeItem('token'); localStorage.removeItem('userId'); localStorage.removeItem('userProfile'); setIsMypageMenuOpen(false); navigate('/login'); }}>로그아웃</button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className='login_signup'>
          {!user && (
            <>
              <Link to="/signup" className="signUp">
                <p className='losiText'>Sign up</p>
              </Link>
              <Link to="/login" className="login active">
                <p className='losiText'>Log in</p>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default NavBar;
