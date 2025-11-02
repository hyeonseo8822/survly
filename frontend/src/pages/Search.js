import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../components/css/Surveys.css'; // Surveys.css를 재활용
import Pagination from '../components/Pagination';
import NavBar from '../components/NavBar';

function Search() {
    const [surveyList, setSurveyList] = useState([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [totalSearchResults, setTotalSearchResults] = useState(0); // 전체 검색 결과 수 상태 추가
    const navigate = useNavigate();
    const location = useLocation();

    const queryParams = new URLSearchParams(location.search);
    const keyword = queryParams.get('keyword') || '';

    useEffect(() => {
        // 키워드가 변경될 때마다 페이지를 1로 리셋
        setPage(1);
    }, [keyword]);

    useEffect(() => {
        const fetchSurveys = async (pageNum) => {
            setLoading(true);
            setError(null);
            try {
                let url = `http://localhost:5000/api/surveys?page=${pageNum}&limit=6&isPublic=true`;
                if (keyword) {
                    url += `&keyword=${keyword}`;
                }
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                const data = await response.json();
                if (data.success) {
                    setSurveyList(data.surveys);
                    setTotalPages(data.totalPages);
                    setTotalSearchResults(data.totalSurveys); // 전체 검색 결과 수 저장
                } else {
                    throw new Error(data.message || 'Failed to fetch surveys');
                }
            } catch (error) {
                setError(error.message);
            } finally {
                setLoading(false);
            }
        };

        fetchSurveys(page);
    }, [page, keyword]);

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
                <div className="surveyText">'{keyword}' 검색 결과</div>
                <div className="surveyExplain">총 {totalSearchResults}개의 설문이 검색되었습니다.</div>
                
                {loading ? (
                    <div className='surveyExplain'>Loading...</div>
                ) : surveyList.length === 0 ? (
                    <div className='surveyExplain'>검색 결과가 없습니다.</div>
                ) : (
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

