import './css/Login.css'; 
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useNotification } from '../components/NotificationProvider';

function SignUp() {
    const [userId, setUserId] = useState(""); // 사용자가 입력한 아이디
    const [password, setPassword] = useState(""); // 사용자가 입력한 비밀번호
    const [email, setEmail] = useState(""); // 사용자가 입력한 이메일
    const [username, setUsername] = useState(""); // 사용자가 입력한 사용자 이름
    
    // React Router의 navigate 함수를 사용하여 페이지 이동을 처리합니다.
    const navigate = useNavigate();
    const { notify } = useNotification();

    const handleSignUp = async () => {
        // 1. 클라이언트 측 유효성 검사
        if (!userId || !password || !email || !username) {
            notify("모든 필드를 입력해주세요!", 'warning');
            return;
        }
        if (userId.length > 10) {
            notify("아이디는 10자 이내로 입력해주세요.", 'warning');
            return;
        }
        if (password.length > 12) {
            notify("비밀번호는 12자 이내로 입력해주세요.", 'warning');
            return;
        }

        try {
            // 2. 회원가입 API에 POST 요청
            const res = await fetch(`${import.meta.env.VITE_API_BASE}/api/auth/register`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ userId, password, email, username }) // 아이디, 비밀번호, 이메일, 사용자 이름 전송
            });

            const data = await res.json();

            if (res.ok) { // HTTP 상태 코드가 200-299인 경우 (성공)
                notify("회원가입 성공!", 'success');
                navigate("/login"); 
            } else {
                // 서버에서 보낸 에러 메시지(예: 중복된 아이디)를 사용자에게 보여줍니다.
                notify(data.message || "회원가입 실패", 'error');
            }
        } catch (err) {
            // 서버 연결 실패 등 네트워크 오류 발생 시
            console.error(err);
            notify("서버 오류 발생", 'error');
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-brand-wrap">
                <img src={import.meta.env.BASE_URL + 'img/logo.svg'} alt="Survly" className="auth-brand-logo" />
            </div>

            <div className="auth-card">
                <div className='auth-switch'>
                    <span className='auth-switch-text'>이미 회원이신가요?</span>
                    <Link className='auth-switch-link' to="/login">로그인</Link>
                </div>

                <div className='auth-inputs'>
                    <input
                        className='auth-input'
                        type='text'
                        placeholder='아이디'
                        value={userId}
                        onChange={(e) => setUserId(e.target.value)}
                    />
                    <input
                        className='auth-input'
                        type='text'
                        placeholder='사용자 이름'
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                    />
                    <input
                        className='auth-input'
                        type='password'
                        placeholder='비밀번호'
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <input
                        className='auth-input'
                        type='email'
                        placeholder='이메일'
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                </div>

                <button className='auth-submit' onClick={handleSignUp}>
                    회원가입
                </button>
            </div>
        </div>
    );
}

export default SignUp;
