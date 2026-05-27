import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './css/Surveys.css';
import Pagination from './Pagination';
import { useNotification } from './NotificationProvider';
import { resolveUploadUrl } from '../utils/uploadUrl';

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
    const [sortBy, setSortBy] = useState('popular'); // 정렬 기준
    const [responseSummaryBySurveyId, setResponseSummaryBySurveyId] = useState({});
    const [bookmarkStateBySurveyId, setBookmarkStateBySurveyId] = useState({});
    const [bookmarkBusyBySurveyId, setBookmarkBusyBySurveyId] = useState({});
    const [bookmarkModalSurveyId, setBookmarkModalSurveyId] = useState(null);
    const [bookmarkModalLoading, setBookmarkModalLoading] = useState(false);
    const navigate = useNavigate();
    const { notify } = useNotification();
    const token = localStorage.getItem('token');

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

    const buildResponseVisualSummary = (results = []) => {
        if (!Array.isArray(results) || results.length === 0) {
            return { kind: 'empty' };
        }

        const objectiveResult = results.find((result) => {
            const summaryEntries = result.summary ? Object.entries(result.summary) : [];
            return summaryEntries.length > 0;
        });

        if (objectiveResult) {
            const summaryEntries = Object.entries(objectiveResult.summary)
                .map(([label, value]) => ({ label, value: Number(value) || 0 }))
                .sort((a, b) => b.value - a.value)
                .slice(0, 3);

            const total = summaryEntries.reduce((acc, current) => acc + current.value, 0) || 1;
            return {
                kind: 'objective',
                question: objectiveResult.question || '객관식 응답',
                bars: summaryEntries.map((entry) => ({
                    label: entry.label,
                    value: entry.value,
                    percent: Math.max(8, Math.round((entry.value / total) * 100))
                }))
            };
        }

        const subjectiveResult = results.find((result) => Array.isArray(result.comments) && result.comments.length > 0);
        if (subjectiveResult) {
            return {
                kind: 'subjective',
                question: subjectiveResult.question || '주관식 응답',
                count: subjectiveResult.comments.length
            };
        }

        return { kind: 'empty' };
    };

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
                const headers = sortBy === 'following' && token ? { Authorization: `Bearer ${token}` } : {};
                const response = await fetch(`${import.meta.env.VITE_API_BASE}/api/surveys?page=${pageNum}&limit=6&isPublic=true&sortBy=${sortBy}`, { headers });
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
    }, [page, sortBy, token]); // 'page' 또는 'sortBy'가 변경될 때마다 이 함수를 다시 실행합니다.

    useEffect(() => {
        const token = localStorage.getItem('token');

        const candidates = surveyList.filter((survey) => {
            const isLegacyPublicSurvey = survey.responseTabPublic === undefined && survey.isPublic === true;
            const isResponseTabVisible = survey.responseTabPublic === true || isLegacyPublicSurvey;
            const hasThumbnail = Boolean(survey.img && survey.img !== 'default_img');
            return isResponseTabVisible && !hasThumbnail;
        });

        if (candidates.length === 0) {
            setResponseSummaryBySurveyId({});
            return;
        }

        let cancelled = false;

        const fetchResponseSummaries = async () => {
            const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

            const summaryPairs = await Promise.all(candidates.map(async (survey) => {
                try {
                    const response = await fetch(`${import.meta.env.VITE_API_BASE}/api/surveys/${survey.id}/results`, { headers });
                    const data = await response.json();

                    if (!response.ok || !data.success) {
                        return [survey.id, { kind: 'empty' }];
                    }

                    return [survey.id, buildResponseVisualSummary(data.results)];
                } catch (err) {
                    return [survey.id, { kind: 'empty' }];
                }
            }));

            if (!cancelled) {
                setResponseSummaryBySurveyId(Object.fromEntries(summaryPairs));
            }
        };

        fetchResponseSummaries();

        return () => {
            cancelled = true;
        };
    }, [surveyList]);

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

            const prevIsBookmarked = Boolean(bookmarkState?.isBookmarked);

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

            const nextIsBookmarked = nextLists.some((list) => list.isBookmarked);
            if (prevIsBookmarked !== nextIsBookmarked) {
                setSurveyList((prev) => prev.map((survey) => {
                    if (survey.id !== surveyId) {
                        return survey;
                    }

                    const currentCount = Number(survey.bookmarkCount) || 0;
                    const nextCount = nextIsBookmarked ? currentCount + 1 : Math.max(0, currentCount - 1);
                    return { ...survey, bookmarkCount: nextCount };
                }));
            }

            notify(targetList.isBookmarked ? '북마크를 해제했습니다.' : '북마크에 추가했습니다.', 'success');
        } catch (error) {
            notify(error.message || '북마크 처리에 실패했습니다.', 'error');
        } finally {
            setBookmarkBusyBySurveyId((prev) => ({ ...prev, [surveyId]: false }));
        }
    };

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
            notify('로그인이 필요합니다.', 'warning');
            navigate('/login');
        } else {
            navigate(`/surveys/${id}`);
        }
    };

    // 에러가 발생한 경우 에러 메시지를 표시합니다.
    if (error) {
        return <div className="surveys"><div className="surveyText">Surveys</div><div className='surveyExplain'>Error: {error}</div></div>;
    }

    const bookmarkModalSurvey = surveyList.find((survey) => survey.id === bookmarkModalSurveyId);
    const bookmarkModalState = bookmarkModalSurveyId ? bookmarkStateBySurveyId[bookmarkModalSurveyId] : null;

    return (
        <div className="surveys">
            <div className="surveyText">Surveys</div>
            <div className='surveyExplain'>여러가지 설문조사들을 확인해보세요!</div>

            {/* 정렬 선택 */}
            <div className="survey-sort-bar" role="group" aria-label="설문 정렬 옵션">
                <div className="survey-sort-options">
                    <button
                        type="button"
                        className={`survey-sort-chip ${sortBy === 'popular' ? 'is-active' : ''}`}
                        onClick={() => { setSortBy('popular'); setPage(1); }}
                    >
                        인기순
                    </button>
                    <button
                        type="button"
                        className={`survey-sort-chip ${sortBy === 'newest' ? 'is-active' : ''}`}
                        onClick={() => { setSortBy('newest'); setPage(1); }}
                    >
                        최신순
                    </button>
                    <button
                        type="button"
                        className={`survey-sort-chip ${sortBy === 'following' ? 'is-active' : ''}`}
                        onClick={() => {
                            if (!token) {
                                notify('팔로우한 사람의 설문을 보려면 로그인이 필요합니다.', 'warning');
                                navigate('/login');
                                return;
                            }

                            setSortBy('following');
                            setPage(1);
                        }}
                    >
                        팔로우한 사람
                    </button>
                </div>
            </div>

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
            
            {/* 로딩 중일 때 'Loading...' 메시지를 표시합니다. */}
            {loading ? (
                <div className='surveyExplain'>Loading...</div>
            ) : (
                // 로딩이 끝나면 설문 목록을 렌더링합니다.
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
                            <p className="survey-bookmark-count">{Number(survey.bookmarkCount) || 0}</p>
                            {/** 응답탭 비공개면 기본 이미지, 이미지가 없고 응답탭 공개면 요약 썸네일 */}
                            {(() => {
                                const isResponseTabPrivate = survey.responseTabPublic === false;
                                const hasThumbnail = Boolean(survey.img && survey.img !== 'default_img');
                                const showSummaryThumb = !isResponseTabPrivate && !hasThumbnail;
                                const summaryData = responseSummaryBySurveyId[survey.id] || { kind: 'empty' };

                                return (
                                    <>
                            {/* 설문 번호: 01, 02, ... 형식으로 표시 */}
                            <p className='num'>{String((page - 1) * 6 + index + 1).padStart(2, '0')}</p>
                            {!showSummaryThumb ? <p className="rectText">{survey.title}</p> : null}

                            <div className="graph">
                                {isResponseTabPrivate ? (
                                        <img
                                            src={import.meta.env.BASE_URL + 'img/default_img.svg'}
                                            alt="Survey Thumbnail"
                                            className="survey-thumbnail"
                                        />
                                ) : hasThumbnail ? (
                                    <img src={resolveUploadUrl(`uploads/${survey.img}`)} alt="Survey Thumbnail" className="survey-thumbnail" />
                                ) : (
                                    <div className="survey-summary-thumb" aria-label="설문 요약 썸네일">
                                        <p className="survey-summary-thumb__title">{survey.title}</p>
                                        {summaryData.kind === 'objective' ? (
                                            <div className="survey-summary-chart">
                                                <p className="survey-summary-chart__question">{summaryData.question}</p>
                                                {summaryData.bars.map((bar, idx) => (
                                                    <div className="survey-summary-chart__row" key={`${bar.label}-${idx}`}>
                                                        <span className="survey-summary-chart__label">{bar.label}</span>
                                                        <div className="survey-summary-chart__track">
                                                            <div className="survey-summary-chart__fill" style={{ width: `${bar.percent}%` }} />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : summaryData.kind === 'subjective' ? (
                                            <div className="survey-summary-chat">
                                                <p className="survey-summary-chat__question">{summaryData.question}</p>
                                                <div className="survey-summary-chat__count">
                                                    <strong>{summaryData.count}</strong>
                                                    <span>개의 의견</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="survey-summary-thumb__description">아직 집계된 응답이 없습니다.</p>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* 화살표 아이콘 */}
                            <img
                                className="part"
                                src={import.meta.env.BASE_URL + 'img/arrow.svg'}
                                alt="arrow"
                            />
                                    </>
                                );
                            })()}
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
