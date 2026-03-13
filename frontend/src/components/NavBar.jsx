import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import './css/NavBar.css';

/**
 * @component NavBar
 * @description 상단 네비게이션 바 컴포넌트입니다.
 *              사용자의 로그인 상태에 따라 다른 메뉴를 보여줍니다.
 */
function NavBar() {
  // 'user' state는 현재 로그인된 사용자 ID를 저장합니다. null이면 비로그인 상태입니다.
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  // 컴포넌트가 처음 렌더링될 때 localStorage를 확인하여 로그인 상태를 설정합니다.
  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (userId) {
      setUser(userId); // localStorage에 userId가 있으면 로그인 상태로 설정
    }
  }, []); // 빈 배열을 전달하여 컴포넌트 마운트 시 한 번만 실행되도록 합니다.

  /**
   * @function handleLogout
   * @description 로그아웃을 처리하는 함수입니다.
   *              localStorage에서 토큰과 사용자 ID를 제거하고,
   *              'user' state를 null로 변경한 후 홈으로 이동하고 페이지를 새로고침합니다.
   */
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    setUser(null); // 상태를 비로그인으로 변경
    alert('로그아웃 되었습니다.');
    navigate('/'); // 홈으로 이동
    window.location.reload(); // 페이지를 새로고침하여 모든 컴포넌트의 상태를 초기화
  };

  return (
    <div className='navbar'>
      <div className='route'>
        {/* 로고: 클릭 시 메인 페이지로 이동 */}
        <Link to="/">
          <img
            className="logobox"
            src={`${process.env.PUBLIC_URL}/img/logobox.svg`}
            alt="logo"
          />
        </Link>
        {/* 네비게이션 메뉴 */}
        <div className="items">
          <Link to="/create" className='nav'>Create</Link>
          <Link to="/mypage" className='nav'>Mypage</Link>
        </div>
      </div>

      <div className='login_signup'>
        {/* 'user' state 값에 따라 조건부 렌더링 */}
        {user ? (
          // 로그인 상태일 때: 로그아웃 버튼 표시
          <div className="loggedIn-user">
            <button onClick={handleLogout} className="logout-btn">
              <p className='logoutText'>Log out</p>
            </button>
          </div>
        ) : (
          // 비로그인 상태일 때: 회원가입 및 로그인 링크 표시
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
  );
}

export default NavBar;
