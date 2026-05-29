import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import './css/Create.css'; 
import NavBar2 from '../components/NavBar2';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts"; // 차트 라이브러리
import './css/Answer.css';
import { useNotification } from '../components/NotificationProvider';
import { resolveUploadUrl } from '../utils/uploadUrl';

const toStoredAnswer = (questionType, value) => {
  if (questionType === 'checkboxes') {
    return JSON.stringify(Array.isArray(value) ? value : []);
  }

  if (questionType === 'rating') {
    return String(value || '');
  }

  return String(value || '');
};

const parseStoredAnswer = (questionType, value) => {
  if (questionType !== 'checkboxes') {
    return value;
  }

  try {
    const parsed = JSON.parse(String(value || '[]'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const escapeCsvValue = (value) => {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
};

const toResponseDownloadRows = (survey, responses) => {
  const rows = [
    ['설문 제목', survey?.title || ''],
    ['질문유형', '질문', '내용', '응답수']
  ];

  responses.forEach((result) => {
    let myAnswers = result.myAnswer;
    if (typeof myAnswers === 'string') {
      try {
        const parsed = JSON.parse(myAnswers);
        if (Array.isArray(parsed)) {
          myAnswers = parsed;
        }
      } catch {
        // ignore
      }
    }
    if (!Array.isArray(myAnswers)) {
      myAnswers = myAnswers ? [myAnswers] : [];
    }

    const summaryEntries = result.summary && Object.keys(result.summary).length > 0
      ? Object.entries(result.summary)
      : [];

    if (summaryEntries.length > 0) {
      summaryEntries.forEach(([answer, count]) => {
        rows.push([
          result.type || '',
          result.question || '',
          answer,
          count
        ]);
      });
      return;
    }

    if (Array.isArray(result.comments) && result.comments.length > 0) {
      result.comments.forEach((comment) => {
        rows.push([
          result.type || '',
          result.question || '',
          comment,
          ''
        ]);
      });
    }
  });

  return rows;
};


function Answer() {
  const COMMENT_MAX_LENGTH = 300;
  const [active, setActive] = useState("answer"); // 현재 활성화된 탭 ('answer' 또는 'responses')
  const [loading, setLoading] = useState(false); // 로딩 상태
  const [error, setError] = useState(null); // 에러 상태
  const [survey, setSurvey] = useState(null); // 불러온 설문 데이터
  const [userAnswers, setUserAnswers] = useState({}); // 사용자가 입력한 답변
  const [responses, setResponses] = useState([]); // 설문 결과 데이터
  const [isCreator, setIsCreator] = useState(false); // 현재 사용자가 설문 작성자인지 여부
  const [hasParticipated, setHasParticipated] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [pendingAnswers, setPendingAnswers] = useState([]);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentSaving, setCommentSaving] = useState(false);
  const [replyDraftByCommentId, setReplyDraftByCommentId] = useState({});
  const [replySavingByCommentId, setReplySavingByCommentId] = useState({});
  const [replyOpenByCommentId, setReplyOpenByCommentId] = useState({});
  const [avatarLoadFailedByKey, setAvatarLoadFailedByKey] = useState({});
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [editCommentSaving, setEditCommentSaving] = useState(false);
  const [commentDeleteConfirm, setCommentDeleteConfirm] = useState({ open: false, commentId: null });
  const [focusTargetCommentId, setFocusTargetCommentId] = useState('');
  const [openCommentActionMenuKey, setOpenCommentActionMenuKey] = useState('');

  const { id, link } = useParams(); // URL 파라미터에서 id 또는 link 추출
  const navigate = useNavigate();
  const location = useLocation();
  const { notify } = useNotification();
  const currentUserId = localStorage.getItem('userId') || '';

  const [editingReplyId, setEditingReplyId] = useState(null);
  const [editingReplyText, setEditingReplyText] = useState('');
  const [editReplySaving, setEditReplySaving] = useState(false);

  const resolveAvatarUrl = (avatarUrl) => {
    return resolveUploadUrl(avatarUrl);
  };

  const goToProfile = (targetUserId) => {
    if (!targetUserId) {
      return;
    }
    navigate(`/profile/${targetUserId}`);
  };

  const syncTabToUrl = (nextActive) => {
    const params = new URLSearchParams(location.search);

    if (nextActive === 'responses') {
      params.set('tab', 'responses');
    } else {
      params.delete('tab');
      params.delete('focusComment');
      params.delete('editComment');
    }

    const search = params.toString();
    navigate(
      {
        pathname: location.pathname,
        search: search ? `?${search}` : ''
      },
      { replace: true }
    );
  };

  const handleTabChange = (nextActive) => {
    setActive(nextActive);
    syncTabToUrl(nextActive);
  };

  const appendCommentToTree = (currentComments, nextComment) => {
    if (!nextComment?.parentCommentId) {
      return [nextComment, ...currentComments];
    }

    const insertIntoReplies = (items) => items.map((item) => {
      if (String(item.id) === String(nextComment.parentCommentId)) {
        return {
          ...item,
          replies: [...(Array.isArray(item.replies) ? item.replies : []), nextComment]
        };
      }

      if (!Array.isArray(item.replies) || item.replies.length === 0) {
        return item;
      }

      return {
        ...item,
        replies: insertIntoReplies(item.replies)
      };
    });

    return insertIntoReplies(currentComments);
  };

  useEffect(() => {
    if (id) { // URL에 id 파라미터가 있을 경우
      const token = localStorage.getItem('token');
      if (!token) {
        notify('로그인이 필요합니다. 로그인 페이지로 이동합니다.', 'warning');
        navigate('/login');
      }
    }
  }, [id, navigate, notify]); // id나 navigate 함수가 변경될 때 실행

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    const focusComment = params.get('focusComment') || params.get('editComment');

    setActive(tab === 'responses' ? 'responses' : 'answer');

    if (focusComment) {
      setFocusTargetCommentId(String(focusComment));
      setActive('responses');
    }
  }, [location.search]);

  // Effect 2: 설문 데이터 불러오기
  // id 또는 link가 변경되면 해당 설문 정보를 서버에서 가져옵니다.
  useEffect(() => {
    const fetchSurvey = async () => {
      setLoading(true);
      setError(null);
      let url = '';
      if (link) { // 비공개 링크로 접근한 경우
        url = `${import.meta.env.VITE_API_BASE}/api/s/${link}`;
      } else if (id) { // 설문 ID로 접근한 경우
        url = `${import.meta.env.VITE_API_BASE}/api/surveys/${id}`;
      } else {
        setLoading(false);
        return; // id와 link 모두 없으면 실행 중단
      }

      try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.success) {
          setSurvey(data.survey);
          // 설문 작성자와 현재 로그인한 사용자가 동일한지 확인
          const loggedInUserId = localStorage.getItem('userId');
          if (loggedInUserId && data.survey.userId === loggedInUserId) {
            setIsCreator(true);
            setHasParticipated(true);
          } else {
            setIsCreator(false);
            setHasParticipated(false);
          }
        } else {
          throw new Error(data.message || '설문을 불러오지 못했습니다.');
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchSurvey();
  }, [id, link, navigate]); // id, link, navigate가 변경될 때마다 실행

  useEffect(() => {
    const fetchParticipationStatus = async () => {
      if (!survey?.id) {
        return;
      }

      const token = localStorage.getItem('token');
      if (!token) {
        setHasParticipated(false);
        return;
      }

      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE}/api/surveys/${survey.id}/my-participation-status`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        if (response.ok && data.success) {
          setIsCreator(Boolean(data.isCreator));
          setHasParticipated(Boolean(data.hasParticipated));
        }
      } catch {
        setHasParticipated(false);
      }
    };

    fetchParticipationStatus();
  }, [survey?.id]);

  // Effect 3: '응답' 탭 활성화 시 결과 데이터 불러오기
  useEffect(() => {
    const loadResponseData = async () => {
      if (!survey?.id) return; // 설문 ID가 없으면 중단
      try {
        setLoading(true);
        setError(null);
        const [resultResponse, commentResponse] = await Promise.all([
          fetch(`${import.meta.env.VITE_API_BASE}/api/surveys/${survey.id}/results`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } // 결과 조회는 인증 필요
          }),
          fetch(`${import.meta.env.VITE_API_BASE}/api/surveys/${survey.id}/comments`)
        ]);

        const data = await resultResponse.json();
        const commentData = await commentResponse.json();
        if (data.success) {
          setResponses(data.results);
        } else {
          setError(data.message || '응답을 불러오는 중 오류가 발생했습니다.');
        }

        if (commentData.success) {
          setComments(commentData.comments || []);
        }
      } catch (err) {
        setError('응답을 불러오는 중 오류가 발생했습니다: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    if (active === 'responses') {
      loadResponseData();
    }
  }, [active, survey?.id]); // active 탭이나 survey.id가 변경될 때 실행

  const loadComments = async () => {
    if (!survey?.id) {
      return;
    }

    try {
      setCommentsLoading(true);
      const response = await fetch(`${import.meta.env.VITE_API_BASE}/api/surveys/${survey.id}/comments`);
      const data = await response.json();

      if (response.ok && data.success) {
        setComments(data.comments || []);
      }
    } catch {
      // 댓글은 보조 기능이므로 조용히 실패 처리
    } finally {
      setCommentsLoading(false);
    }
  };

  useEffect(() => {
    if (active !== 'responses' || !focusTargetCommentId || comments.length === 0) {
      return;
    }

    const targetComment = comments.find((item) => String(item.id) === String(focusTargetCommentId));
    if (!targetComment) {
      return;
    }

    const targetElement = document.getElementById(`comment-${targetComment.id}`);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    setFocusTargetCommentId('');
  }, [active, comments, focusTargetCommentId]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!(event.target instanceof Element)) {
        return;
      }

      if (!event.target.closest('.answer-comment-menu-wrap')) {
        setOpenCommentActionMenuKey('');
      }
    };

    document.addEventListener('click', handleOutsideClick);

    return () => {
      document.removeEventListener('click', handleOutsideClick);
    };
  }, []);

  const toggleCommentActionMenu = (menuKey) => {
    setOpenCommentActionMenuKey((prev) => (prev === menuKey ? '' : menuKey));
  };

  const openCommentDeleteConfirm = (commentId) => {
    setOpenCommentActionMenuKey('');
    setCommentDeleteConfirm({ open: true, commentId });
  };

  const startEditComment = (comment) => {
    if (!comment?.id) {
      return;
    }

    const currentUserId = localStorage.getItem('userId');
    if (!currentUserId || String(comment.userId) !== String(currentUserId)) {
      notify('본인 댓글만 수정할 수 있습니다.', 'warning');
      return;
    }

    setEditingCommentId(comment.id);
    setEditingCommentText(comment.content || '');
    setOpenCommentActionMenuKey('');
  };

  const cancelEditComment = () => {
    setEditingCommentId(null);
    setEditingCommentText('');
  };

  const saveEditedComment = async () => {
    if (!editingCommentId || editCommentSaving) {
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      notify('로그인이 필요합니다.', 'warning');
      navigate('/login');
      return;
    }

    const trimmed = String(editingCommentText || '').trim();
    if (!trimmed) {
      notify('댓글 내용을 입력해주세요.', 'warning');
      return;
    }

    try {
      setEditCommentSaving(true);
      const response = await fetch(`${import.meta.env.VITE_API_BASE}/api/me/comments/${editingCommentId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: trimmed })
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || '댓글 수정에 실패했습니다.');
      }

      notify('댓글이 수정되었습니다.', 'success');
      setEditingCommentId(null);
      setEditingCommentText('');
      await loadComments();
    } catch (err) {
      notify(err.message || '댓글 수정에 실패했습니다.', 'error');
    } finally {
      setEditCommentSaving(false);
    }
  };

  const startEditReply = (reply) => {
    if (!reply?.id) return;
    const currentUser = localStorage.getItem('userId');
    if (!currentUser || String(reply.userId) !== String(currentUser)) {
      notify('본인 답글만 수정할 수 있습니다.', 'warning');
      return;
    }
    setEditingReplyId(reply.id);
    setEditingReplyText(reply.content || '');
    setOpenCommentActionMenuKey('');
  };

  const cancelEditReply = () => {
    setEditingReplyId(null);
    setEditingReplyText('');
  };

  const saveEditedReply = async () => {
    if (!editingReplyId || editReplySaving) return;
    const token = localStorage.getItem('token');
    if (!token) { notify('로그인이 필요합니다.', 'warning'); navigate('/login'); return; }
    const trimmed = String(editingReplyText || '').trim();
    if (!trimmed) { notify('내용을 입력해주세요.', 'warning'); return; }
    try {
      setEditReplySaving(true);
      const response = await fetch(`${import.meta.env.VITE_API_BASE}/api/me/comments/${editingReplyId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: trimmed })
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || '답글 수정에 실패했습니다.');
      notify('답글이 수정되었습니다.', 'success');
      setEditingReplyId(null);
      setEditingReplyText('');
      await loadComments();
    } catch (err) {
      notify(err.message || '답글 수정에 실패했습니다.', 'error');
    } finally {
      setEditReplySaving(false);
    }
  };

  const executeDeleteComment = async () => {
    const commentId = commentDeleteConfirm.commentId;
    setCommentDeleteConfirm({ open: false, commentId: null });

    if (!commentId) {
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      notify('로그인이 필요합니다.', 'warning');
      navigate('/login');
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE}/api/me/comments/${commentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || '댓글 삭제에 실패했습니다.');
      }

      notify('댓글이 삭제되었습니다.', 'success');
      if (String(editingCommentId) === String(commentId)) {
        setEditingCommentId(null);
        setEditingCommentText('');
      }
      await loadComments();
    } catch (err) {
      notify(err.message || '댓글 삭제에 실패했습니다.', 'error');
    }
  };

  const submitComment = async () => {
    if (!survey?.id || commentSaving) {
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      notify('댓글 작성은 로그인 후 가능합니다.', 'warning');
      navigate('/login');
      return;
    }

    if (!hasParticipated) {
      notify('설문 참여자만 댓글을 작성할 수 있습니다.', 'warning');
      return;
    }

    const trimmed = commentText.trim();
    if (!trimmed) {
      notify('댓글 내용을 입력해주세요.', 'warning');
      return;
    }

    try {
      setCommentSaving(true);
      const response = await fetch(`${import.meta.env.VITE_API_BASE}/api/surveys/${survey.id}/comments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: trimmed })
      });

      const result = await response.json();
      if (response.status === 401 || response.status === 403) {
        const message = String(result?.message || '');
        if (message.includes('토큰')) {
          localStorage.removeItem('token');
          localStorage.removeItem('userId');
          notify('로그인 정보가 만료되었습니다. 다시 로그인해주세요.', 'warning');
          navigate('/login');
          return;
        }
      }
      if (!response.ok || !result.success) {
        throw new Error(result.message || '댓글 등록에 실패했습니다.');
      }

      setComments((prev) => appendCommentToTree(prev, { ...result.comment, replies: [] }));
      setCommentText('');
      notify('댓글이 등록되었습니다.', 'success');
    } catch (err) {
      notify(err.message || '댓글 등록에 실패했습니다.', 'error');
    } finally {
      setCommentSaving(false);
    }
  };

  const handleCommentKeyDown = (event) => {
    if (event.key !== 'Enter') {
      return;
    }

    if (event.nativeEvent?.isComposing) {
      return;
    }

    if (event.shiftKey) {
      event.preventDefault();
      const textarea = event.currentTarget;
      const start = textarea.selectionStart ?? commentText.length;
      const end = textarea.selectionEnd ?? commentText.length;
      const nextValue = `${commentText.slice(0, start)}\n${commentText.slice(end)}`;
      setCommentText(nextValue);

      requestAnimationFrame(() => {
        textarea.selectionStart = start + 1;
        textarea.selectionEnd = start + 1;
        textarea.focus();
      });
      return;
    }

    event.preventDefault();
    submitComment();
  };

  const submitReply = async (parentCommentId) => {
    if (!survey?.id || !parentCommentId || replySavingByCommentId[parentCommentId]) {
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      notify('답글 작성은 로그인 후 가능합니다.', 'warning');
      navigate('/login');
      return;
    }

    if (!hasParticipated) {
      notify('설문 참여자만 답글을 작성할 수 있습니다.', 'warning');
      return;
    }

    const draft = String(replyDraftByCommentId[parentCommentId] || '');
    const trimmed = draft.trim();
    if (!trimmed) {
      notify('답글 내용을 입력해주세요.', 'warning');
      return;
    }

    try {
      setReplySavingByCommentId((prev) => ({ ...prev, [parentCommentId]: true }));
      const response = await fetch(`${import.meta.env.VITE_API_BASE}/api/surveys/${survey.id}/comments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: trimmed, parentCommentId })
      });

      const result = await response.json();
      if (response.status === 401 || response.status === 403) {
        const message = String(result?.message || '');
        if (message.includes('토큰')) {
          localStorage.removeItem('token');
          localStorage.removeItem('userId');
          notify('로그인 정보가 만료되었습니다. 다시 로그인해주세요.', 'warning');
          navigate('/login');
          return;
        }
      }
      if (!response.ok || !result.success) {
        throw new Error(result.message || '답글 등록에 실패했습니다.');
      }

      setComments((prev) => appendCommentToTree(prev, { ...result.comment, replies: [] }));
      setReplyDraftByCommentId((prev) => ({ ...prev, [parentCommentId]: '' }));
      setReplyOpenByCommentId((prev) => ({ ...prev, [parentCommentId]: false }));
      notify('답글이 등록되었습니다.', 'success');
    } catch (err) {
      notify(err.message || '답글 등록에 실패했습니다.', 'error');
    } finally {
      setReplySavingByCommentId((prev) => ({ ...prev, [parentCommentId]: false }));
    }
  };

  // --- Event Handlers ---

  /**
   * @function handleAnswerChange
   * @description 사용자가 답변을 입력/선택할 때마다 userAnswers state를 업데이트합니다.
   * @param {number} questionId - 질문 ID
   * @param {string} value - 입력/선택된 값
   */
  const handleAnswerChange = (questionId, value) => {
    setUserAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleCheckboxChange = (questionId, option, checked) => {
    const current = parseStoredAnswer('checkboxes', userAnswers[questionId]);

    if (checked) {
      if (current.includes(option)) {
        return;
      }
      handleAnswerChange(questionId, [...current, option]);
      return;
    }

    handleAnswerChange(questionId, current.filter((selected) => selected !== option));
  };

  const requestSubmit = async (answersToSubmit, overwrite = false) => {
    const token = localStorage.getItem('token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${import.meta.env.VITE_API_BASE}/api/surveys/${survey.id}/responses`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ answers: answersToSubmit, overwrite })
    });
    const result = await response.json();
    return { response, result };
  };

  const handleConfirmOverwrite = async () => {
    if (loading || !survey?.id || pendingAnswers.length === 0) {
      setShowDuplicateModal(false);
      return;
    }

    try {
      setShowDuplicateModal(false);
      setLoading(true);
      setError(null);

      const overwriteResult = await requestSubmit(pendingAnswers, true);
      if (overwriteResult.response.ok && overwriteResult.result.success) {
        notify('답변이 수정되었습니다!', 'success');
        setHasParticipated(true);
        handleTabChange('responses');
        return;
      }

      throw new Error(overwriteResult.result.message || '답변 수정에 실패했습니다.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setPendingAnswers([]);
    }
  };

  const handleCancelOverwrite = () => {
    setShowDuplicateModal(false);
    setPendingAnswers([]);
  };

  /**
   * @async
   * @function submitAnswer
   * @description '제출' 버튼 클릭 시 실행됩니다. 필수 질문 검증 후 서버에 답변을 전송합니다.
   */
  const submitAnswer = async () => {
    if (loading || !survey?.id) return;

    // 필수 질문(isRequired)에 모두 답변했는지 검증
    for (const q of survey.questions) {
      if (q.isRequired === 1) {
        const answer = userAnswers[q.questionId];
        const isEmptyCheckbox = q.type === 'checkboxes' && (!Array.isArray(answer) || answer.length === 0);
        const isEmptyString = (q.type !== 'checkboxes') && (!answer || (typeof answer === 'string' && answer.trim() === ''));

        if (isEmptyCheckbox || isEmptyString) {
          notify(`'${q.question}'은(는) 필수 질문입니다. 답변을 입력해주세요.`, 'warning');
          return; // 검증 실패 시 제출 중단
        }
      }
    }

    const answersToSubmit = Object.keys(userAnswers).map((questionId) => {
      const question = survey.questions.find((item) => item.questionId === questionId);
      return {
        questionId,
        answer: toStoredAnswer(question?.type, userAnswers[questionId])
      };
    });

    try {
      setLoading(true);
      setError(null);

      const { response, result } = await requestSubmit(answersToSubmit, false);

      if (response.ok && result.success) {
        notify('답변이 성공적으로 제출되었습니다!', 'success');
        setHasParticipated(true);
        handleTabChange('responses');
        return;
      }

      const duplicateMessage = String(result.message || '');
      const alreadyParticipated =
        response.status === 409 &&
        (result.code === 'ALREADY_PARTICIPATED' || duplicateMessage.includes('이미 참여하신 설문'));
      if (alreadyParticipated) {
        setPendingAnswers(answersToSubmit);
        setShowDuplicateModal(true);
        return;
      }

      throw new Error(result.message || '답변 제출에 실패했습니다.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // '응답' 탭을 보여줄지 결정하는 로직
  // 공개 설문(link가 null)이거나, 비공개 설문이면서 현재 사용자가 작성자일 경우에만 true
  const showResponseTab = Boolean(survey) && (Boolean(survey.responseTabPublic) || isCreator || hasParticipated);

  const renderBottomControls = () => (
    <div className='answer-bottom-controls'>
      {active !== 'responses' && (
        <button
          type='button'
          className='answer-bottom-submit-btn'
          disabled={loading}
          onClick={!loading ? submitAnswer : undefined}
        >
          {loading ? '처리 중...' : '제출'}
        </button>
      )}
    </div>
  );

  const downloadResponseSheet = () => {
    if (!survey) {
      notify('설문 정보를 불러오지 못했습니다.', 'warning');
      return;
    }

    const rows = toResponseDownloadRows(survey, responses);
    const csv = `\ufeff${rows.map((row) => row.map(escapeCsvValue).join(',')).join('\n')}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const linkElement = document.createElement('a');
    const safeTitle = String(survey.title || 'survey').replace(/[\\/:*?"<>|]/g, '_');
    linkElement.href = url;
    linkElement.download = `${safeTitle}-responses.csv`;
    document.body.appendChild(linkElement);
    linkElement.click();
    document.body.removeChild(linkElement);
    URL.revokeObjectURL(url);
  };

  // 초기 로딩 중일 때
  if (loading && !survey) return <div className='container'><p>로딩 중...</p></div>;
  // 에러 발생 시
  if (error && active !== 'responses') return <div className='container'><p>오류: {error}</p></div>;

  return (
    <div className="answer-container">
      <NavBar2
        active={active}
        setActive={handleTabChange}
        loading={loading}
        tab1Text="답변"
        showResponseTab={showResponseTab}
        showButton={false}
        showRightAction={active === 'responses' && Boolean(survey)}
        rightActionText='시트 다운로드'
        onRightAction={downloadResponseSheet}
        rightActionDisabled={loading}
      />
      {/* '응답' 탭에서 발생한 에러는 탭 안에 표시 */}
      {error && active === 'responses' && <div className='error-message'>{error}</div>}
      
      {/* '답변' 탭 뷰 */}
      {active === 'answer' && survey && (
        <div className='answerContentWrapper'>
          <div className="answer-title-box">
            <div className="answer-title">{survey.title}</div>
            <div className="answer-description">{survey.description}</div>
            {survey.embedUrl && (
              <div className='answer-embed-box'>
                <iframe
                  title='survey-embed'
                  src={survey.embedUrl}
                  loading='lazy'
                  referrerPolicy='no-referrer-when-downgrade'
                  allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
                  allowFullScreen
                />
              </div>
            )}
          </div>
          {survey.questions.map((q) => (
            <div key={q.questionId} className='result-item-box'>
              <h4>
                {q.question}
                {q.isRequired === 1 && <span style={{ color: 'red' }}> *</span>}
              </h4>
              {/* 객관식 질문 */}
              {q.type === 'multiple-choice' && (
                <div className='radioOptions'>
                  {q.options.map((opt, idx) => (
                    <div key={idx} className='radio-option-container'>
                      <input type='radio' name={`answer-${q.questionId}`} value={opt} onChange={(e) => handleAnswerChange(q.questionId, e.target.value)} />
                      <label>{opt}</label>
                    </div>
                  ))}
                </div>
              )}
              {q.type === 'checkboxes' && (
                <div className='radioOptions'>
                  {q.options.map((opt, idx) => {
                    const selected = Array.isArray(userAnswers[q.questionId]) && userAnswers[q.questionId].includes(opt);
                    return (
                      <div key={idx} className='radio-option-container'>
                        <input
                          type='checkbox'
                          name={`answer-${q.questionId}-${idx}`}
                          checked={selected}
                          onChange={(e) => handleCheckboxChange(q.questionId, opt, e.target.checked)}
                        />
                        <label>{opt}</label>
                      </div>
                    );
                  })}
                </div>
              )}
              {/* 주관식 질문 */}
              {q.type === 'text' && (
                <div className='subjectiveInput'>
                  <input type='text' placeholder='답변을 입력하세요' onChange={(e) => handleAnswerChange(q.questionId, e.target.value)} />
                </div>
              )}
              {q.type === 'long-text' && (
                <div className='subjectiveInput'>
                  <textarea placeholder='자세한 답변을 입력하세요' onChange={(e) => handleAnswerChange(q.questionId, e.target.value)} />
                </div>
              )}
              {q.type === 'rating' && (
                <div className='answer-rating-group'>
                  {[1, 2, 3, 4, 5].map((score) => (
                    <button
                      key={score}
                      type='button'
                      className={`answer-rating-btn ${String(userAnswers[q.questionId] || '') === String(score) ? 'is-active' : ''}`}
                      onClick={() => handleAnswerChange(q.questionId, String(score))}
                    >
                      {score}
                    </button>
                  ))}
                </div>
              )}
              {q.type === 'date' && (
                <div className='subjectiveInput'>
                  <input type='date' onChange={(e) => handleAnswerChange(q.questionId, e.target.value)} />
                </div>
              )}
            </div>
          ))}

          {renderBottomControls()}
        </div>
      )}

      {/* '응답' 탭 뷰 */}
      {active === 'responses' && survey && (
        <div className='answerContentWrapper'>
          {loading ? (
            <p className="loading-message">응답을 불러오는 중...</p>
          ) : responses.length === 0 ? (
            <p className="no-responses-message">아직 응답이 없습니다.</p>
          ) : (
            <>
              <div className="answer-title-box">
                <div className="answer-title">{survey.title}</div>
                <div className="answer-description">{survey.description}</div>
                {survey.embedUrl && (
                  <div className='answer-embed-box'>
                    <iframe
                      title='survey-result-embed'
                      src={survey.embedUrl}
                      loading='lazy'
                      referrerPolicy='no-referrer-when-downgrade'
                      allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
                      allowFullScreen
                    />
                  </div>
                )}
              </div>

              {responses.map((result, idx) => {
                // Highlight logic for 객관식 (BarChart)
                // Assume result.myAnswer (string or array) is the current user's answer for this question
                // If not present, fallback to result.myAnswers or similar, or skip highlight
                let myAnswers = result.myAnswer;
                if (typeof myAnswers === 'string') {
                  try {
                    // Try to parse JSON for checkboxes
                    const parsed = JSON.parse(myAnswers);
                    if (Array.isArray(parsed)) myAnswers = parsed;
                  } catch { /* ignore */ }
                }
                if (!Array.isArray(myAnswers)) myAnswers = myAnswers ? [myAnswers] : [];

                return (
                  <div key={idx} className='result-item-box'>
                    <h4>{result.question}</h4>
                    {/* 객관식 결과: 차트로 표시 */}
                    {result.summary && Object.keys(result.summary).length > 0 ? (
                      <div style={{ width: "95%", height: 250, margin: '20px auto' }}>
                        <strong>객관식 응답 통계:</strong>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={Object.entries(result.summary).map(([answer, count]) => ({ answer, count: Number(count) }))} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="answer" />
                            <YAxis allowDecimals={false} />
                            <Tooltip />
                            <Bar
                              dataKey="count"
                              // Custom bar color: highlight user's answer(s)
                              {
                                ...{
                                  shape: (props) => {
                                    const { x, y, width, height, payload } = props;
                                    const isMine = myAnswers.includes(payload.answer);
                                    return (
                                      <g>
                                        <rect
                                          x={x}
                                          y={y}
                                          width={width}
                                          height={height}
                                          fill={isMine ? '#FFB347' : '#6AB9FF'}
                                          stroke={isMine ? '#FF8000' : 'none'}
                                          strokeWidth={isMine ? 2 : 0}
                                          rx={3}
                                        />
                                        {isMine && height > 20 && (
                                          <text x={x + width / 2} y={y - 6} textAnchor="middle" fill="#FF8000" fontWeight="bold" fontSize="13">내 응답</text>
                                        )}
                                      </g>
                                    );
                                  }
                                }
                              }
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : /* 주관식 결과: 목록으로 표시 */
                    result.comments && result.comments.length > 0 ? (
                      <div>
                        <strong>주관식 응답:</strong>
                        <ul className="text-answers-list">
                          {result.comments.map((comment, commentIdx) => {
                            // If result.myAnswer exists and matches this comment, highlight
                            const isMine = Array.isArray(result.myAnswer)
                              ? result.myAnswer.includes(comment)
                              : result.myAnswer === comment;
                            return (
                              <li
                                key={commentIdx}
                                className={isMine ? 'my-text-answer' : ''}
                                style={isMine ? { color: '#FF8000', fontWeight: 'bold', background: '#FFF3E0', borderRadius: 4, padding: '2px 6px' } : {}}
                              >
                                {comment}
                                {isMine && <span style={{ marginLeft: 6, color: '#FF8000', fontSize: 12 }}>(내 응답)</span>}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ) : (
                      <p>아직 응답이 없습니다.</p>
                    )}
                  </div>
                );
              })}

              <div className='result-item-box answer-comment-box'>
                <h4>댓글</h4>
                {commentsLoading ? (
                  <p className='answer-comment-empty'>댓글을 불러오는 중...</p>
                ) : comments.length === 0 ? (
                  <p className='answer-comment-empty'>아직 댓글이 없습니다.</p>
                ) : (
                  <ul className='answer-comment-list'>
                    {comments.map((comment) => (
                      <li key={comment.id} id={`comment-${comment.id}`} className='answer-comment-item'>
                        <div className='answer-comment-item__meta'>
                          <button type='button' className='answer-comment-item__author answer-comment-item__author-btn' onClick={() => goToProfile(comment.userId)}>
                            <div className='answer-comment-item__avatar'>
                              {comment.avatarUrl && !avatarLoadFailedByKey[`comment-${comment.id}`] ? (
                                <img
                                  src={resolveAvatarUrl(comment.avatarUrl)}
                                  alt=''
                                  onError={() => setAvatarLoadFailedByKey((prev) => ({ ...prev, [`comment-${comment.id}`]: true }))}
                                />
                              ) : (
                                <span>{String(comment.displayName || comment.userId || 'SV').slice(0, 2).toUpperCase()}</span>
                              )}
                            </div>
                            <strong>{comment.displayName || comment.userId}</strong>
                          </button>
                          <div className='answer-comment-item__meta-right'>
                            <div className='answer-comment-time-wrap'>
                              <span>{new Date(comment.created_at).toLocaleString('ko-KR')}</span>
                            </div>
                            {String(comment.userId) === String(currentUserId) && (
                              <div className='answer-comment-menu-wrap'>
                                <button
                                  type='button'
                                  className='answer-comment-menu-btn'
                                  aria-label='댓글 옵션'
                                  onClick={() => toggleCommentActionMenu(`comment-${comment.id}`)}
                                >
                                  ...
                                </button>
                                {openCommentActionMenuKey === `comment-${comment.id}` && (
                                  <div className='answer-comment-menu'>
                                    <button type='button' onClick={() => startEditComment(comment)}>수정</button>
                                    <button type='button' onClick={() => openCommentDeleteConfirm(comment.id)}>삭제</button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        {String(editingCommentId) === String(comment.id) ? (
                          <div className='answer-comment-edit-wrap'>
                            <textarea
                              value={editingCommentText}
                              maxLength={COMMENT_MAX_LENGTH}
                              onChange={(e) => setEditingCommentText(e.target.value)}
                            />
                            <div className='answer-comment-input-meta'>
                              <span>{String(editingCommentText || '').length}/{COMMENT_MAX_LENGTH}</span>
                              <div className='answer-comment-edit-actions'>
                                <button type='button' className='answer-comment-edit-btn answer-comment-edit-btn--ghost' onClick={cancelEditComment}>
                                  취소
                                </button>
                                <button type='button' className='answer-comment-edit-btn' onClick={saveEditedComment} disabled={editCommentSaving}>
                                  {editCommentSaving ? '저장 중...' : '저장'}
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <p>{comment.content}</p>
                        )}

                        <div className='answer-comment-actions'>
                          <button
                            type='button'
                            className='answer-comment-reply-btn'
                            onClick={() => {
                              if (!hasParticipated) {
                                notify('설문 참여자만 답글을 작성할 수 있습니다.', 'warning');
                                return;
                              }
                              setReplyOpenByCommentId((prev) => ({ ...prev, [comment.id]: !prev[comment.id] }));
                            }}
                          >
                            {replyOpenByCommentId[comment.id] ? '답글 닫기' : '답글'}
                          </button>
                        </div>

                        {Array.isArray(comment.replies) && comment.replies.length > 0 && (
                          <ul className='answer-reply-list'>
                            {comment.replies.map((reply) => (
                              <li key={reply.id} className='answer-reply-item'>
                                <div className='answer-comment-item__meta'>
                                  <button type='button' className='answer-comment-item__author answer-comment-item__author-btn' onClick={() => goToProfile(reply.userId)}>
                                    <div className='answer-comment-item__avatar answer-comment-item__avatar--small'>
                                      {reply.avatarUrl && !avatarLoadFailedByKey[`reply-${reply.id}`] ? (
                                        <img
                                          src={resolveAvatarUrl(reply.avatarUrl)}
                                          alt=''
                                          onError={() => setAvatarLoadFailedByKey((prev) => ({ ...prev, [`reply-${reply.id}`]: true }))}
                                        />
                                      ) : (
                                        <span>{String(reply.displayName || reply.userId || 'SV').slice(0, 2).toUpperCase()}</span>
                                      )}
                                    </div>
                                    <strong>{reply.displayName || reply.userId}</strong>
                                  </button>
                                  <div className='answer-comment-item__meta-right'>
                                    <div className='answer-comment-time-wrap answer-comment-time-wrap--reply'>
                                      <span>{new Date(reply.created_at).toLocaleString('ko-KR')}</span>
                                    </div>
                                    {String(reply.userId) === String(currentUserId) && (
                                      <div className='answer-comment-menu-wrap'>
                                        <button
                                          type='button'
                                          className='answer-comment-menu-btn'
                                          aria-label='답글 옵션'
                                          onClick={() => toggleCommentActionMenu(`reply-${reply.id}`)}
                                        >
                                          ...
                                        </button>
                                        {openCommentActionMenuKey === `reply-${reply.id}` && (
                                          <div className='answer-comment-menu'>
                                            <button type='button' onClick={() => startEditReply(reply)}>수정</button>
                                            <button type='button' onClick={() => openCommentDeleteConfirm(reply.id)}>삭제</button>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <p>{reply.content}</p>
                                    {String(editingReplyId) === String(reply.id) ? (
                                      <div className='answer-reply-edit-wrap'>
                                        <textarea
                                          value={editingReplyText}
                                          maxLength={COMMENT_MAX_LENGTH}
                                          onChange={(e) => setEditingReplyText(e.target.value)}
                                        />
                                        <div className='answer-comment-input-meta'>
                                          <span>{String(editingReplyText || '').length}/{COMMENT_MAX_LENGTH}</span>
                                          <div className='answer-reply-edit-actions'>
                                            <button type='button' className='answer-comment-edit-btn answer-comment-edit-btn--ghost' onClick={cancelEditReply}>취소</button>
                                            <button type='button' className='answer-comment-edit-btn' onClick={saveEditedReply} disabled={editReplySaving}>{editReplySaving ? '저장 중...' : '저장'}</button>
                                          </div>
                                        </div>
                                      </div>
                                    ) : null}
                                  </li>
                            ))}
                          </ul>
                        )}

                        {replyOpenByCommentId[comment.id] && (
                          <div className='answer-reply-input-wrap'>
                            <textarea
                              value={replyDraftByCommentId[comment.id] || ''}
                              maxLength={COMMENT_MAX_LENGTH}
                              placeholder='답글을 입력하세요.'
                              disabled={!hasParticipated}
                              onChange={(e) => setReplyDraftByCommentId((prev) => ({ ...prev, [comment.id]: e.target.value }))}
                            />
                            <div className='answer-comment-input-meta'>
                              <span>{String(replyDraftByCommentId[comment.id] || '').length}/{COMMENT_MAX_LENGTH}</span>
                              <button type='button' onClick={() => submitReply(comment.id)} disabled={!hasParticipated || Boolean(replySavingByCommentId[comment.id])}>
                                {replySavingByCommentId[comment.id] ? '등록 중...' : '답글 등록'}
                              </button>
                            </div>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}

                <div className='answer-comment-input-wrap'>
                  <textarea
                    value={commentText}
                    maxLength={COMMENT_MAX_LENGTH}
                    placeholder={hasParticipated ? '응답에 대한 의견을 남겨보세요.' : '설문 참여자만 댓글을 작성할 수 있습니다.'}
                    disabled={!hasParticipated}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={handleCommentKeyDown}
                  />
                  <div className='answer-comment-input-meta'>
                    <span>{commentText.length}/{COMMENT_MAX_LENGTH}</span>
                    <button type='button' onClick={submitComment} disabled={!hasParticipated || commentSaving}>
                      {commentSaving ? '등록 중...' : '댓글 등록'}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {renderBottomControls()}
        </div>
      )}

      {showDuplicateModal && (
        <div className="answer-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="duplicate-modal-title">
          <div className="answer-modal-card">
            <h3 id="duplicate-modal-title">이미 참여하신 설문입니다.</h3>
            <p>답변을 수정하시겠습니까?</p>
            <div className="answer-modal-actions">
              <button type="button" className="answer-modal-btn answer-modal-btn--ghost" onClick={handleCancelOverwrite}>
                취소
              </button>
              <button type="button" className="answer-modal-btn answer-modal-btn--primary" onClick={handleConfirmOverwrite}>
                수정하기
              </button>
            </div>
          </div>
        </div>
      )}

      {commentDeleteConfirm.open && (
        <div className="answer-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="comment-delete-modal-title">
          <div className="answer-modal-card">
            <h3 id="comment-delete-modal-title">댓글 삭제</h3>
            <p>이 댓글을 삭제하시겠습니까?</p>
            <div className="answer-modal-actions">
              <button
                type="button"
                className="answer-modal-btn answer-modal-btn--ghost"
                onClick={() => setCommentDeleteConfirm({ open: false, commentId: null })}
              >
                취소
              </button>
              <button
                type="button"
                className="answer-modal-btn answer-modal-btn--primary"
                onClick={executeDeleteComment}
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Answer;