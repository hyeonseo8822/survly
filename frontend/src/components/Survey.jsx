import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './css/Surveys.css';
import Pagination from './Pagination';

function Surveys() {
    const [surveyList, setSurveyList] = useState([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchSurveys = async (pageNum) => {
            setLoading(true);
            try {
                const response = await fetch(`http://localhost:5000/api/surveys?page=${pageNum}&limit=6&isPublic=true`);
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                const data = await response.json();
                if (data.success) {
                    setSurveyList(data.surveys);
                    setTotalPages(data.totalPages);
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
    }, [page]);

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
        return <div className="surveys"><div className="surveyText">Surveys</div><div className='surveyExplain'>Error: {error}</div></div>;
    }

    return (
        <div className="surveys">
            <div className="surveyText">Surveys</div>
            <div className='surveyExplain'>여러가지 설문조사들을 확인해보세요!</div>
            
            {loading ? (
                <div className='surveyExplain'>Loading...</div>
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
    );
}

export default Surveys;
