import './css/Login.css';
import { Link } from "react-router-dom";
function Login() {
    return (
        <div className="container">
            <div className="logoImg">
                <img src={`${process.env.PUBLIC_URL}/img/Survly.svg`}
                    alt="logoImg" />
            </div>
            <div className='loginBox'>
                <div className='loginText'>로그인</div>
                <div className='isMember'>
                    <div className='isMemberText'>회원이 아니신가요?</div>
                    <div className='SignUpLink'>
                        <Link className='signLink' to="/signup">회원가입</Link>
                    </div>
                </div>
            </div>
            <div className='LoginBox'>
                <img src={`${process.env.PUBLIC_URL}/img/loginbox.svg`}
                    alt="Loginbox" />
                <input className='idInput' type='text' placeholder='아이디'></input>
                <input className='passInput' type='password' placeholder='비밀번호'></input>
            </div>
            <Link to="/" className='LoginBtn'>
                로그인
            </Link>
        </div>
    );
}

export default Login;