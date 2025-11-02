import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './css/Mypage.css';
import NavBar from '../components/NavBar';
import Pagination from '../components/Pagination';

const ITEMS_PER_PAGE = 6;

function Mypage() {
    const [createdSurveys, setCreatedSurveys] = useState([]);
    const [participatedSurveys, setParticipatedSurveys] = useState([]);
    const [loading, setLoading] = useState({ created: true, participated: true });
    const [error, setError] = useState(null);
    const [createdPage, setCreatedPage] = useState(1);
    const [createdTotalPages, setCreatedTotalPages] = useState(0);
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            alert('로그인이 필요합니다.');
            navigate('/login');
            return;
        }

        const fetchApi = async (url, setter, totalPagesSetter, type) => {
            try {
                const response = await fetch(url, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!response.ok) throw new Error(`Failed to fetch ${type} surveys`);
                const data = await response.json();
                if (data.success) {
                    setter(data.surveys);
                    if (totalPagesSetter) {
                        totalPagesSetter(data.totalPages || 1);
                    }
                } else {
                    throw new Error(data.message || `Failed to fetch ${type} surveys`);
                }
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(prev => ({ ...prev, [type]: false }));
            }
        };

        // Fetch Created Surveys
        fetchApi(
            `http://localhost:5000/api/me/surveys?page=${createdPage}&limit=${ITEMS_PER_PAGE}`,
            setCreatedSurveys,
            setCreatedTotalPages,
            'created'
        );

        // Fetch Participated Surveys (no pagination for now)
        fetchApi(
            'http://localhost:5000/api/me/responses/surveys',
            setParticipatedSurveys,
            null,
            'participated'
        );

    }, [navigate, createdPage]);

    const handleSurveyClick = (id) => {
        navigate(`/surveys/${id}`);
    };

    const copyLink = (link) => {
        const fullLink = `${window.location.origin}/s/${link}`;
        navigator.clipboard.writeText(fullLink).then(() => {
            alert('링크가 클립보드에 복사되었습니다!');
        });
    };

    const renderSurveyList = (surveys, type, pageNum) => {
        if (surveys.length === 0) {
            return <p className="mypage-empty-text">{type === 'created' ? '아직 생성한 설문이 없습니다.' : '아직 참여한 설문이 없습니다.'}</p>;
        }

        return (
            <div className="mypage-rectList">
                {surveys.map((survey, index) => (
                    <div className="mypage-rect" key={survey.id}>
                        <div className="mypage-survey-info" onClick={() => handleSurveyClick(survey.id)}>
                            <p className='num'>
                                {type === 'created' 
                                    ? String((pageNum - 1) * ITEMS_PER_PAGE + index + 1).padStart(2, '0')
                                    : String(index + 1).padStart(2, '0')
                                }
                            </p>
                            <p className="mypage-rectText">{survey.title}</p>
                            {type === 'created' && (
                                <span className={`mypage-survey-status ${survey.isPublic ? 'mypage-status-public' : 'mypage-status-private'}`}>
                                    {survey.isPublic ? '[공개]' : '[비공개]'}
                                </span>
                            )}
                        </div>
                        {type === 'created' && !survey.isPublic && (
                            <button onClick={() => copyLink(survey.link)} className="mypage-copyLinkBtn">링크 복사</button>
                        )}
                    </div>
                ))}
            </div>
        );
    };

    return (
        <>
            <NavBar />
            <div className="mypage-container">
                <h1 className="mypage-title">마이페이지</h1>
                
                {error && <p className='error-message'>{error}</p>}

                <div className="mypage-survey-section">
                    <h2 className="mypage-section-title">내가 생성한 설문</h2>
                    {loading.created ? <p className="mypage-loading-text">로딩 중...</p> : renderSurveyList(createdSurveys, 'created', createdPage)}
                    {!loading.created && createdTotalPages > 1 && (
                        <Pagination 
                            currentPage={createdPage}
                            totalPages={createdTotalPages}
                            onPageChange={setCreatedPage}
                        />
                    )}
                </div>

                <div className="mypage-survey-section">
                    <h2 className="mypage-section-title">내가 참여한 설문</h2>
                    {loading.participated ? <p className="mypage-loading-text">로딩 중...</p> : renderSurveyList(participatedSurveys, 'participated')}
                </div>
            </div>
        </>
    );
}

export default Mypage;
