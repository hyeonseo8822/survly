import './css/App.css';
import NavBar from '../components/NavBar';
import Surveys from '../components/Survey';


function Main() {
  return (<>
  <NavBar />
    <div className="container">
      <div className='goSurvey'>
        <img src={`${process.env.PUBLIC_URL}/img/goSurvey.svg`}
          alt='button' />
      </div>
      <img className='back'
        src={`${process.env.PUBLIC_URL}/img/background.svg`}
        alt="Logo"
      />
    </div>
    <Surveys />
    </>
  );
}

export default Main;
