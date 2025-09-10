import './css/Login.css';
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";

function Login() {
    const [userId, setUserId] = useState("");
    const [password, setPassword] = useState("");
    const navigate = useNavigate();

    const handleLogin = async () => {
        try {
            const res = await fetch("http://localhost:5000/api/auth/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ userId, password })
            });

            const data = await res.json();

            if (res.ok) {
                alert("로그인 성공!");
                localStorage.setItem("token", data.token); 
                localStorage.setItem("userId", data.userId); // userId 저장
                navigate("/"); 
            } else {
                alert(data.message || "로그인 실패");
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
                <input
                    className='idInput'
                    type='text'
                    placeholder='아이디'
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                />
                <input
                    className='passInput'
                    type='password'
                    placeholder='비밀번호'
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
            </div>
            <button className='LoginBtn' onClick={handleLogin}>
                로그인
            </button>
        </div>
    );
}

export default Login;
