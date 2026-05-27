import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import './css/NavBar.css';

/**
 * @component NavBar
 * @description 상단 네비게이션 바 컴포넌트입니다.
 *              사용자의 로그인 상태에 따라 다른 메뉴를 보여줍니다.
 */
function NavBar() {
  const [user, setUser] = useState(null);
  const [keyword, setKeyword] = useState('');
  const [isMypageMenuOpen, setIsMypageMenuOpen] = useState(false);
  const mypageMenuRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const syncUser = () => {
      const userId = localStorage.getItem('userId');
      setUser(userId || null);
    };

    syncUser();
    window.addEventListener('storage', syncUser);

    return () => {
      window.removeEventListener('storage', syncUser);
    };
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!mypageMenuRef.current || mypageMenuRef.current.contains(event.target)) {
        return;
      }
      setIsMypageMenuOpen(false);
    };

    document.addEventListener('mousedown', handleOutsideClick);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

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

  const toggleMypageMenu = () => {
    setIsMypageMenuOpen((prev) => !prev);
  };

  const handleGoToMypage = () => {
    setIsMypageMenuOpen(false);
    navigate('/mypage');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    setUser(null);
    setIsMypageMenuOpen(false);
    navigate('/login');
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
              <button
                type="button"
                className="nav mypage-menu-trigger"
                onClick={toggleMypageMenu}
                aria-haspopup="menu"
                aria-expanded={isMypageMenuOpen}
              >
                Mypage
              </button>
              {isMypageMenuOpen && (
                <div className="mypage-menu-dropdown" role="menu">
                  <button type="button" className="mypage-menu-item" role="menuitem" onClick={handleGoToMypage}>
                    마이페이지
                  </button>
                  <button type="button" className="mypage-menu-item mypage-menu-item--logout" role="menuitem" onClick={handleLogout}>
                    로그아웃
                  </button>
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
