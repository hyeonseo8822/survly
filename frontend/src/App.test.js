import { render, screen } from '@testing-library/react';
import App from './App';

// 이 파일은 Create React App에 의해 생성된 기본 테스트 파일 예시입니다.
// 'App' 컴포넌트가 충돌 없이 렌더링되는지 확인하는 간단한 테스트를 포함합니다.
test('renders learn react link', () => {
  // App 컴포넌트를 가상 DOM에 렌더링합니다.
  render(<App />);
  // 'learn react'라는 텍스트(대소문자 구분 없음)를 가진 요소를 찾습니다.
  // 현재 App.js에는 이 텍스트가 없으므로, 이 테스트는 실제로는 실패할 것입니다.
  // 프로젝트에 맞게 테스트를 수정해야 합니다.
  const linkElement = screen.getByText(/learn react/i);
  // 해당 요소가 문서 안에 존재하는지 확인합니다.
  expect(linkElement).toBeInTheDocument();
});
