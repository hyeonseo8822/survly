import './css/Login.css';
import { Link } from "react-router-dom";
function SignUp() {
    return (
        <div className="container">
            <div className="logoImg">
                <img src={`${process.env.PUBLIC_URL}/img/Survly.svg`}
                    alt="logoImg" />
            </div>
            <div className='loginBox'>
                <div className='loginText'>회원가입</div>
                <div className='isMember'>
                    <div className='isMemberText'>이미 회원이신가요?</div>
                    <div className='SignUpLink'>
                        <Link className='signLink' to="/login">로그인</Link>
                    </div>
                </div>
            </div>
            <div className='LoginBox'>
                <img src={`${process.env.PUBLIC_URL}/img/signUpbox.svg`}
                    alt="Loginbox" />
                <input className='idInput2' type='text' placeholder='아이디'></input>
                <input className='passInput2' type='password' placeholder='비밀번호'></input>
                <input className='email' type='email' placeholder='이메일'></input>
            </div>
            <Link to="/" className='LoginBtn2'>
                회원가입
            </Link>
        </div>
    );
}

export default SignUp;