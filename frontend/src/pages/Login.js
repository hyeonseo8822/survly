import './css/Login.css';
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";


function Login() {
    const [userId, setUserId] = useState(""); // 사용자가 입력한 아이디
    const [password, setPassword] = useState(""); // 사용자가 입력한 비밀번호
    
    const navigate = useNavigate();

    const handleLogin = async () => {
        try {
            // 로그인 API에 POST 요청을 보냅니다.
            const res = await fetch("http://localhost:5000/api/auth/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ userId, password }) // 아이디와 비밀번호를 JSON 형태로 전송
            });

            const data = await res.json();

            if (res.ok) { 
                alert("로그인 성공!");
                // 서버로부터 받은 토큰과 사용자 ID를 localStorage에 저장합니다.
                localStorage.setItem("token", data.token); 
                localStorage.setItem("userId", data.userId);
                
                navigate("/"); 
            } else {
                alert(data.message || "로그인 실패");
            }
        } catch (err) {
            // 서버 연결 실패 등 네트워크 오류 발생 시
            console.error(err);
            alert("서버 오류 발생");
        }
    };

    return (
        <div className="container">
            {/* 로고 이미지 */}
            <div className="logoImg">
                <img src={`${process.env.PUBLIC_URL}/img/Survly.svg`}
                    alt="logoImg" />
            </div>
            
            {/* 로그인 박스 상단 */}
            <div className='loginBox'>
                <div className='loginText'>로그인</div>
                <div className='isMember'>
                    <div className='isMemberText'>회원이 아니신가요?</div>
                    <div className='SignUpLink'>
                        {/* 회원가입 페이지로 이동하는 링크 */}
                        <Link className='signLink' to="/signup">회원가입</Link>
                    </div>
                </div>
            </div>
            
            {/* 아이디 및 비밀번호 입력 필드 */}
            <div className='LoginBox'>
                <img src={`${process.env.PUBLIC_URL}/img/loginbox.svg`}
                    alt="Loginbox" />
                <input
                    className='idInput'
                    type='text'
                    placeholder='아이디'
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)} // 입력 값에 따라 userId state 업데이트
                />
                <input
                    className='passInput'
                    type='password'
                    placeholder='비밀번호'
                    value={password}
                    onChange={(e) => setPassword(e.target.value)} // 입력 값에 따라 password state 업데이트
                />
            </div>
            
            {/* 로그인 실행 버튼 */}
            <button className='LoginBtn' onClick={handleLogin}>
                로그인
            </button>
        </div>
    );
}

export default Login;
