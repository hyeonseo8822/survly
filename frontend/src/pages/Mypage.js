import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './css/Mypage.css';
import NavBar from '../components/NavBar';
import Pagination from '../components/Pagination';

// 한 페이지에 보여줄 항목의 수
const ITEMS_PER_PAGE = 6;


function Mypage() {
    const [createdSurveys, setCreatedSurveys] = useState([]); // 내가 생성한 설문 목록
    const [participatedSurveys, setParticipatedSurveys] = useState([]); // 내가 참여한 설문 목록
    const [loading, setLoading] = useState({ created: true, participated: true }); // 각 목록의 로딩 상태
    const [error, setError] = useState(null); // 에러 메시지
    const [createdPage, setCreatedPage] = useState(1); // '생성한 설문'의 현재 페이지
    const [createdTotalPages, setCreatedTotalPages] = useState(0); // '생성한 설문'의 전체 페이지 수
    const [participatedPage, setParticipatedPage] = useState(1); // '참여한 설문'의 현재 페이지
    const [participatedTotalPages, setParticipatedTotalPages] = useState(0); // '참여한 설문'의 전체 페이지 수
    const [loggedInUserId, setLoggedInUserId] = useState(null); // 로그인된 사용자 ID
    
    const navigate = useNavigate();

    /**
     * @async
     * @function fetchApi
     * @description 인증이 필요한 API를 호출하는 재사용 가능한 함수.
     * @param {string} url - 요청할 API의 URL
     * @param {function} setter - 성공 시 데이터를 저장할 상태 설정 함수
     * @param {function} totalPagesSetter - 성공 시 전체 페이지 수를 저장할 상태 설정 함수
     * @param {string} type - 로딩 상태를 구분하기 위한 타입 ('created' 또는 'participated')
     * @throws {Error} - API 호출 실패 또는 토큰 부재 시 에러 발생
     */
    const fetchApi = async (url, setter, totalPagesSetter, type) => {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('로그인이 필요합니다.');
        }
        try {
            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error(`'${type}' 설문 목록을 불러오는 데 실패했습니다.`);
            
            const data = await response.json();
            if (data.success) {
                setter(data.surveys);
                if (totalPagesSetter) {
                    totalPagesSetter(data.totalPages || 1);
                }
            } else {
                throw new Error(data.message || `'${type}' 설문 목록을 불러오는 데 실패했습니다.`);
            }
        } catch (err) {
            setError(err.message);
            throw err; // 에러를 다시 던져서 호출한 쪽에서 후속 처리(예: 페이지 이동)를 할 수 있도록 함
        } finally {
            setLoading(prev => ({ ...prev, [type]: false }));
        }
    };

    // 컴포넌트 마운트 및 페이지 변경 시 데이터 로드
    useEffect(() => {
        // 1. 로그인 상태 확인
        const token = localStorage.getItem('token');
        const userId = localStorage.getItem('userId');
        if (!token || !userId) {
            alert('로그인이 필요합니다.');
            navigate('/login');
            return;
        }
        setLoggedInUserId(userId);

        // 2. 내가 생성한 설문 목록 불러오기
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

        // 3. 내가 참여한 설문 목록 불러오기
        fetchApi(
            `http://localhost:5000/api/me/responses/surveys?page=${participatedPage}&limit=${ITEMS_PER_PAGE}`,
            setParticipatedSurveys,
            setParticipatedTotalPages,
            'participated'
        ).catch(err => {
            if (err.message === '로그인이 필요합니다.') {
                alert(err.message);
                navigate('/login');
            } else {
                setError(err.message);
            }
        });

    }, [navigate, createdPage, participatedPage]); // 페이지 번호가 바뀔 때마다 다시 데이터를 불러옴

    const handleSurveyClick = (id) => navigate(`/surveys/${id}`);
    const handleEditClick = (id) => navigate(`/create/${id}`);

    /**
     * @async
     * @function handleDeleteClick
     * @description 설문 삭제 버튼 클릭 시 호출. 확인 창 후 DELETE API를 호출하여 설문을 삭제합니다.
     * @param {number} id - 삭제할 설문의 ID
     */
    const handleDeleteClick = async (id) => {
        if (window.confirm('정말 이 설문을 삭제하시겠습니까? 관련된 모든 응답도 함께 삭제됩니다.')) {
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

                if (!response.ok) throw new Error(result.message || '설문 삭제에 실패했습니다.');

                if (result.success) {
                    alert('설문이 성공적으로 삭제되었습니다.');
                    setCreatedPage(1); // 삭제 후 첫 페이지로 리셋
                    // 목록을 다시 불러옵니다. (useEffect가 createdPage 변경으로 인해 자동으로 다시 실행됨)
                    // 만약 즉각적인 피드백이 필요하다면 여기서 직접 fetchApi를 호출할 수도 있습니다.
                } else {
                    throw new Error(result.message || '설문 삭제 중 오류가 발생했습니다.');
                }
            } catch (err) {
                setError(err.message);
                alert(`삭제 중 오류 발생: ${err.message}`);
            }
        }
    };

    /**
     * @function copyLink
     * @description 비공개 설문의 공유 링크를 클립보드에 복사합니다.
     * @param {string} link - 복사할 고유 링크 문자열
     */
    const copyLink = (link) => {
        const fullLink = `${window.location.origin}/s/${link}`;
        navigator.clipboard.writeText(fullLink).then(() => {
            alert('링크가 클립보드에 복사되었습니다!');
        });
    };


    /**
     * @function renderSurveyList
     * @description 설문 목록을 렌더링하는 재사용 가능한 함수.
     * @param {Array} surveys - 렌더링할 설문 데이터 배열
     * @param {string} type - 목록의 타입 ('created' 또는 'participated')
     * @param {number} pageNum - 현재 페이지 번호 (항목 번호 계산용)
     * @returns {JSX.Element}
     */
    const renderSurveyList = (surveys, type, pageNum) => {
        if (surveys.length === 0) {
            return <p className="mypage-empty-text">{type === 'created' ? '아직 생성한 설문이 없습니다.' : '아직 참여한 설문이 없습니다.'}</p>;
        }

        return (
            <div className="mypage-rectList">
                {surveys.map((survey, index) => (
                    <div className="mypage-rect" key={survey.id}>
                        <div className="mypage-survey-info" onClick={() => handleSurveyClick(survey.id)}>
                            <p className='num'>{String((pageNum - 1) * ITEMS_PER_PAGE + index + 1).padStart(2, '0')}</p>
                            <p className="mypage-rectText">{survey.title}</p>
                            {/* '생성한 설문' 목록에만 공개/비공개 상태 표시 */}
                            {type === 'created' && (
                                <span className={`mypage-survey-status ${survey.isPublic ? 'mypage-status-public' : 'mypage-status-private'}`}>
                                    {survey.isPublic ? '[공개]' : '[비공개]'}
                                </span>
                            )}
                        </div>
                        {/* '생성한 설문' 목록에만 수정/삭제/링크복사 버튼 표시 */}
                        {type === 'created' && (
                            <div className="mypage-actions">
                                {!survey.isPublic && (
                                    <button onClick={() => copyLink(survey.link)} className="mypage-copyLinkBtn">링크 복사</button>
                                )}
                                <img src={`${process.env.PUBLIC_URL}/img/edit.svg`} alt="Edit Survey" className="mypage-edit-icon" onClick={() => handleEditClick(survey.id)} />
                                <img src={`${process.env.PUBLIC_URL}/img/delete.svg`} alt="Delete Survey" className="mypage-delete-icon" onClick={() => handleDeleteClick(survey.id)} />
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
                {/* 로그인된 사용자 ID 표시 */}
                {loggedInUserId && (
                    <h1 className="mypage-userid-title">{loggedInUserId}</h1>
                )}
                
                {/* 에러 메시지 표시 */}
                {error && <p className='error-message'>{error}</p>}

                {/* 내가 생성한 설문 섹션 */}
                <div className="mypage-survey-section">
                    <h2 className="mypage-section-title">내가 생성한 설문</h2>
                    {loading.created ? <p className="mypage-loading-text">로딩 중...</p> : renderSurveyList(createdSurveys, 'created', createdPage)}
                    {/* 페이지네이션: 전체 페이지가 1보다 클 때만 표시 */}
                    {!loading.created && createdTotalPages > 1 && (
                        <Pagination 
                            currentPage={createdPage}
                            totalPages={createdTotalPages}
                            onPageChange={setCreatedPage}
                        />
                    )}
                </div>

                {/* 내가 참여한 설문 섹션 */}
                <div className="mypage-survey-section">
                    <h2 className="mypage-section-title">내가 참여한 설문</h2>
                    {loading.participated ? <p className="mypage-loading-text">로딩 중...</p> : renderSurveyList(participatedSurveys, 'participated', participatedPage)}
                    {/* 페이지네이션: 전체 페이지가 1보다 클 때만 표시 */}
                    {!loading.participated && participatedTotalPages > 1 && (
                        <Pagination 
                            currentPage={participatedPage}
                            totalPages={participatedTotalPages}
                            onPageChange={setParticipatedPage}
                        />
                    )}
                </div>
            </div>
        </>
    );
}

export default Mypage;