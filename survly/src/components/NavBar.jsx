import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import './css/NavBar.css';

/**
 * @component NavBar
 * @description 상단 네비게이션 바 컴포넌트입니다.
 *              사용자의 로그인 상태에 따라 다른 메뉴를 보여줍니다.
 */
function NavBar() {
  const [user, setUser] = useState(() => localStorage.getItem('userId') || null);
  const [keyword, setKeyword] = useState('');
  const navigate = useNavigate();

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
          {user && <Link to="/mypage" className='nav'>Mypage</Link>}
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
