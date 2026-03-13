import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../components/css/Surveys.css'; 
import Pagination from '../components/Pagination';
import NavBar from '../components/NavBar';


function Search() {
    const [surveyList, setSurveyList] = useState([]); // 검색된 설문 목록
    const [page, setPage] = useState(1); // 현재 페이지 번호
    const [totalPages, setTotalPages] = useState(0); // 전체 페이지 수
    const [loading, setLoading] = useState(false); // 데이터 로딩 상태
    const [error, setError] = useState(null); // 에러 상태
    const [totalSearchResults, setTotalSearchResults] = useState(0); // 전체 검색 결과 개수
    
    const navigate = useNavigate();
    const location = useLocation(); // 현재 URL 정보를 담고 있는 객체


    const queryParams = new URLSearchParams(location.search);
    const keyword = queryParams.get('keyword') || '';


    // Effect 1: 검색어가 변경될 때 페이지 번호를 1로 리셋합니다.
    // 이렇게 함으로써 새로운 검색 시 항상 첫 페이지부터 결과를 보여줍니다.
    useEffect(() => {
        setPage(1);
    }, [keyword]);

    // Effect 2: 페이지 번호나 검색어가 변경될 때마다 검색 결과를 다시 불러옵니다.
    useEffect(() => {
        /**
         * @async
         * @function fetchSurveys
         * @description 검색어와 페이지 번호를 기반으로 설문 목록을 API 서버에서 가져옵니다.
         * @param {number} pageNum - 가져올 페이지 번호
         */
        const fetchSurveys = async (pageNum) => {
            setLoading(true);
            setError(null);
            try {
                // 기본 API URL에 페이지 번호와 공개 설문 필터를 추가합니다.
                let url = `http://localhost:5000/api/surveys?page=${pageNum}&limit=6&isPublic=true`;
                if (keyword) {
                    // 검색어가 있으면 URL에 keyword 파라미터를 추가합니다.
                    url += `&keyword=${keyword}`;
                }
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error('서버에서 응답을 받지 못했습니다.');
                }
                const data = await response.json();
                if (data.success) {
                    setSurveyList(data.surveys);
                    setTotalPages(data.totalPages);
                    setTotalSearchResults(data.totalSurveys); // 전체 결과 수 상태 업데이트
                } else {
                    throw new Error(data.message || '설문 검색에 실패했습니다.');
                }
            } catch (error) {
                setError(error.message);
            } finally {
                setLoading(false);
            }
        };

        fetchSurveys(page);
    }, [page, keyword]); // page 또는 keyword가 변경될 때마다 이 effect를 실행합니다.


    const handleSurveyClick = (id) => {
        const token = localStorage.getItem('token');
        if (!token) {
            alert('로그인이 필요합니다.');
            navigate('/login');
        } else {
            navigate(`/surveys/${id}`);
        }
    };


    if (error) {
        return <div className="surveys"><div className="surveyText">Search Results</div><div className='surveyExplain'>Error: {error}</div></div>;
    }

    return (
        <>
            <NavBar />
            <div className="surveys">
                {/* 검색 결과 제목 */}
                <div className="surveyText">'{keyword}' 검색 결과</div>
                <div className="surveyExplain">총 {totalSearchResults}개의 설문이 검색되었습니다.</div>
                
                {loading ? (
                    <div className='surveyExplain'>Loading...</div>
                ) : surveyList.length === 0 ? (
                    // 검색 결과가 없을 때
                    <div className='surveyExplain'>검색 결과가 없습니다.</div>
                ) : (
                    // 검색 결과가 있을 때 목록을 렌더링
                    <div className="rectList">
                        {surveyList.map((survey, index) => (
                            <div className="rect" key={survey.id || index} onClick={() => handleSurveyClick(survey.id)}>
                                <p className='num'>{String((page - 1) * 6 + index + 1).padStart(2, '0')}</p>
                                <p className="rectText">{survey.title}</p>
                                <div className="graph">
                                    <img 
                                        src={survey.img && survey.img !== 'default_img' 
                                            ? `http://localhost:5000/uploads/${survey.img}` 
                                            : `${process.env.PUBLIC_URL}/img/default_img.svg`}
                                        alt="Survey Thumbnail"
                                        className="survey-thumbnail"
                                    />
                                </div>
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
                    currentPage={page}
                    totalPages={totalPages}
                    onPageChange={setPage}
                />

                <div className='box'></div>
            </div>
        </>
    );
}

export default Search;
