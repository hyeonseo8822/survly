import './css/Login.css';
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";

function SignUp() {
    const [userId, setUserId] = useState("");
    const [password, setPassword] = useState("");
    const [email, setEmail] = useState("");
    const navigate = useNavigate();

    const handleSignUp = async () => {
        if (!userId || !password || !email) {
            alert("모든 필드를 입력해주세요!");
            return;
        }

        try {
            const res = await fetch("http://localhost:5000/api/auth/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ userId, password, email })
            });

            const data = await res.json();

            if (res.ok) {
                alert("회원가입 성공!");
                navigate("/login"); 
            } else {
                alert(data.message || "회원가입 실패");
            }
        } catch (err) {
            console.error(err);
            alert("서버 오류 발생");
        }
    };

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
                <input
                    className='idInput2'
                    type='text'
                    placeholder='아이디'
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                />
                <input
                    className='passInput2'
                    type='password'
                    placeholder='비밀번호'
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
                <input
                    className='email'
                    type='email'
                    placeholder='이메일'
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
            </div>
            <button className='LoginBtn2' onClick={handleSignUp}>
                회원가입
            </button>
        </div>
    );
}

export default SignUp;
