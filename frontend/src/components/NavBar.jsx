import { Link } from 'react-router-dom';
import './css/NavBar.css'
import { useState } from "react";

function NavBar() {

  const [active, setActive] = useState("signUp");
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
        <div
          className={`signUp ${active === "signUp" ? "active" : ""}`}
          onClick={() => setActive("signUp")}
        >
          <p className='losiText'>Sign up</p>
        </div>

        <div
          className={`login ${active === "login" ? "active" : ""}`}
          onClick={() => setActive("login")}
        >
          <p className='losiText'>Log in</p>
        </div>
      </div>
    </div>
  );
}

export default NavBar;
