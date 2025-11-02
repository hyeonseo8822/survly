import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import './css/NavBar.css';

function NavBar() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (userId) {
      setUser(userId);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    setUser(null);
    alert('로그아웃 되었습니다.');
    navigate('/'); // 홈으로 이동
    window.location.reload(); // 페이지를 새로고침하여 상태를 완전히 리셋
  };

  return (
    <div className='navbar'>
      <div className='route'>
        <Link to="/">
          <img
            className="logobox"
            src={`${process.env.PUBLIC_URL}/img/logobox.svg`}
            alt="logo"
          />
        </Link>
        <div className="items">
          <Link to="/create" className='nav'>Create</Link>
          <Link to="/mypage" className='nav'>Mypage</Link>
        </div>
      </div>

      <div className='login_signup'>
        {user ? (
          <div className="loggedIn-user">
            <button onClick={handleLogout} className="logout-btn">
              <p className='logoutText'>Log out</p>
            </button>
          </div>
        ) : (
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
