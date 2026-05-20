import { Link } from 'react-router-dom';
import './css/NavBar.css';

/**
 * @component NavBar2
 * @description 설문 생성, 응답, 결과 페이지 등에서 사용되는 두 번째 유형의 네비게이션 바입니다.
 *              탭(예: '질문', '응답')과 주요 액션 버튼(예: '게시')을 포함하며,
 *              props를 통해 동적으로 모양과 기능을 제어할 수 있습니다.
 * 
 * @param {object} props - 컴포넌트의 props
 * @param {string} props.active - 현재 활성화된 탭을 나타내는 문자열 ('question', 'answer', 'responses')
 * @param {function} props.setActive - 활성 탭을 변경하는 함수
 * @param {function} props.onButtonClick - 오른쪽 상단 버튼 클릭 시 실행될 함수
 * @param {boolean} props.loading - 버튼 클릭 후 로딩 상태를 나타내는 boolean 값
 * @param {string} [props.buttonText='게시'] - 버튼에 표시될 텍스트
 * @param {string} [props.tab1Text='질문'] - 첫 번째 탭에 표시될 텍스트
 * @param {boolean} [props.showResponseTab=true] - '응답' 탭을 표시할지 여부
 * @param {boolean} [props.showButton=true] - 오른쪽 상단 액션 버튼을 표시할지 여부
 */
function NavBar2({
  active,
  setActive,
  onButtonClick,
  loading,
  buttonText = '게시',
  tab1Text = '질문',
  showResponseTab = true,
  showButton = true
}) {
  return (
    <div className='navbar2'>
      <div className='route'>
        {/* 로고: 클릭 시 메인 페이지로 이동 */}
        <Link to="/">
          <div className="brandmark">
            <img src={import.meta.env.BASE_URL + 'img/logo.svg'} alt="Survly" className="brandmark-logo" />
          </div>
        </Link>
        
        {/* showButton prop이 true일 때만 액션 버튼을 렌더링합니다. */}
        {showButton && (
          <div 
            // 로딩 중일 때는 'disabled' 클래스를 추가하여 시각적으로 비활성화하고, 클릭 이벤트를 막습니다.
            className={`post active ${loading ? 'disabled' : ''}`}
            onClick={!loading ? onButtonClick : null}  
          >
            {/* 로딩 상태에 따라 버튼 텍스트를 '처리 중...' 또는 전달받은 buttonText로 표시합니다. */}
            <p>{loading ? '처리 중...' : buttonText}</p>
          </div>
        )}
      </div>
      
      {/* 탭 선택 영역 */}
      <div className='navbar2-select'>
        {/* 첫 번째 탭 (질문 또는 답변) */}
        <div
          // 현재 active 상태와 일치하면 'selectActive' 클래스를 적용하여 활성화된 탭 스타일을 보여줍니다.
          className={`navbar2-tab ${active === "question" || active === "answer" ? "navbar2-tab-active" : ""}`}
          // 클릭 시 setActive 함수를 호출하여 상태를 변경합니다. tab1Text 값에 따라 'question' 또는 'answer'로 설정됩니다.
          onClick={() => setActive(tab1Text === '질문' ? "question" : "answer")}
        >
          {tab1Text}
        </div>
        
        {/* showResponseTab prop이 true일 때만 '응답' 탭을 렌더링합니다. */}
        {showResponseTab && (
          <div
            // 현재 active 상태가 'responses'이면 'selectActive' 클래스를 적용합니다.
            className={`navbar2-tab ${active === "responses" ? "navbar2-tab-active" : ""}`}
            // 클릭 시 setActive 함수를 호출하여 상태를 'responses'로 변경합니다.
            onClick={() => setActive("responses")}
          >
            응답
          </div>
        )}
      </div>
    </div>
  );
}

export default NavBar2;
