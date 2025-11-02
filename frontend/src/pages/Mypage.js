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

    // fetchApi 함수를 useEffect 밖으로 이동
    const fetchApi = async (url, setter, totalPagesSetter, type) => {
        const token = localStorage.getItem('token'); // fetchApi 내부에서 토큰 가져오기
        if (!token) {
            // 토큰이 없으면 로그인 페이지로 리다이렉트 (여기서는 직접 처리하지 않고 호출하는 곳에서 처리)
            // 또는 에러를 던져서 호출하는 곳에서 처리하도록 함
            throw new Error('로그인이 필요합니다.');
        }
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
            throw err; // 에러를 다시 던져서 호출하는 곳에서 catch하도록 함
        } finally {
            setLoading(prev => ({ ...prev, [type]: false }));
        }
    };

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            alert('로그인이 필요합니다.');
            navigate('/login');
            return;
        }

        // Fetch Created Surveys
        fetchApi(
            `http://localhost:5000/api/me/surveys?page=${createdPage}&limit=${ITEMS_PER_PAGE}`,
            setCreatedSurveys,
            setCreatedTotalPages,
            'created'
        ).catch(err => {
            if (err.message === '로그인이 필요합니다.') {
                alert(err.message);
                navigate('/login');
            } else {
                setError(err.message);
            }
        });

        // Fetch Participated Surveys (no pagination for now)
        fetchApi(
            'http://localhost:5000/api/me/responses/surveys',
            setParticipatedSurveys,
            null,
            'participated'
        ).catch(err => {
            if (err.message === '로그인이 필요합니다.') {
                alert(err.message);
                navigate('/login');
            } else {
                setError(err.message);
            }
        });

    }, [navigate, createdPage]);

    const handleSurveyClick = (id) => {
        navigate(`/surveys/${id}`);
    };

    const handleEditClick = (id) => {
        navigate(`/create/${id}`);
    };

    const handleDeleteClick = async (id) => {
        if (window.confirm('정말 이 설문을 삭제하시겠습니까?')) {
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    alert('로그인이 필요합니다.');
                    navigate('/login');
                    return;
                }
                const response = await fetch(`http://localhost:5000/api/surveys/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.message || '설문 삭제에 실패했습니다.');
                }

                if (result.success) {
                    alert('설문이 성공적으로 삭제되었습니다.');
                    setCreatedPage(1); // Reset to first page after deletion
                    // Re-fetch data by calling fetchApi directly
                    fetchApi(
                        `http://localhost:5000/api/me/surveys?page=1&limit=${ITEMS_PER_PAGE}`,
                        setCreatedSurveys,
                        setCreatedTotalPages,
                        'created'
                    ).catch(err => {
                        if (err.message === '로그인이 필요합니다.') {
                            alert(err.message);
                            navigate('/login');
                        } else {
                            setError(err.message);
                        }
                    });
                } else {
                    throw new Error(result.message || '설문 삭제 중 오류가 발생했습니다.');
                }
            } catch (err) {
                setError(err.message);
                alert(`삭제 중 오류 발생: ${err.message}`);
            }
        }
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
                        {type === 'created' && (
                            <div className="mypage-actions">
                                {!survey.isPublic && (
                                    <button onClick={() => copyLink(survey.link)} className="mypage-copyLinkBtn">링크 복사</button>
                                )}
                                <img 
                                    src={`${process.env.PUBLIC_URL}/img/edit.svg`}
                                    alt="Edit Survey"
                                    className="mypage-edit-icon"
                                    onClick={() => handleEditClick(survey.id)}
                                />
                                <img 
                                    src={`${process.env.PUBLIC_URL}/img/delete.svg`}
                                    alt="Delete Survey"
                                    className="mypage-delete-icon"
                                    onClick={() => handleDeleteClick(survey.id)}
                                />
                            </div>
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
                <img 
                    src={`${process.env.PUBLIC_URL}/img/Survly.svg`}
                    alt="Survly Logo"
                    className="mypage-logo"
                />
                
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