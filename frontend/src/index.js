import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { BrowserRouter } from 'react-router-dom';
import { NotificationProvider } from './components/NotificationProvider';

// 'root'라는 id를 가진 DOM 요소를 React의 루트로 생성합니다.
// 이 요소는 public/index.html 파일에 존재하며, 전체 React 애플리케이션이 이 안에 렌더링됩니다.
const root = ReactDOM.createRoot(document.getElementById('root'));

// React 애플리케이션을 렌더링합니다.
root.render(
  // BrowserRouter 컴포넌트로 App 컴포넌트를 감싸서
  // 애플리케이션 전체에서 React Router의 라우팅 기능을 사용할 수 있도록 합니다.
  <BrowserRouter>
    <NotificationProvider>
      <App />
    </NotificationProvider>
  </BrowserRouter>
);

// 웹 애플리케이션의 성능을 측정하고 리포트하는 함수입니다.
// (예: reportWebVitals(console.log)) 형태로 함수를 전달하여 결과를 콘솔에서 확인할 수 있습니다.
// 자세한 정보: https://bit.ly/CRA-vitals
reportWebVitals();
