import Main from './pages/main';
import Create from './pages/Create';
import { Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import SignUp from './pages/SignUp';

function App() {
  return (
    <Routes>
      <Route path='/' element={<Main />} ></Route>
      <Route path='/create' element={<Create />} ></Route>
      <Route path='/login' element={<Login />} ></Route>
       <Route path='/signup' element={<SignUp />} ></Route>
    </Routes>
  );
}

export default App;
