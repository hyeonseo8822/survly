import { Link } from 'react-router-dom';
import './css/NavBar.css'

function NavBar() {
  return (
    <div className='navbar'>
      <img
        className="logobox"
        src={`${process.env.PUBLIC_URL}/img/logobox.svg`}
        alt="logo"
      />
      <div className="items">
        <Link to="/" className='nav'>Home</Link>
        <Link to="/create" className='nav'>Create</Link>
        <Link to="/search" className='nav'>Search</Link>
        <Link to="/login" className='nav'>Login</Link>
      </div>
    </div>
  );
}

export default NavBar;
