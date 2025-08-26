import './App.css';

function App() {
  return (
    <div className="App">
      <img 
        src={`${process.env.PUBLIC_URL}/img/background.svg`} 
        alt="Logo" 
        style={{width: '100%'}}
      />
    </div>
  );
}

export default App;
