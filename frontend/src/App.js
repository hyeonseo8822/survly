import Main from './pages/main';
import Create from './pages/Create';
import { Routes, Route } from 'react-router-dom';

function App() {
  return (
    <Routes>
      <Route path='/' element={<Main />} ></Route>
      <Route path='/create' element={<Create />} ></Route>
    </Routes>
  );
}

export default App;
