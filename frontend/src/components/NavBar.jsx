import { Link } from 'react-router-dom';
import './css/NavBar.css';

function NavBar() {
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
        <Link to="/signup" className="signUp">
          <p className='losiText'>Sign up</p>
        </Link>

        <Link to="/login" className="login active">
          <p className='losiText'>Log in</p>
        </Link>
      </div>
    </div>
  );
}

export default NavBar;
