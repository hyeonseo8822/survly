import './css/Login.css'; 
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";

function SignUp() {
    const [userId, setUserId] = useState(""); // 사용자가 입력한 아이디
    const [password, setPassword] = useState(""); // 사용자가 입력한 비밀번호
    const [email, setEmail] = useState(""); // 사용자가 입력한 이메일
    
    // React Router의 navigate 함수를 사용하여 페이지 이동을 처리합니다.
    const navigate = useNavigate();

    const handleSignUp = async () => {
        // 1. 클라이언트 측 유효성 검사
        if (!userId || !password || !email) {
            alert("모든 필드를 입력해주세요!");
            return;
        }
        if (userId.length > 10) {
            alert("아이디는 10자 이내로 입력해주세요.");
            return;
        }
        if (password.length > 12) {
            alert("비밀번호는 12자 이내로 입력해주세요.");
            return;
        }

        try {
            // 2. 회원가입 API에 POST 요청
            const res = await fetch("http://localhost:5000/api/auth/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ userId, password, email }) // 아이디, 비밀번호, 이메일을 JSON 형태로 전송
            });

            const data = await res.json();

            if (res.ok) { // HTTP 상태 코드가 200-299인 경우 (성공)
                alert("회원가입 성공!");
                navigate("/login"); 
            } else {
                // 서버에서 보낸 에러 메시지(예: 중복된 아이디)를 사용자에게 보여줍니다.
                alert(data.message || "회원가입 실패");
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
            
            {/* 회원가입 박스 상단 */}
            <div className='loginBox'>
                <div className='loginText'>회원가입</div>
                <div className='isMember'>
                    <div className='isMemberText'>이미 회원이신가요?</div>
                    <div className='SignUpLink'>
                        {/* 로그인 페이지로 이동하는 링크 */}
                        <Link className='signLink' to="/login">로그인</Link>
                    </div>
                </div>
            </div>
            
            {/* 아이디, 비밀번호, 이메일 입력 필드 */}
            <div className='LoginBox'>
                <img src={`${process.env.PUBLIC_URL}/img/signUpbox.svg`}
                    alt="SignUpBox" />
                <input
                    className='idInput2'
                    type='text'
                    placeholder='아이디'
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)} // 입력 값에 따라 userId state 업데이트
                />
                <input
                    className='passInput2'
                    type='password'
                    placeholder='비밀번호'
                    value={password}
                    onChange={(e) => setPassword(e.target.value)} // 입력 값에 따라 password state 업데이트
                />
                <input
                    className='email'
                    type='email'
                    placeholder='이메일'
                    value={email}
                    onChange={(e) => setEmail(e.target.value)} // 입력 값에 따라 email state 업데이트
                />
            </div>
            
            {/* 회원가입 실행 버튼 */}
            <button className='LoginBtn2' onClick={handleSignUp}>
                회원가입
            </button>
        </div>
    );
}

export default SignUp;
