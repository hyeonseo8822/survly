import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './css/Surveys.css';
import Pagination from './Pagination';

/**
 * @component Surveys
 * @description 공개된 설문 목록을 서버에서 가져와 화면에 표시하는 컴포넌트입니다.
 *              페이지네이션 기능을 포함하고 있습니다.
 */
function Surveys() {
    // 컴포넌트의 상태 관리
    const [surveyList, setSurveyList] = useState([]); // 현재 페이지의 설문 목록
    const [page, setPage] = useState(1); // 현재 페이지 번호
    const [totalPages, setTotalPages] = useState(0); // 전체 페이지 수
    const [loading, setLoading] = useState(false); // 데이터 로딩 상태
    const [error, setError] = useState(null); // 에러 상태
    const navigate = useNavigate();

    // 'page' state가 변경될 때마다 실행되는 useEffect 훅
    useEffect(() => {
        /**
         * @async
         * @function fetchSurveys
         * @description API 서버로부터 특정 페이지의 공개 설문 목록을 가져옵니다.
         * @param {number} pageNum - 가져올 페이지 번호
         */
        const fetchSurveys = async (pageNum) => {
            setLoading(true); // 로딩 시작
            setError(null);   // 이전 에러 초기화
            try {
                // API 요청: 공개(isPublic=true)된 설문 목록을 페이지에 맞게 요청
                const response = await fetch(`http://localhost:5000/api/surveys?page=${pageNum}&limit=6&isPublic=true`);
                if (!response.ok) {
                    throw new Error('서버에서 응답을 받지 못했습니다.');
                }
                const data = await response.json();
                if (data.success) {
                    setSurveyList(data.surveys); // 설문 목록 state 업데이트
                    setTotalPages(data.totalPages); // 전체 페이지 수 state 업데이트
                } else {
                    throw new Error(data.message || '설문 목록을 불러오는데 실패했습니다.');
                }
            } catch (error) {
                setError(error.message); // 에러 발생 시 에러 state 업데이트
            } finally {
                setLoading(false); // 로딩 종료
            }
        };

        fetchSurveys(page);
    }, [page]); // 'page'가 변경될 때마다 이 함수를 다시 실행합니다.

    /**
     * @function handleSurveyClick
     * @description 설문 항목 클릭 시 호출되는 함수입니다.
     *              로그인 상태를 확인하고, 로그인 되어 있으면 해당 설문 응답 페이지로 이동합니다.
     *              비로그인 상태이면 로그인 페이지로 이동시킵니다.
     * @param {number} id - 클릭된 설문의 ID
     */
    const handleSurveyClick = (id) => {
        const token = localStorage.getItem('token');
        if (!token) {
            alert('로그인이 필요합니다.');
            navigate('/login');
        } else {
            navigate(`/surveys/${id}`);
        }
    };

    // 에러가 발생한 경우 에러 메시지를 표시합니다.
    if (error) {
        return <div className="surveys"><div className="surveyText">Surveys</div><div className='surveyExplain'>Error: {error}</div></div>;
    }

    return (
        <div className="surveys">
            <div className="surveyText">Surveys</div>
            <div className='surveyExplain'>여러가지 설문조사들을 확인해보세요!</div>
            
            {/* 로딩 중일 때 'Loading...' 메시지를 표시합니다. */}
            {loading ? (
                <div className='surveyExplain'>Loading...</div>
            ) : (
                // 로딩이 끝나면 설문 목록을 렌더링합니다.
                <div className="rectList">
                    {surveyList.map((survey, index) => (
                        <div className="rect" key={survey.id || index} onClick={() => handleSurveyClick(survey.id)}>
                            {/* 설문 번호: 01, 02, ... 형식으로 표시 */}
                            <p className='num'>{String((page - 1) * 6 + index + 1).padStart(2, '0')}</p>
                            <p className="rectText">{survey.title}</p>
                            <div className="graph">
                                {/* 설문 썸네일 이미지 */}
                                <img 
                                    // survey.img가 존재하고 'default_img'가 아니면 서버의 업로드 경로에서 이미지를 가져옵니다.
                                    // 그렇지 않으면 기본 이미지를 표시합니다.
                                    src={survey.img && survey.img !== 'default_img' 
                                        ? `http://localhost:5000/uploads/${survey.img}` 
                                        : `${process.env.PUBLIC_URL}/img/default_img.svg`}
                                    alt="Survey Thumbnail"
                                    className="survey-thumbnail"
                                />
                            </div>
                            {/* 화살표 아이콘 */}
                            <img
                                className="part"
                                src={`${process.env.PUBLIC_URL}/img/arrow.svg`}
                                alt="arrow"
                            />
                        </div>
                    ))}
                </div>
            )}

            {/* 페이지네이션 컴포넌트 */}
            <Pagination 
                currentPage={page} // 현재 페이지 번호 전달
                totalPages={totalPages} // 전체 페이지 수 전달
                onPageChange={setPage} // 페이지 변경 시 호출될 함수(page state 변경) 전달
            />

            <div className='box'></div>
        </div>
    );
}

export default Surveys;
