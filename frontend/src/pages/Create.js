import './css/Create.css';
import NavBar2 from '../components/NavBar2';

function Create() {
  return (
    <div className='container'>
      <div className='navBox'>
        <NavBar2 />
        <div className='select'>
          <div className='question'>
            질문
          </div>
          <div className='answer'>
            응답
          </div>
        </div>
      </div>
    </div>
  );
}

export default Create;
