import { Link } from 'react-router-dom';
import './css/NavBar.css';

function NavBarV2() {
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
        <div className="post active">
          <p>게시</p>
        </div>
      </div>
    </div>
  );
}

export default NavBarV2;
