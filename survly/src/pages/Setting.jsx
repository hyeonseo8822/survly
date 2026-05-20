import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import NavBar from '../components/NavBar';
import Pagination from '../components/Pagination';
import { useNotification } from '../components/NotificationProvider';
import './css/Setting.css';

const ITEMS_PER_PAGE = 6;

function Setting() {
  const [tab, setTab] = useState('comments');
  const [commentPage, setCommentPage] = useState(1);
  const [commentTotalPages, setCommentTotalPages] = useState(1);
  const [comments, setComments] = useState([]);
  const [surveyPage, setSurveyPage] = useState(1);
  const [surveyTotalPages, setSurveyTotalPages] = useState(1);
  const [respondedSurveys, setRespondedSurveys] = useState([]);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { notify } = useNotification();

  const activePage = useMemo(() => (tab === 'comments' ? commentPage : surveyPage), [tab, commentPage, surveyPage]);

  const requireToken = useCallback(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      notify('로그인이 필요합니다.', 'warning');
      navigate('/login');
      return null;
    }
    return token;
  }, [navigate, notify]);

  useEffect(() => {
    const token = requireToken();
    if (!token) return;

    let cancelled = false;

    const fetchData = async () => {
      try {
        setLoading(true);
        if (tab === 'comments') {
          const response = await fetch(`${import.meta.env.VITE_API_BASE}/api/me/comments?page=${commentPage}&limit=${ITEMS_PER_PAGE}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const data = await response.json();

          if (!response.ok || !data.success) {
            throw new Error(data.message || '댓글 목록을 불러오지 못했습니다.');
          }

          if (!cancelled) {
            setComments(data.comments || []);
            setCommentTotalPages(data.totalPages || 1);
          }
        } else {
          const response = await fetch(`${import.meta.env.VITE_API_BASE}/api/me/responses/surveys?page=${surveyPage}&limit=${ITEMS_PER_PAGE}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const data = await response.json();

          if (!response.ok || !data.success) {
            throw new Error(data.message || '참여한 설문 목록을 불러오지 못했습니다.');
          }

          if (!cancelled) {
            setRespondedSurveys(data.surveys || []);
            setSurveyTotalPages(data.totalPages || 1);
          }
        }
      } catch (error) {
        notify(error.message || '설정 데이터를 불러오지 못했습니다.', 'error');
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [tab, commentPage, surveyPage, requireToken, notify]);

  const handleEditComment = async (comment) => {
    const nextContent = window.prompt('댓글을 수정하세요.', comment.content || '');
    if (nextContent === null) {
      return;
    }

    const trimmed = String(nextContent || '').trim();
    if (!trimmed) {
      notify('댓글 내용을 입력해주세요.', 'warning');
      return;
    }

    const token = requireToken();
    if (!token) return;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE}/api/me/comments/${comment.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: trimmed })
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || '댓글 수정에 실패했습니다.');
      }

      setComments((prev) => prev.map((item) => (
        item.id === comment.id ? { ...item, content: trimmed } : item
      )));
      notify('댓글이 수정되었습니다.', 'success');
    } catch (error) {
      notify(error.message || '댓글 수정에 실패했습니다.', 'error');
    }
  };

  const handleDeleteComment = async (commentId) => {
    const confirmed = window.confirm('이 댓글을 삭제하시겠습니까?');
    if (!confirmed) return;

    const token = requireToken();
    if (!token) return;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE}/api/me/comments/${commentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || '댓글 삭제에 실패했습니다.');
      }

      setComments((prev) => prev.filter((item) => item.id !== commentId));
      notify('댓글이 삭제되었습니다.', 'success');
    } catch (error) {
      notify(error.message || '댓글 삭제에 실패했습니다.', 'error');
    }
  };

  const handleEditRespondedSurvey = (surveyId) => {
    navigate(`/surveys/${surveyId}`);
  };

  const handleDeleteRespondedSurvey = async (surveyId) => {
    const confirmed = window.confirm('내 참여 응답을 삭제하시겠습니까?');
    if (!confirmed) return;

    const token = requireToken();
    if (!token) return;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE}/api/me/responses/surveys/${surveyId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || '참여 응답 삭제에 실패했습니다.');
      }

      setRespondedSurveys((prev) => prev.filter((item) => String(item.id) !== String(surveyId)));
      notify('참여 응답이 삭제되었습니다.', 'success');
    } catch (error) {
      notify(error.message || '참여 응답 삭제에 실패했습니다.', 'error');
    }
  };

  return (
    <>
      <NavBar />
      <div className="setting-container">
        <div className="setting-card">
          <div className="setting-header">
            <h1>Setting</h1>
            <select value={tab} onChange={(event) => setTab(event.target.value)}>
              <option value="comments">댓글 관리</option>
              <option value="responses">참여한 설문 관리</option>
            </select>
          </div>

          {loading ? (
            <p className="setting-empty">불러오는 중...</p>
          ) : tab === 'comments' ? (
            comments.length === 0 ? (
              <p className="setting-empty">관리할 댓글이 없습니다.</p>
            ) : (
              <div className="setting-list">
                {comments.map((comment) => (
                  <div className="setting-row" key={comment.id}>
                    <div className="setting-main" onClick={() => navigate(`/surveys/${comment.surveyId}`)}>
                      <p className="setting-title">{comment.surveyTitle}</p>
                      <p className="setting-sub">{comment.content}</p>
                    </div>
                    <div className="setting-actions">
                      <button
                        type="button"
                        className="setting-icon-btn"
                        aria-label="댓글 수정"
                        title="댓글 수정"
                        onClick={() => handleEditComment(comment)}
                      >
                        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
                          <path d="M3 17.25V21h3.75l11-11-3.75-3.75-11 11Zm17.71-10.04a1.003 1.003 0 0 0 0-1.42l-2.5-2.5a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 2-1.66Z" fill="currentColor" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        className="setting-icon-btn danger"
                        aria-label="댓글 삭제"
                        title="댓글 삭제"
                        onClick={() => handleDeleteComment(comment.id)}
                      >
                        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
                          <path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm1 6h2v9h-2V9Zm4 0h2v9h-2V9ZM7 9h2v9H7V9Zm-1 12h12a2 2 0 0 0 2-2V8H4v11a2 2 0 0 0 2 2Z" fill="currentColor" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : respondedSurveys.length === 0 ? (
            <p className="setting-empty">참여한 설문이 없습니다.</p>
          ) : (
            <div className="setting-list">
              {respondedSurveys.map((survey) => (
                <div className="setting-row" key={survey.id}>
                  <div className="setting-main" onClick={() => navigate(`/surveys/${survey.id}`)}>
                    <p className="setting-title">{survey.title}</p>
                    <p className="setting-sub">응답을 수정하거나 참여 기록을 삭제할 수 있습니다.</p>
                  </div>
                  <div className="setting-actions">
                    <button
                      type="button"
                      className="setting-icon-btn"
                      aria-label="응답 수정"
                      title="응답 수정"
                      onClick={() => handleEditRespondedSurvey(survey.id)}
                    >
                      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
                        <path d="M3 17.25V21h3.75l11-11-3.75-3.75-11 11Zm17.71-10.04a1.003 1.003 0 0 0 0-1.42l-2.5-2.5a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 2-1.66Z" fill="currentColor" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className="setting-icon-btn danger"
                      aria-label="응답 삭제"
                      title="응답 삭제"
                      onClick={() => handleDeleteRespondedSurvey(survey.id)}
                    >
                      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
                        <path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm1 6h2v9h-2V9Zm4 0h2v9h-2V9ZM7 9h2v9H7V9Zm-1 12h12a2 2 0 0 0 2-2V8H4v11a2 2 0 0 0 2 2Z" fill="currentColor" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Pagination
            currentPage={activePage}
            totalPages={tab === 'comments' ? commentTotalPages : surveyTotalPages}
            onPageChange={tab === 'comments' ? setCommentPage : setSurveyPage}
          />
        </div>
      </div>
    </>
  );
}

export default Setting;
