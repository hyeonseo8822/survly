import './css/Login.css';
import { Link, useNavigate } from "react-router-dom";
import { useRef, useState } from "react";
import { useNotification } from '../components/NotificationProvider';


function Login() {
    const [userId, setUserId] = useState(""); // 사용자가 입력한 아이디
    const [password, setPassword] = useState(""); // 사용자가 입력한 비밀번호
    const [isSubmitting, setIsSubmitting] = useState(false);
    const submitLockRef = useRef(false);
    
    const navigate = useNavigate();
    const { notify } = useNotification();

    const handleLogin = async () => {
        if (submitLockRef.current) {
            return;
        }

        try {
            submitLockRef.current = true;
            setIsSubmitting(true);

            // 로그인 API에 POST 요청을 보냅니다.
            const res = await fetch(`${import.meta.env.VITE_API_BASE}/api/auth/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ userId, password }) // 아이디와 비밀번호를 JSON 형태로 전송
            });

            const data = await res.json();

            if (res.ok) { 
                notify("로그인 성공!", 'success');
                // 서버로부터 받은 토큰과 사용자 ID를 localStorage에 저장합니다.
                localStorage.setItem("token", data.token); 
                localStorage.setItem("userId", data.userId);
                
                navigate("/"); 
            } else {
                notify(data.message || "로그인 실패", 'error');
            }
        } catch (err) {
            // 서버 연결 실패 등 네트워크 오류 발생 시
            console.error(err);
            notify("서버 오류 발생", 'error');
        } finally {
            submitLockRef.current = false;
            setIsSubmitting(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-brand-wrap">
                <img src={import.meta.env.BASE_URL + 'img/logo.svg'} alt="Survly" className="auth-brand-logo" />
            </div>

            <div className="auth-card">
                <div className='auth-switch'>
                    <span className='auth-switch-text'>회원이 아니신가요?</span>
                    <Link className='auth-switch-link' to="/signup">회원가입</Link>
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
                        type='password'
                        placeholder='비밀번호'
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                </div>

                <button className='auth-submit' onClick={handleLogin} disabled={isSubmitting} aria-disabled={isSubmitting}>
                    로그인
                </button>
            </div>
        </div>
    );
}

export default Login;
