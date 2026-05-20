import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../components/css/Surveys.css'; 
import Pagination from '../components/Pagination';
import NavBar from '../components/NavBar';
import { useNotification } from '../components/NotificationProvider';
import './css/Search.css';


function Search() {
    const [surveyList, setSurveyList] = useState([]); // 검색된 설문 목록
    const [userResults, setUserResults] = useState([]); // 검색된 사용자 목록
    const [page, setPage] = useState(1); // 현재 페이지 번호
    const [totalPages, setTotalPages] = useState(0); // 전체 페이지 수
    const [loading, setLoading] = useState(false); // 데이터 로딩 상태
    const [usersLoading, setUsersLoading] = useState(false);
    const [userDetailLoading, setUserDetailLoading] = useState(false);
    const [error, setError] = useState(null); // 에러 상태
    const [totalSearchResults, setTotalSearchResults] = useState(0); // 전체 검색 결과 개수
    const [totalUserResults, setTotalUserResults] = useState(0); // 전체 사용자 검색 결과 개수
        // 검색 결과 개수를 화면에 표시 (예시)
        // <div>설문 결과: {totalSearchResults}개, 사용자 결과: {totalUserResults}개</div>
    const [bookmarkStateBySurveyId, setBookmarkStateBySurveyId] = useState({});
    const [bookmarkBusyBySurveyId, setBookmarkBusyBySurveyId] = useState({});
    const [bookmarkModalSurveyId, setBookmarkModalSurveyId] = useState(null);
    const [bookmarkModalLoading, setBookmarkModalLoading] = useState(false);
    const [selectedUserProfile, setSelectedUserProfile] = useState(null);
    const [selectedUserCreatedSurveys, setSelectedUserCreatedSurveys] = useState([]);
    const [selectedUserRespondedSurveys, setSelectedUserRespondedSurveys] = useState([]);
    
    const navigate = useNavigate();
    const location = useLocation(); // 현재 URL 정보를 담고 있는 객체
    const { notify } = useNotification();


    const queryParams = new URLSearchParams(location.search);
    const keyword = queryParams.get('keyword') || '';
    const mode = queryParams.get('mode') || 'all';
    const isSurveyOnlyMode = mode === 'survey';

    const safeParseJson = async (response) => {
        const text = await response.text();
        try {
            return JSON.parse(text);
        } catch (error) {
            return null;
        }
    };

    const fetchSurveyBookmarkStatus = async (surveyId, token) => {
        const response = await fetch(`${import.meta.env.VITE_API_BASE}/api/surveys/${surveyId}/bookmark-status`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || '북마크 정보를 불러오지 못했습니다.');
        }

        const lists = data.lists || [];
        return {
            lists,
            isBookmarked: lists.some((list) => list.isBookmarked)
        };
    };


    // Effect 1: 검색어가 변경될 때 페이지 번호를 1로 리셋합니다.
    // 이렇게 함으로써 새로운 검색 시 항상 첫 페이지부터 결과를 보여줍니다.
    useEffect(() => {
        setPage(1);
        setSelectedUserProfile(null);
        setSelectedUserCreatedSurveys([]);
        setSelectedUserRespondedSurveys([]);
    }, [keyword, mode]);

    // Effect 2: 페이지 번호나 검색어가 변경될 때마다 검색 결과를 다시 불러옵니다.
    useEffect(() => {
        /**
         * @async
         * @function fetchSurveys
         * @description 검색어와 페이지 번호를 기반으로 설문 목록을 API 서버에서 가져옵니다.
         * @param {number} pageNum - 가져올 페이지 번호
         */
        const fetchSearchData = async (pageNum) => {
            setLoading(true);
            if (!isSurveyOnlyMode) {
                setUsersLoading(true);
            }
            setError(null);
            try {
                // 기본 API URL에 페이지 번호와 공개 설문 필터를 추가합니다.
                let url = `${import.meta.env.VITE_API_BASE}/api/surveys?page=${pageNum}&limit=6&isPublic=true`;
                if (keyword) {
                    // 검색어가 있으면 URL에 keyword 파라미터를 추가합니다.
                    url += `&keyword=${encodeURIComponent(keyword)}`;
                }

                const token = localStorage.getItem('token');
                const headers = token ? { Authorization: `Bearer ${token}` } : {};
                const surveyPromise = fetch(url);
                const userPromise = (!isSurveyOnlyMode && keyword.trim())
                    ? fetch(`${import.meta.env.VITE_API_BASE}/api/users/search?keyword=${encodeURIComponent(keyword)}&limit=12`, { headers })
                    : null;

                const [surveyResponse, usersResponse] = await Promise.all([surveyPromise, userPromise]);

                if (!surveyResponse.ok) {
                    throw new Error('서버에서 응답을 받지 못했습니다.');
                }

                const surveyData = await surveyResponse.json();
                if (surveyData.success) {
                    setSurveyList(surveyData.surveys);
                    setTotalPages(surveyData.totalPages);
                    setTotalSearchResults(surveyData.totalSurveys); // 전체 결과 수 상태 업데이트
                } else {
                    throw new Error(surveyData.message || '설문 검색에 실패했습니다.');
                }

                if (!isSurveyOnlyMode && usersResponse) {
                    const usersData = await safeParseJson(usersResponse);
                    if (usersResponse.ok && usersData && usersData.success) {
                        setUserResults(usersData.users || []);
                        setTotalUserResults(Number(usersData.totalUsers) || 0);
                    } else {
                        setUserResults([]);
                        setTotalUserResults(0);
                    }
                } else {
                    setUserResults([]);
                    setTotalUserResults(0);
                }
            } catch (error) {
                setError(error.message);
            } finally {
                setLoading(false);
                setUsersLoading(false);
            }
        };

        fetchSearchData(page);
    }, [page, keyword, isSurveyOnlyMode]); // page 또는 keyword가 변경될 때마다 이 effect를 실행합니다.

    useEffect(() => {
        const token = localStorage.getItem('token');

        if (!token || surveyList.length === 0) {
            setBookmarkStateBySurveyId({});
            setBookmarkBusyBySurveyId({});
            return;
        }

        let cancelled = false;

        const fetchBookmarkStates = async () => {
            const entries = await Promise.all(surveyList.map(async (survey) => {
                try {
                    return [survey.id, await fetchSurveyBookmarkStatus(survey.id, token)];
                } catch (error) {
                    return [survey.id, { lists: [], isBookmarked: false }];
                }
            }));

            if (!cancelled) {
                setBookmarkStateBySurveyId(Object.fromEntries(entries));
            }
        };

        fetchBookmarkStates();

        return () => {
            cancelled = true;
        };
    }, [surveyList]);

    const closeBookmarkModal = () => {
        if (bookmarkModalLoading) {
            return;
        }
        setBookmarkModalSurveyId(null);
    };

    const handleBookmarkClick = async (event, surveyId) => {
        event.stopPropagation();

        const token = localStorage.getItem('token');
        if (!token) {
            notify('로그인이 필요합니다.', 'warning');
            navigate('/login');
            return;
        }

        try {
            setBookmarkModalSurveyId(surveyId);
            setBookmarkModalLoading(true);
            const nextState = await fetchSurveyBookmarkStatus(surveyId, token);
            setBookmarkStateBySurveyId((prev) => ({ ...prev, [surveyId]: nextState }));
        } catch (error) {
            notify(error.message || '북마크 정보를 불러오지 못했습니다.', 'error');
            setBookmarkModalSurveyId(null);
        } finally {
            setBookmarkModalLoading(false);
        }
    };

    const handleBookmarkListToggle = async (event, surveyId, listId) => {
        event.stopPropagation();

        const token = localStorage.getItem('token');
        if (!token) {
            notify('로그인이 필요합니다.', 'warning');
            navigate('/login');
            return;
        }

        const bookmarkState = bookmarkStateBySurveyId[surveyId];
        const targetList = bookmarkState?.lists?.find((list) => list.id === listId);
        if (!targetList || bookmarkBusyBySurveyId[surveyId]) {
            return;
        }

        try {
            setBookmarkBusyBySurveyId((prev) => ({ ...prev, [surveyId]: true }));
            const response = await fetch(`${import.meta.env.VITE_API_BASE}/api/surveys/${surveyId}/bookmark`, {
                method: targetList.isBookmarked ? 'DELETE' : 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ listId })
            });
            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || '북마크 처리에 실패했습니다.');
            }

            const nextLists = bookmarkState.lists.map((list) => (
                list.id === listId ? { ...list, isBookmarked: !list.isBookmarked } : list
            ));

            setBookmarkStateBySurveyId((prev) => ({
                ...prev,
                [surveyId]: {
                    lists: nextLists,
                    isBookmarked: nextLists.some((list) => list.isBookmarked)
                }
            }));
            notify(targetList.isBookmarked ? '북마크를 해제했습니다.' : '북마크에 추가했습니다.', 'success');
        } catch (error) {
            notify(error.message || '북마크 처리에 실패했습니다.', 'error');
        } finally {
            setBookmarkBusyBySurveyId((prev) => ({ ...prev, [surveyId]: false }));
        }
    };


    const handleSurveyClick = (id) => {
        const token = localStorage.getItem('token');
        if (!token) {
            notify('로그인이 필요합니다.', 'warning');
            navigate('/login');
        } else {
            navigate(`/surveys/${id}`);
        }
    };

    const resolveAvatarSrc = (avatarUrl) => {
        if (!avatarUrl) {
            return '';
        }
        if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
            return avatarUrl;
        }
        return `${import.meta.env.VITE_API_BASE}${avatarUrl.startsWith('/') ? '' : '/'}${avatarUrl}`;
    };

    const openUserDetail = async (userId) => {
        if (!userId || userDetailLoading) {
            return;
        }

        try {
            setBookmarkModalSurveyId(null);
            setUserDetailLoading(true);
            setError(null);

            const token = localStorage.getItem('token');
            const headers = token ? { Authorization: `Bearer ${token}` } : {};

            const [profileResponse, createdResponse, respondedResponse] = await Promise.all([
                fetch(`${import.meta.env.VITE_API_BASE}/api/users/${encodeURIComponent(userId)}/profile`, { headers }),
                fetch(`${import.meta.env.VITE_API_BASE}/api/users/${encodeURIComponent(userId)}/surveys?limit=10`, { headers }),
                fetch(`${import.meta.env.VITE_API_BASE}/api/users/${encodeURIComponent(userId)}/responded-surveys?limit=10`, { headers })
            ]);

            const profileData = await safeParseJson(profileResponse);
            const createdData = await safeParseJson(createdResponse);
            const respondedData = await safeParseJson(respondedResponse);

            if (!profileResponse.ok || !profileData.success) {
                throw new Error(profileData.message || '사용자 상세 정보를 불러오지 못했습니다.');
            }

            setSelectedUserProfile(profileData.profile);
            setSelectedUserCreatedSurveys(createdData.success ? (createdData.surveys || []) : []);
            setSelectedUserRespondedSurveys(respondedData.success ? (respondedData.surveys || []) : []);
        } catch (error) {
            setError(error.message || '사용자 상세 정보를 불러오지 못했습니다.');
        } finally {
            setUserDetailLoading(false);
        }
    };

    const closeUserDetail = () => {
        setSelectedUserProfile(null);
        setSelectedUserCreatedSurveys([]);
        setSelectedUserRespondedSurveys([]);
    };


    if (error) {
        return <div className="surveys"><div className="surveyText">Search Results</div><div className='surveyExplain'>Error: {error}</div></div>;
    }

    const bookmarkModalSurvey = surveyList.find((survey) => survey.id === bookmarkModalSurveyId);
    const bookmarkModalState = bookmarkModalSurveyId ? bookmarkStateBySurveyId[bookmarkModalSurveyId] : null;

    if (selectedUserProfile) {
        const detailAvatarSrc = resolveAvatarSrc(selectedUserProfile.avatarUrl);
        return (
            <>
                <NavBar />
                <div className="surveys search-page">
                    <div className="search-user-detail">
                        <button type="button" className="search-user-detail__back" onClick={closeUserDetail} aria-label="검색 결과 목록으로 돌아가기">←</button>

                        <div className="search-user-detail__header">
                            <div className="search-user-detail__avatar" aria-hidden="true">
                                {detailAvatarSrc ? (
                                    <img src={detailAvatarSrc} alt={`${selectedUserProfile.displayName || selectedUserProfile.userId} 프로필`} />
                                ) : (
                                    <span>{String(selectedUserProfile.displayName || selectedUserProfile.userId || 'SV').slice(0, 2).toUpperCase()}</span>
                                )}
                            </div>

                            <div className="search-user-detail__meta">
                                <h2>{selectedUserProfile.displayName || selectedUserProfile.userId}</h2>
                                <p>@{selectedUserProfile.userId}</p>
                                <div className="search-user-detail__counts">
                                    <span>팔로워 {selectedUserProfile.followerCount || 0}</span>
                                    <span>팔로잉 {selectedUserProfile.followingCount || 0}</span>
                                </div>
                            </div>

                            <button
                                type="button"
                                className="search-user-detail__profile-link"
                                onClick={() => navigate(`/profile/${encodeURIComponent(selectedUserProfile.userId)}`)}
                            >
                                프로필로 이동
                            </button>
                        </div>

                        <div className="search-user-detail__lists">
                            <section className="search-user-detail__list-card">
                                <h3>작성한 설문</h3>
                                {selectedUserCreatedSurveys.length === 0 ? (
                                    <p className="search-user-detail__empty">작성한 설문이 없습니다.</p>
                                ) : (
                                    <ul>
                                        {selectedUserCreatedSurveys.map((survey) => (
                                            <li key={`created-${survey.id}`}>
                                                <button type="button" onClick={() => handleSurveyClick(survey.id)}>
                                                    {survey.title}
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </section>

                            <section className="search-user-detail__list-card">
                                <h3>응답한 설문</h3>
                                {selectedUserRespondedSurveys.length === 0 ? (
                                    <p className="search-user-detail__empty">응답한 설문이 없습니다.</p>
                                ) : (
                                    <ul>
                                        {selectedUserRespondedSurveys.map((survey) => (
                                            <li key={`responded-${survey.id}`}>
                                                <button type="button" onClick={() => handleSurveyClick(survey.id)}>
                                                    {survey.title}
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </section>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <NavBar />
            <div className="surveys search-page">
                {/* 검색 결과 제목 */}
                <div className="surveyText">'{keyword}' 검색 결과</div>

                {!isSurveyOnlyMode && (
                    <section className="search-users-section">
                        <div className="search-users-section__header">
                            <h2>사용자 결과</h2>
                        </div>

                        {usersLoading ? (
                            <div className="surveyExplain">사용자 검색 중...</div>
                        ) : userResults.length === 0 ? (
                            <div className="surveyExplain">사용자 검색 결과가 없습니다.</div>
                        ) : (
                            <div className="search-users-scroll" role="list" aria-label="사용자 검색 결과">
                                {userResults.map((user) => {
                                    const avatarSrc = resolveAvatarSrc(user.avatarUrl);
                                    return (
                                        <button
                                            key={user.userId}
                                            type="button"
                                            className="search-user-card"
                                            onClick={() => openUserDetail(user.userId)}
                                            role="listitem"
                                        >
                                            <div className="search-user-card__avatar" aria-hidden="true">
                                                {avatarSrc ? (
                                                    <img src={avatarSrc} alt="" />
                                                ) : (
                                                    <span>{String(user.displayName || user.userId || 'SV').slice(0, 2).toUpperCase()}</span>
                                                )}
                                            </div>
                                            <strong className="search-user-card__name">{user.displayName || user.userId}</strong>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </section>
                )}

                <div className="search-surveys-title">설문 검색 결과</div>

                {bookmarkModalSurveyId && (
                    <div className="survey-bookmark-modal-overlay" onClick={closeBookmarkModal}>
                        <div className="survey-bookmark-modal" onClick={(event) => event.stopPropagation()}>
                            <div className="survey-bookmark-modal__header">
                                <div>
                                    <p className="survey-bookmark-modal__eyebrow">북마크 목록 선택</p>
                                    <h3>{bookmarkModalSurvey?.title || '설문 북마크'}</h3>
                                </div>
                                <button type="button" className="survey-bookmark-modal__close" onClick={closeBookmarkModal} aria-label="북마크 팝업 닫기">×</button>
                            </div>

                            {bookmarkModalLoading ? (
                                <p className="survey-bookmark-modal__empty">목록을 불러오는 중...</p>
                            ) : !bookmarkModalState?.lists?.length ? (
                                <p className="survey-bookmark-modal__empty">사용 가능한 목록이 없습니다.</p>
                            ) : (
                                <div className="survey-bookmark-modal__list">
                                    {bookmarkModalState.lists.map((list) => (
                                        <button
                                            key={list.id}
                                            type="button"
                                            className={`survey-bookmark-modal__item ${list.isBookmarked ? 'is-active' : ''}`}
                                            onClick={(event) => handleBookmarkListToggle(event, bookmarkModalSurveyId, list.id)}
                                            disabled={bookmarkBusyBySurveyId[bookmarkModalSurveyId]}
                                        >
                                            <span>{list.name}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
                
                {loading ? (
                    <div className='surveyExplain'>Loading...</div>
                ) : surveyList.length === 0 ? (
                    // 검색 결과가 없을 때
                    <div className='surveyExplain search-survey-empty'>검색 결과가 없습니다.</div>
                ) : (
                    // 검색 결과가 있을 때 목록을 렌더링
                    <div className="rectList">
                        {surveyList.map((survey, index) => (
                            <div className="rect" key={survey.id || index} onClick={() => handleSurveyClick(survey.id)}>
                                <button
                                    type="button"
                                    className={`survey-bookmark-btn ${bookmarkStateBySurveyId[survey.id]?.isBookmarked ? 'is-active' : ''}`}
                                    onClick={(event) => handleBookmarkClick(event, survey.id)}
                                    aria-label="설문 북마크"
                                >
                                    <svg viewBox="0 0 24 24" aria-hidden="true">
                                        <path d="M7 4.5h10a1 1 0 0 1 1 1V20l-6-3.8L6 20V5.5a1 1 0 0 1 1-1Z" />
                                    </svg>
                                </button>
                                <p className='num'>{String((page - 1) * 6 + index + 1).padStart(2, '0')}</p>
                                <p className="rectText">{survey.title}</p>
                                <div className="graph">
                                    <img 
                                        src={survey.img && survey.img !== 'default_img' 
                                            ? `${import.meta.env.VITE_API_BASE}/uploads/${survey.img}` 
                                            : `${import.meta.env.BASE_URL}img/default_img.svg`}
                                        alt="Survey Thumbnail"
                                        className="survey-thumbnail"
                                    />
                                </div>
                                <img
                                    className="part"
                                    src={`${import.meta.env.BASE_URL}img/arrow.svg`}
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
