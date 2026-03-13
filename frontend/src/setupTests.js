// jest-dom은 DOM 노드를 검증하기 위한 사용자 정의 jest matcher를 추가합니다.
// 이 파일을 통해 모든 테스트 파일이 실행되기 전에
// Jest 테스트 환경을 설정하거나 공통 모듈을 가져올 수 있습니다.
// 예를 들어, 아래 import는 다음과 같은 matcher 사용을 가능하게 합니다:
// expect(element).toHaveTextContent(/react/i)
// 자세한 정보: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';
