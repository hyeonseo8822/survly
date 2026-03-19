import Main from './pages/main'; // 메인 페이지
import Create from './pages/Create'; // 설문 생성 및 수정 페이지
import { Routes, Route } from 'react-router-dom'; // 리액트 라우터의 핵심 컴포넌트
import Login from './pages/Login'; // 로그인 페이지
import SignUp from './pages/SignUp'; // 회원가입 페이지
import Answer from './pages/Answer'; // 설문 응답 페이지
import Mypage from './pages/Mypage'; // 마이페이지
import Search from './pages/Search'; // 설문 검색 페이지
import UserProfile from './pages/UserProfile'; // 사용자 프로필 페이지

function App() {
  return (
    <Routes>
      <Route path='/' element={<Main />} ></Route>
      <Route path='/create/:id?' element={<Create />} ></Route>
      <Route path='/surveys/:id' element={<Answer />} ></Route>      
      <Route path='/s/:link' element={<Answer />} ></Route>
      <Route path='/login' element={<Login />} ></Route>
      <Route path='/signup' element={<SignUp />} ></Route>
      <Route path='/mypage/:section?' element={<Mypage />} ></Route>
      <Route path='/profile/:userId' element={<UserProfile />} ></Route>
      <Route path='/search' element={<Search />} ></Route>
    </Routes>
  );
}

export default App;
