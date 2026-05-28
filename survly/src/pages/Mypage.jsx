import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './css/Mypage.css';
import NavBar from '../components/NavBar';
import Pagination from '../components/Pagination';
import { useNotification } from '../components/NotificationProvider';
import { resolveUploadUrl } from '../utils/uploadUrl';

// 미리보기에 보여줄 항목의 수
const ITEMS_PER_PAGE = 4;
// 상세 페이지에 보여줄 항목의 수
const DETAIL_PER_PAGE = 10;
const AUTH_EXPIRED_ERROR = 'AUTH_EXPIRED';

const createDefaultProfile = (userId = '') => ({
    userId,
    email: '',
    displayName: userId,
    headline: '',
    bio: '',
    avatarUrl: '',
    followerCount: 0,
    followingCount: 0
});

const getProfileStorageKey = (userId) => `survly-profile-${userId}`;

const readLocalJson = (key, fallback) => {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch {
        return fallback;
    }
};


function Mypage() {
    const [createdSurveys, setCreatedSurveys] = useState([]); // 내가 생성한 설문 목록
    // const [previewCreatedSurveys, setPreviewCreatedSurveys] = useState([]); // 미사용 변수 제거
    const [bookmarkLists, setBookmarkLists] = useState([]);
    const [selectedBookmarkListId, setSelectedBookmarkListId] = useState('');
    const [bookmarkSurveys, setBookmarkSurveys] = useState([]);
    const [bookmarkListPage, setBookmarkListPage] = useState(1);
    const [bookmarkListTotalPages, setBookmarkListTotalPages] = useState(0);
    const [newBookmarkListName, setNewBookmarkListName] = useState('');
    const [isBookmarkModalOpen, setIsBookmarkModalOpen] = useState(false);
    const [bookmarkModalMode, setBookmarkModalMode] = useState('create');
    const [bookmarkListCreating, setBookmarkListCreating] = useState(false);
    const [isBookmarkListMenuOpen, setIsBookmarkListMenuOpen] = useState(false);
    const [openSurveyMenuId, setOpenSurveyMenuId] = useState('');
    const [openRespondedSurveyMenuId, setOpenRespondedSurveyMenuId] = useState('');
    const [selectedCreatedSurveyIds, setSelectedCreatedSurveyIds] = useState([]);
    const [selectedBookmarkListIds, setSelectedBookmarkListIds] = useState([]);
    const [selectedBookmarkSurveyIds, setSelectedBookmarkSurveyIds] = useState([]);
    const [selectedRespondedSurveyIds, setSelectedRespondedSurveyIds] = useState([]);
    const [loading, setLoading] = useState({ created: true, bookmarkLists: true, bookmarkSurveys: false }); // 각 목록의 로딩 상태
    const [error, setError] = useState(null); // 에러 메시지
    const [createdPage, setCreatedPage] = useState(1); // '생성한 설문'의 현재 페이지
    const [createdTotalPages, setCreatedTotalPages] = useState(0); // '생성한 설문'의 전체 페이지 수
    const [bookmarkListOverviewPage, setBookmarkListOverviewPage] = useState(1);
    const [loggedInUserId, setLoggedInUserId] = useState(null); // 로그인된 사용자 ID
    const [profile, setProfile] = useState(createDefaultProfile());
    const [profileDraft, setProfileDraft] = useState(createDefaultProfile());
    const [profileLoading, setProfileLoading] = useState(true);
    const [profileSaving, setProfileSaving] = useState(false);
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [avatarPreview, setAvatarPreview] = useState('');
    const [selectedAvatarFile, setSelectedAvatarFile] = useState(null);
    const [userIdCheck, setUserIdCheck] = useState({ status: 'idle', message: '', checkedValue: '' });
    const [deleteConfirm, setDeleteConfirm] = useState({ open: false, surveyId: null });
    const [responseDeleteConfirm, setResponseDeleteConfirm] = useState({ open: false, surveyId: null });
    const [relationView, setRelationView] = useState('created');
    const [relationUsers, setRelationUsers] = useState([]);
    const [relationLoading, setRelationLoading] = useState(false);
    // 미사용 프리뷰 상태 제거
    const [commentManagePage, setCommentManagePage] = useState(1);
    const [commentManageTotalPages, setCommentManageTotalPages] = useState(1);
    const [managedComments, setManagedComments] = useState([]);
    const [selectedCommentIds, setSelectedCommentIds] = useState([]);
    const [commentDeleteConfirm, setCommentDeleteConfirm] = useState({ open: false, count: 0 });
    const [responseManagePage, setResponseManagePage] = useState(1);
    const [responseManageTotalPages, setResponseManageTotalPages] = useState(1);
    const [managedRespondedSurveys, setManagedRespondedSurveys] = useState([]);
    const [manageLoading, setManageLoading] = useState(false);
    const [brokenAvatarKeys, setBrokenAvatarKeys] = useState({});

    const navigate = useNavigate();
    const { section } = useParams();
    const { notify } = useNotification();
    const avatarInputRef = useRef(null);
    const authRedirectedRef = useRef(false);

    const displayedAvatar = avatarPreview || profileDraft.avatarUrl || profile.avatarUrl;
    const avatarFallback = (profileDraft.displayName || profile.displayName || loggedInUserId || 'SV').slice(0, 2).toUpperCase();
    const selectedBookmarkList = bookmarkLists.find((list) => list.id === selectedBookmarkListId) || null;
    // 왼쪽 프로필은 팔로워/팔로잉에서도 유지하고, 리스트 상세만 중앙 정렬
    const isCenterOnlyView = relationView === 'bookmark-list';

    const toStringId = (value) => String(value);

    const markAvatarBroken = (key) => {
        setBrokenAvatarKeys((prev) => ({ ...prev, [key]: true }));
    };

    const isAllVisibleSelected = (visibleIds, selectedIds) => {
        if (!visibleIds.length) {
            return false;
        }

        return visibleIds.every((id) => selectedIds.includes(toStringId(id)));
    };

    const toggleSelectedIds = (setter, itemId) => {
        const nextId = toStringId(itemId);
        setter((prev) => (
            prev.includes(nextId)
                ? prev.filter((id) => id !== nextId)
                : [...prev, nextId]
        ));
    };

    const toggleSelectAllVisible = (visibleIds, selectedIds, setter) => {
        const visibleStringIds = visibleIds.map(toStringId);
        const allSelected = isAllVisibleSelected(visibleStringIds, selectedIds);

        setter((prev) => {
            if (allSelected) {
                return prev.filter((id) => !visibleStringIds.includes(id));
            }

            return Array.from(new Set([...prev, ...visibleStringIds]));
        });
    };

    const persistLocalProfile = (userId, nextProfile) => {
        localStorage.setItem(getProfileStorageKey(userId), JSON.stringify(nextProfile));
    };

    const hydrateLocalProfile = (userId) => {
        const storedProfile = readLocalJson(getProfileStorageKey(userId), {});
        const nextProfile = {
            ...createDefaultProfile(userId),
            ...storedProfile,
            userId,
            displayName: storedProfile.displayName || userId
        };

        setProfile(nextProfile);
        setProfileDraft(nextProfile);
        return nextProfile;
    };

    const isAuthExpiredError = (error) => error?.code === AUTH_EXPIRED_ERROR;

    const handleAuthExpired = useCallback(() => {
        if (authRedirectedRef.current) {
            return;
        }

        authRedirectedRef.current = true;
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        notify('로그인 정보가 만료되었습니다. 다시 로그인해주세요.', 'warning');
        navigate('/login', { replace: true });
    }, [navigate, notify]);

    const safeParseJson = useCallback(async (response) => {
        const text = await response.text();
        let data;

        try {
            data = text ? JSON.parse(text) : {};
        } catch {
            throw new Error('서버 응답을 처리하지 못했습니다. 서버 연결 상태를 확인해주세요.');
        }

        if (response.status === 401 || response.status === 403) {
            handleAuthExpired();
            const authError = new Error('로그인 정보가 만료되었습니다.');
            authError.code = AUTH_EXPIRED_ERROR;
            throw authError;
        }

        return data;
    }, [handleAuthExpired]);

    const fetchMyComments = useCallback(async ({ page = 1, limit = ITEMS_PER_PAGE }) => {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('로그인이 필요합니다.');
        }

        const response = await fetch(`${import.meta.env.VITE_API_BASE}/api/me/comments?page=${page}&limit=${limit}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await safeParseJson(response);

        if (!response.ok || !data.success) {
            throw new Error(data.message || '댓글 목록을 불러오지 못했습니다.');
        }

        return data;
    }, [safeParseJson]);

    const fetchMyRespondedSurveys = useCallback(async ({ page = 1, limit = ITEMS_PER_PAGE }) => {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('로그인이 필요합니다.');
        }

        const response = await fetch(`${import.meta.env.VITE_API_BASE}/api/me/responses/surveys?page=${page}&limit=${limit}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await safeParseJson(response);

        if (!response.ok || !data.success) {
            throw new Error(data.message || '참여한 설문 목록을 불러오지 못했습니다.');
        }

        return data;
    }, [safeParseJson]);

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
    const fetchApi = useCallback(async (url, setter, totalPagesSetter, type) => {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('로그인이 필요합니다.');
        }
        try {
            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await safeParseJson(response);

            if (!response.ok || !data.success) {
                throw new Error(data.message || `'${type}' 설문 목록을 불러오는 데 실패했습니다.`);
            }

            if (data.success) {
                setter(data.surveys);
                if (totalPagesSetter) {
                    totalPagesSetter(data.totalPages || 1);
                }
            } else {
                throw new Error(data.message || `'${type}' 설문 목록을 불러오는 데 실패했습니다.`);
            }
        } catch (err) {
            if (isAuthExpiredError(err)) {
                throw err;
            }
            setError(err.message);
            throw err; // 에러를 다시 던져서 호출한 쪽에서 후속 처리(예: 페이지 이동)를 할 수 있도록 함
        } finally {
            setLoading(prev => ({ ...prev, [type]: false }));
        }
    }, [safeParseJson]);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const userId = localStorage.getItem('userId');
        if (!token || !userId) {
            notify('로그인이 필요합니다.', 'warning');
            navigate('/login');
            return;
        }

        setLoggedInUserId(userId);
    }, [navigate, notify]);

    useEffect(() => {
        if (section === 'comments') {
            setRelationView('comments');
            return;
        }

        if (section === 'responses') {
            setRelationView('responses');
            return;
        }

        if (section === 'created') {
            setRelationView('created');
            return;
        }

        if (section === 'lists') {
            setRelationView('lists');
            return;
        }

        // 기본값을 '내 설문'으로
        setRelationView('created');
    }, [section]);

    useEffect(() => {
        if (!loggedInUserId) {
            return;
        }

        let isMounted = true;

        const fetchProfile = async () => {
            setProfileLoading(true);
            const fallbackProfile = hydrateLocalProfile(loggedInUserId);

            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`${import.meta.env.VITE_API_BASE}/api/me/profile`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await safeParseJson(response);

                if (!response.ok || !data.success) {
                    throw new Error(data.message || '프로필을 불러오지 못했습니다.');
                }

                const nextProfile = {
                    ...fallbackProfile,
                    ...data.profile,
                    displayName: data.profile.displayName || loggedInUserId,
                    avatarUrl: fallbackProfile.avatarUrl?.startsWith('data:')
                        ? fallbackProfile.avatarUrl
                        : (data.profile.avatarUrl || fallbackProfile.avatarUrl || '')
                };

                if (!isMounted) {
                    return;
                }

                setProfile(nextProfile);
                setProfileDraft(nextProfile);
                persistLocalProfile(loggedInUserId, nextProfile);
            } catch (err) {
                if (isAuthExpiredError(err)) {
                    return;
                }
                if (isMounted) {
                    setProfile(fallbackProfile);
                    setProfileDraft(fallbackProfile);
                }
            } finally {
                if (isMounted) {
                    setProfileLoading(false);
                }
            }
        };

        fetchProfile();

        return () => {
            isMounted = false;
        };
    }, [handleAuthExpired, loggedInUserId, safeParseJson]);

    const fetchBookmarkLists = useCallback(async () => {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('로그인이 필요합니다.');
        }

        const response = await fetch(`${import.meta.env.VITE_API_BASE}/api/me/bookmark-lists`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await safeParseJson(response);

        if (!response.ok || !data.success) {
            throw new Error(data.message || '리스트를 불러오지 못했습니다.');
        }

        const lists = data.lists || [];
        setBookmarkLists(lists);
        setSelectedBookmarkListId((prev) => {
            if (prev && lists.some((list) => list.id === prev)) {
                return prev;
            }
            return lists[0]?.id || '';
        });
        return lists;
    }, [safeParseJson]);

    useEffect(() => {
        if (!loggedInUserId) {
            return;
        }

        fetchBookmarkLists()
            .catch((err) => {
                if (isAuthExpiredError(err)) {
                    return;
                }
                if (err.message === '로그인이 필요합니다.') {
                    notify(err.message, 'warning');
                    navigate('/login');
                } else {
                    setError(err.message);
                }
            })
            .finally(() => {
                setLoading((prev) => ({ ...prev, bookmarkLists: false }));
            });
    }, [fetchApi, fetchBookmarkLists, fetchMyComments, fetchMyRespondedSurveys, loggedInUserId, navigate, notify]);

    useEffect(() => {
        if (!loggedInUserId || relationView !== 'created') {
            return;
        }

        setLoading((prev) => ({ ...prev, created: true }));

        fetchApi(
            `${import.meta.env.VITE_API_BASE}/api/me/surveys?page=${createdPage}&limit=${DETAIL_PER_PAGE}`,
            setCreatedSurveys,
            setCreatedTotalPages,
            'created'
        ).catch((err) => {
            if (isAuthExpiredError(err)) {
                return;
            }
            if (err.message === '로그인이 필요합니다.') {
                notify(err.message, 'warning');
                navigate('/login');
            } else {
                setError(err.message);
            }
        });
    }, [createdPage, fetchApi, loggedInUserId, navigate, notify, relationView]);

    useEffect(() => {
        if (!loggedInUserId) {
            return;
        }

        if (relationView !== 'comments' && relationView !== 'responses') {
            return;
        }

        setManageLoading(true);

        const load = async () => {
            if (relationView === 'comments') {
                const data = await fetchMyComments({ page: commentManagePage, limit: DETAIL_PER_PAGE });
                setManagedComments(data.comments || []);
                setCommentManageTotalPages(data.totalPages || 1);
                return;
            }

            const data = await fetchMyRespondedSurveys({ page: responseManagePage, limit: DETAIL_PER_PAGE });
            setManagedRespondedSurveys(data.surveys || []);
            setResponseManageTotalPages(data.totalPages || 1);
        };

        load().catch((err) => {
            if (isAuthExpiredError(err)) {
                return;
            }
            setError(err.message || '목록을 불러오지 못했습니다.');
            if (relationView === 'comments') {
                setManagedComments([]);
            } else {
                setManagedRespondedSurveys([]);
            }
        }).finally(() => {
            setManageLoading(false);
        });
    }, [commentManagePage, fetchMyComments, fetchMyRespondedSurveys, loggedInUserId, relationView, responseManagePage]);

    useEffect(() => {
        const fetchBookmarkedSurveys = async () => {
            if (!loggedInUserId || !selectedBookmarkListId) {
                setBookmarkSurveys([]);
                setBookmarkListTotalPages(0);
                setLoading((prev) => ({ ...prev, bookmarkSurveys: false }));
                return;
            }

            const token = localStorage.getItem('token');
            if (!token) {
                notify('로그인이 필요합니다.', 'warning');
                navigate('/login');
                return;
            }

            setLoading((prev) => ({ ...prev, bookmarkSurveys: true }));

            const response = await fetch(
                `${import.meta.env.VITE_API_BASE}/api/me/bookmark-lists/${selectedBookmarkListId}/surveys?page=${bookmarkListPage}&limit=${DETAIL_PER_PAGE}`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            const data = await safeParseJson(response);

            if (!response.ok || !data.success) {
                throw new Error(data.message || '리스트 설문을 불러오지 못했습니다.');
            }

            setBookmarkSurveys(data.surveys || []);
            setBookmarkListTotalPages(data.totalPages || 1);
        };

        fetchBookmarkedSurveys().catch((err) => {
            if (isAuthExpiredError(err)) {
                return;
            }
            setError(err.message);
        }).finally(() => {
            setLoading((prev) => ({ ...prev, bookmarkSurveys: false }));
        });
    }, [bookmarkListPage, loggedInUserId, navigate, notify, safeParseJson, selectedBookmarkListId]);

    const handleSurveyClick = (id) => navigate(`/surveys/${id}`);
    const handleEditClick = (id) => {
        setOpenSurveyMenuId('');
        navigate(`/create/${id}`);
    };

    const handleDraftChange = (field, value) => {
        setProfileDraft((prev) => ({ ...prev, [field]: value }));
        if (field === 'userId') {
            setUserIdCheck({ status: 'idle', message: '', checkedValue: '' });
        }
    };

    const handleUserIdDuplicateCheck = async () => {
        const candidate = String(profileDraft.userId || '').trim();

        if (!candidate) {
            notify('아이디를 입력해주세요.', 'warning');
            return;
        }

        if (candidate.length < 3 || candidate.length > 20) {
            notify('아이디는 3자 이상 20자 이하로 입력해주세요.', 'warning');
            return;
        }

        if (candidate === loggedInUserId) {
            setUserIdCheck({ status: 'ok', message: '사용 가능한 아이디입니다.', checkedValue: candidate });
            notify('사용 가능한 아이디입니다.', 'success');
            return;
        }

        try {
            const response = await fetch(`${import.meta.env.VITE_API_BASE}/api/auth/check-userid?userId=${encodeURIComponent(candidate)}`);
            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || '중복 확인 중 오류가 발생했습니다.');
            }

            if (data.available) {
                setUserIdCheck({ status: 'ok', message: '사용 가능한 아이디입니다.', checkedValue: candidate });
                notify('사용 가능한 아이디입니다.', 'success');
            } else {
                setUserIdCheck({ status: 'conflict', message: '이미 사용 중인 아이디입니다.', checkedValue: candidate });
                notify('이미 사용 중인 아이디입니다.', 'warning');
            }
        } catch {
            setUserIdCheck({ status: 'error', message: '중복 확인에 실패했습니다.', checkedValue: '' });
            notify('중복 확인에 실패했습니다.', 'error');
        }
    };

    const openAvatarPicker = () => {
        avatarInputRef.current?.click();
    };

    const handleAvatarChange = (event) => {
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }

        if (!file.type.startsWith('image/')) {
            notify('이미지 파일만 업로드할 수 있습니다.', 'warning');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            notify('프로필 이미지는 5MB 이하만 사용할 수 있습니다.', 'warning');
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            setAvatarPreview(reader.result);
            setSelectedAvatarFile(file);
            setIsEditingProfile(true);
        };
        reader.readAsDataURL(file);
    };

    const handleProfileSave = async () => {
        if (!loggedInUserId) {
            return;
        }

        const trimmedProfile = {
            ...profileDraft,
            userId: (profileDraft.userId || loggedInUserId || '').trim().slice(0, 20),
            displayName: (profileDraft.displayName || loggedInUserId).trim().slice(0, 24) || loggedInUserId,
            headline: '',
            bio: ''
        };

        if (trimmedProfile.userId.length < 3) {
            notify('아이디는 3자 이상 입력해주세요.', 'warning');
            return;
        }

        if (
            trimmedProfile.userId !== loggedInUserId &&
            (userIdCheck.status !== 'ok' || userIdCheck.checkedValue !== trimmedProfile.userId)
        ) {
            notify('아이디 변경 시 중복확인을 먼저 해주세요.', 'warning');
            return;
        }

        const hasTextChanged =
            trimmedProfile.userId !== (profile.userId || loggedInUserId) ||
            trimmedProfile.displayName !== (profile.displayName || loggedInUserId);

        const hasAvatarChanged = Boolean(selectedAvatarFile);

        if (!hasTextChanged && !hasAvatarChanged) {
            setIsEditingProfile(false);
            setAvatarPreview('');
            setSelectedAvatarFile(null);
            return;
        }

        setProfileSaving(true);

        try {
            const token = localStorage.getItem('token');
            const formData = new FormData();
            formData.append('userId', trimmedProfile.userId);
            formData.append('displayName', trimmedProfile.displayName);
            formData.append('headline', trimmedProfile.headline);
            formData.append('bio', trimmedProfile.bio);
            formData.append('removeAvatar', 'false');
            if (selectedAvatarFile) {
                formData.append('avatar', selectedAvatarFile);
            }

            const response = await fetch(`${import.meta.env.VITE_API_BASE}/api/me/profile`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            const data = await safeParseJson(response);

            if (!response.ok || !data.success) {
                throw new Error(data.message || '프로필 저장에 실패했습니다.');
            }

            const nextProfile = {
                ...trimmedProfile,
                ...data.profile,
                avatarUrl: avatarPreview || data.profile.avatarUrl || profile.avatarUrl
            };

            setProfile(nextProfile);
            setProfileDraft(nextProfile);
            setAvatarPreview('');
            setSelectedAvatarFile(null);
            setIsEditingProfile(false);
            if (trimmedProfile.userId !== loggedInUserId) {
                localStorage.removeItem(getProfileStorageKey(loggedInUserId));
                localStorage.setItem('userId', nextProfile.userId);
                setLoggedInUserId(nextProfile.userId);
            }
            if (data.token) {
                localStorage.setItem('token', data.token);
            }
            persistLocalProfile(nextProfile.userId, nextProfile);
            setUserIdCheck({ status: 'idle', message: '', checkedValue: '' });
            notify('프로필이 저장되었습니다.', 'success');
        } catch (err) {
            if (isAuthExpiredError(err)) {
                return;
            }
            const fallbackProfile = {
                ...trimmedProfile,
                avatarUrl: avatarPreview || trimmedProfile.avatarUrl || profile.avatarUrl
            };

            setProfile(fallbackProfile);
            setProfileDraft(fallbackProfile);
            setIsEditingProfile(false);
            persistLocalProfile(loggedInUserId, fallbackProfile);
            notify('서버 저장은 실패했지만 현재 브라우저에는 반영되었습니다.', 'warning');
        } finally {
            setProfileSaving(false);
        }
    };

    /**
     * @async
     * @function handleDeleteClick
     * @description 설문 삭제 버튼 클릭 시 삭제 확인 모달을 엽니다.
     * @param {number} id - 삭제할 설문의 ID
     */
    const handleDeleteClick = (id) => {
        setOpenSurveyMenuId('');
        setDeleteConfirm({ open: true, surveyId: id });
    };

    const deleteSurveyById = useCallback(async (id) => {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('로그인이 필요합니다.');
        }

        const response = await fetch(`${import.meta.env.VITE_API_BASE}/api/surveys/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await safeParseJson(response);

        if (!response.ok || !result.success) {
            throw new Error(result.message || '설문 삭제에 실패했습니다.');
        }

        return result;
    }, [safeParseJson]);

    const deleteRespondedSurveyById = useCallback(async (surveyId) => {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('로그인이 필요합니다.');
        }

        const response = await fetch(`${import.meta.env.VITE_API_BASE}/api/me/responses/surveys/${surveyId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await safeParseJson(response);

        if (!response.ok || !data.success) {
            throw new Error(data.message || '참여 응답 삭제에 실패했습니다.');
        }

        return data;
    }, [safeParseJson]);

    const deleteBookmarkListById = useCallback(async (listId) => {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('로그인이 필요합니다.');
        }

        const response = await fetch(`${import.meta.env.VITE_API_BASE}/api/me/bookmark-lists/${listId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await safeParseJson(response);

        if (!response.ok || !data.success) {
            throw new Error(data.message || '리스트 삭제에 실패했습니다.');
        }

        return data;
    }, [safeParseJson]);

    const deleteCommentById = useCallback(async (commentId) => {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('로그인이 필요합니다.');
        }

        const response = await fetch(`${import.meta.env.VITE_API_BASE}/api/me/comments/${commentId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await safeParseJson(response);

        if (!response.ok || !data.success) {
            throw new Error(data.message || '댓글 삭제에 실패했습니다.');
        }

        return data;
    }, [safeParseJson]);

    const deleteSelectedComments = async () => {
        if (selectedCommentIds.length === 0) {
            return;
        }

        setCommentDeleteConfirm({ open: true, count: selectedCommentIds.length });
    };

    const executeDeleteSelectedComments = async () => {
        if (selectedCommentIds.length === 0) {
            setCommentDeleteConfirm({ open: false, count: 0 });
            return;
        }

        setCommentDeleteConfirm({ open: false, count: 0 });

        try {
            await Promise.all(selectedCommentIds.map((commentId) => deleteCommentById(commentId)));
            setManagedComments((prev) => prev.filter((item) => !selectedCommentIds.includes(String(item.id))));
            setSelectedCommentIds([]);
            notify('선택한 댓글이 삭제되었습니다.', 'success');
        } catch (err) {
            if (isAuthExpiredError(err)) {
                return;
            }
            notify(err.message || '선택 삭제에 실패했습니다.', 'error');
        }
    };

    /**
     * @async
     * @function executeDelete
     * @description 삭제 확인 모달에서 확인 버튼 클릭 시 실제 DELETE API를 호출합니다.
     */
    const executeDelete = async () => {
        const id = deleteConfirm.surveyId;
        setDeleteConfirm({ open: false, surveyId: null });
        try {
            const result = await deleteSurveyById(id);

            if (result.success) {
                notify('설문이 성공적으로 삭제되었습니다.', 'success');
                setCreatedPage(1);
                setCreatedSurveys((prev) => prev.filter((survey) => String(survey.id) !== String(id)));
                setBookmarkSurveys((prev) => prev.filter((survey) => String(survey.id) !== String(id)));
                setSelectedCreatedSurveyIds((prev) => prev.filter((surveyId) => String(surveyId) !== String(id)));
                setSelectedBookmarkSurveyIds((prev) => prev.filter((surveyId) => String(surveyId) !== String(id)));
                setSelectedRespondedSurveyIds((prev) => prev.filter((surveyId) => String(surveyId) !== String(id)));
                setOpenSurveyMenuId('');
                fetchBookmarkLists().catch(() => { });
            } else {
                throw new Error(result.message || '설문 삭제 중 오류가 발생했습니다.');
            }
        } catch (err) {
            if (isAuthExpiredError(err)) {
                return;
            }
            setError(err.message);
            notify(`삭제 중 오류 발생: ${err.message}`, 'error');
        }
    };

    const deleteSelectedCreatedSurveys = async () => {
        if (selectedCreatedSurveyIds.length === 0) {
            return;
        }

        const confirmed = window.confirm(`선택한 설문 ${selectedCreatedSurveyIds.length}개를 삭제하시겠습니까?`);
        if (!confirmed) {
            return;
        }

        try {
            await Promise.all(selectedCreatedSurveyIds.map((surveyId) => deleteSurveyById(surveyId)));
            setCreatedSurveys((prev) => prev.filter((survey) => !selectedCreatedSurveyIds.includes(String(survey.id))));
            setBookmarkSurveys((prev) => prev.filter((survey) => !selectedCreatedSurveyIds.includes(String(survey.id))));
            setSelectedCreatedSurveyIds([]);
            fetchBookmarkLists().catch(() => { });
            notify('선택한 설문이 삭제되었습니다.', 'success');
        } catch (err) {
            if (isAuthExpiredError(err)) {
                return;
            }
            notify(err.message || '삭제에 실패했습니다.', 'error');
        }
    };

    const deleteSelectedRespondedSurveys = async () => {
        if (selectedRespondedSurveyIds.length === 0) {
            return;
        }

        const confirmed = window.confirm(`선택한 참여 설문 ${selectedRespondedSurveyIds.length}개를 삭제하시겠습니까?`);
        if (!confirmed) {
            return;
        }

        try {
            await Promise.all(selectedRespondedSurveyIds.map((surveyId) => deleteRespondedSurveyById(surveyId)));
            setManagedRespondedSurveys((prev) => prev.filter((item) => !selectedRespondedSurveyIds.includes(String(item.id))));
            setSelectedRespondedSurveyIds([]);
            notify('선택한 참여 응답이 삭제되었습니다.', 'success');
        } catch (err) {
            if (isAuthExpiredError(err)) {
                return;
            }
            notify(err.message || '삭제에 실패했습니다.', 'error');
        }
    };

    const deleteSelectedBookmarkLists = async () => {
        if (selectedBookmarkListIds.length === 0) {
            return;
        }

        const confirmed = window.confirm(`선택한 리스트 ${selectedBookmarkListIds.length}개를 삭제하시겠습니까?`);
        if (!confirmed) {
            return;
        }

        try {
            await Promise.all(selectedBookmarkListIds.map((listId) => deleteBookmarkListById(listId)));
            await fetchBookmarkLists();
            setSelectedBookmarkListIds([]);
            if (selectedBookmarkListId && selectedBookmarkListIds.includes(String(selectedBookmarkListId))) {
                setSelectedBookmarkListId('');
                setBookmarkSurveys([]);
                setRelationView('lists');
            }
            notify('선택한 리스트가 삭제되었습니다.', 'success');
        } catch (err) {
            if (isAuthExpiredError(err)) {
                return;
            }
            notify(err.message || '삭제에 실패했습니다.', 'error');
        }
    };

    const removeSurveyFromSelectedBookmarkListById = async (surveyId) => {
        if (!selectedBookmarkListId) {
            throw new Error('리스트를 찾을 수 없습니다.');
        }

        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('로그인이 필요합니다.');
        }

        const response = await fetch(`${import.meta.env.VITE_API_BASE}/api/surveys/${surveyId}/bookmark`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ listId: selectedBookmarkListId })
        });
        const data = await safeParseJson(response);

        if (!response.ok || !data.success) {
            throw new Error(data.message || '리스트에서 제거하지 못했습니다.');
        }

        return data;
    };

    const deleteSelectedBookmarkSurveyItems = async () => {
        if (selectedBookmarkSurveyIds.length === 0) {
            return;
        }

        const confirmed = window.confirm(`선택한 설문 ${selectedBookmarkSurveyIds.length}개를 현재 리스트에서 제거하시겠습니까?`);
        if (!confirmed) {
            return;
        }

        try {
            await Promise.all(selectedBookmarkSurveyIds.map((surveyId) => removeSurveyFromSelectedBookmarkListById(surveyId)));
            setBookmarkSurveys((prev) => prev.filter((survey) => !selectedBookmarkSurveyIds.includes(String(survey.id))));
            setSelectedBookmarkSurveyIds([]);
            fetchBookmarkLists().catch(() => { });
            notify('선택한 설문이 리스트에서 제거되었습니다.', 'success');
        } catch (err) {
            if (isAuthExpiredError(err)) {
                return;
            }
            notify(err.message || '삭제에 실패했습니다.', 'error');
        }
    };

    /**
     * @function copyLink
     * @description 비공개 설문의 공유 링크를 클립보드에 복사합니다.
     * @param {string} link - 복사할 고유 링크 문자열
     */
    const copyLink = (link) => {
        const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
        const fullLink = `${window.location.origin}${base}/s/${link}`;
        navigator.clipboard.writeText(fullLink).then(() => {
            notify('링크가 클립보드에 복사되었습니다!', 'success');
        }).catch(() => {
            notify('링크 복사에 실패했습니다.', 'error');
        });
    };

    const openRelationView = async (type) => {
        if (!loggedInUserId) {
            return;
        }

        const nextType = type === 'followers' ? 'followers' : 'following';
        setRelationView(nextType);
        setRelationUsers([]);
        try {
            setRelationLoading(true);
            const token = localStorage.getItem('token');
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            const response = await fetch(`${import.meta.env.VITE_API_BASE}/api/users/${encodeURIComponent(loggedInUserId)}/${nextType}`, { headers });
            const data = await safeParseJson(response);
            if (!response.ok || !data.success) {
                throw new Error(data.message || '사용자 목록을 불러오지 못했습니다.');
            }
            setRelationUsers(data.users || []);
        } catch (err) {
            setError(err.message || '사용자 목록을 불러오지 못했습니다.');
            setRelationUsers([]);
        } finally {
            setRelationLoading(false);
        }
    };

    const toggleFollowFromList = async (targetUser) => {
        const token = localStorage.getItem('token');
        if (!token) {
            notify('로그인이 필요합니다.', 'warning');
            navigate('/login');
            return;
        }

        try {
            const method = targetUser.isFollowing ? 'DELETE' : 'POST';
            const response = await fetch(`${import.meta.env.VITE_API_BASE}/api/users/${encodeURIComponent(targetUser.userId)}/follow`, {
                method,
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await safeParseJson(response);
            if (!response.ok || !data.success) {
                throw new Error(data.message || 'follow 상태 변경에 실패했습니다.');
            }

            setRelationUsers((prev) => prev.map((user) =>
                user.userId === targetUser.userId ? { ...user, isFollowing: data.isFollowing } : user
            ));
            setProfile((prev) => ({ ...prev, followingCount: Number(data.followingCount) || prev.followingCount }));
        } catch (err) {
            notify(err.message || 'follow 상태 변경에 실패했습니다.', 'error');
        }
    };

    const handleBookmarkListSelect = (listId) => {
        setSelectedBookmarkListId(listId);
        setBookmarkListPage(1);
        setRelationView('bookmark-list');
    };

    const closeBookmarkListDetail = () => {
        setIsBookmarkListMenuOpen(false);
        setOpenSurveyMenuId('');
        setRelationView('created');
        // 페이지 이동 제거: 오른쪽 화면만 변경
    };

    const openManageDetail = (type) => {
        const target = type === 'comments' ? 'comments' : 'responses';
        setRelationView(target);
        if (target === 'comments') {
            setCommentManagePage(1);
        } else {
            setResponseManagePage(1);
        }
        // navigate(`/mypage/${target}`); // URL 이동 제거
    };

    const openCreatedDetail = () => {
        setRelationView('created');
        setCreatedPage(1);
        // navigate('/mypage/created'); // URL 이동 제거
    };

    const openListOverviewDetail = () => {
        setRelationView('lists');
        setBookmarkListOverviewPage(1);
        // navigate('/mypage/lists'); // URL 이동 제거
    };

    const openCommentDetail = (comment) => {
        if (!comment?.surveyId || !comment?.id) {
            notify('댓글 정보를 찾을 수 없습니다.', 'warning');
            return;
        }

        navigate(`/surveys/${comment.surveyId}?tab=responses&focusComment=${encodeURIComponent(comment.id)}`);
    };

    const handleEditRespondedSurvey = (surveyId) => {
        setOpenRespondedSurveyMenuId('');
        navigate(`/surveys/${surveyId}`);
    };

    const handleDeleteRespondedSurvey = (surveyId) => {
        setOpenRespondedSurveyMenuId('');
        setResponseDeleteConfirm({ open: true, surveyId });
    };

    const executeDeleteRespondedSurvey = async () => {
        const surveyId = responseDeleteConfirm.surveyId;
        setResponseDeleteConfirm({ open: false, surveyId: null });

        if (!surveyId) {
            return;
        }

        const token = localStorage.getItem('token');
        if (!token) {
            notify('로그인이 필요합니다.', 'warning');
            navigate('/login');
            return;
        }

        try {
            const response = await fetch(`${import.meta.env.VITE_API_BASE}/api/me/responses/surveys/${surveyId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await safeParseJson(response);

            if (!response.ok || !data.success) {
                throw new Error(data.message || '참여 응답 삭제에 실패했습니다.');
            }

            setManagedRespondedSurveys((prev) => prev.filter((item) => String(item.id) !== String(surveyId)));
            notify('참여 응답이 삭제되었습니다.', 'success');
        } catch (err) {
            notify(err.message || '참여 응답 삭제에 실패했습니다.', 'error');
        }
    };

    const openBookmarkCreateModal = () => {
        setBookmarkModalMode('create');
        setNewBookmarkListName('');
        setIsBookmarkModalOpen(true);
    };

    const openBookmarkRenameModal = () => {
        if (!selectedBookmarkList) {
            return;
        }
        setBookmarkModalMode('rename');
        setNewBookmarkListName(selectedBookmarkList.name || '');
        setIsBookmarkModalOpen(true);
        setIsBookmarkListMenuOpen(false);
    };

    const closeBookmarkCreateModal = () => {
        if (bookmarkListCreating) {
            return;
        }
        setIsBookmarkModalOpen(false);
        setNewBookmarkListName('');
    };

    const toggleBookmarkListMenu = () => {
        setIsBookmarkListMenuOpen((prev) => !prev);
    };

    const toggleSurveyMenu = (surveyId) => {
        setOpenSurveyMenuId((prev) => (String(prev) === String(surveyId) ? '' : String(surveyId)));
    };

    const toggleRespondedSurveyMenu = (surveyId) => {
        setOpenRespondedSurveyMenuId((prev) => (String(prev) === String(surveyId) ? '' : String(surveyId)));
    };

    const handleRemoveSurveyFromList = async (surveyId) => {
        setOpenSurveyMenuId('');

        if (!selectedBookmarkListId) {
            return;
        }

        const confirmed = window.confirm('이 설문을 현재 리스트에서 제거할까요? 설문 자체는 삭제되지 않습니다.');
        if (!confirmed) {
            return;
        }

        const token = localStorage.getItem('token');
        if (!token) {
            notify('로그인이 필요합니다.', 'warning');
            navigate('/login');
            return;
        }

        try {
            const response = await fetch(`${import.meta.env.VITE_API_BASE}/api/surveys/${surveyId}/bookmark`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ listId: selectedBookmarkListId })
            });
            const data = await safeParseJson(response);

            if (!response.ok || !data.success) {
                throw new Error(data.message || '리스트에서 제거하지 못했습니다.');
            }

            setBookmarkSurveys((prev) => prev.filter((survey) => String(survey.id) !== String(surveyId)));
            fetchBookmarkLists().catch(() => { });
            notify('리스트에서 제거되었습니다.', 'success');
        } catch (err) {
            notify(err.message || '리스트에서 제거하지 못했습니다.', 'error');
        }
    };

    const handleCreateBookmarkList = async () => {
        const nextName = String(newBookmarkListName || '').trim();
        if (!nextName) {
            notify('리스트 이름을 입력해주세요.', 'warning');
            return;
        }

        if (nextName.length > 24) {
            notify('리스트 이름은 24자 이하로 입력해주세요.', 'warning');
            return;
        }

        const token = localStorage.getItem('token');
        if (!token) {
            notify('로그인이 필요합니다.', 'warning');
            navigate('/login');
            return;
        }

        try {
            setBookmarkListCreating(true);
            const isRename = bookmarkModalMode === 'rename';
            const response = await fetch(
                isRename
                    ? `${import.meta.env.VITE_API_BASE}/api/me/bookmark-lists/${selectedBookmarkListId}`
                    : `${import.meta.env.VITE_API_BASE}/api/me/bookmark-lists`,
                {
                    method: isRename ? 'PATCH' : 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ name: nextName })
                });
            const data = await safeParseJson(response);

            if (!response.ok || !data.success) {
                throw new Error(data.message || (isRename ? '리스트 수정에 실패했습니다.' : '리스트 생성에 실패했습니다.'));
            }

            if (isRename) {
                setBookmarkLists((prev) => prev.map((list) => (
                    list.id === data.list.id ? { ...list, name: data.list.name } : list
                )));
                notify('리스트가 수정되었습니다.', 'success');
            } else {
                setBookmarkLists((prev) => [...prev, data.list]);
                setSelectedBookmarkListId(data.list.id);
                notify('리스트가 생성되었습니다.', 'success');
            }
            setBookmarkListPage(1);
            setNewBookmarkListName('');
            setIsBookmarkModalOpen(false);
        } catch (err) {
            notify(err.message || (bookmarkModalMode === 'rename' ? '리스트 수정에 실패했습니다.' : '리스트 생성에 실패했습니다.'), 'error');
        } finally {
            setBookmarkListCreating(false);
        }
    };

    const handleDeleteBookmarkList = async () => {
        if (!selectedBookmarkListId) {
            return;
        }

        const confirmed = window.confirm('이 리스트를 삭제하시겠습니까? 리스트 안의 북마크도 함께 제거됩니다.');
        if (!confirmed) {
            return;
        }

        const token = localStorage.getItem('token');
        if (!token) {
            notify('로그인이 필요합니다.', 'warning');
            navigate('/login');
            return;
        }

        try {
            const response = await fetch(`${import.meta.env.VITE_API_BASE}/api/me/bookmark-lists/${selectedBookmarkListId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await safeParseJson(response);

            if (!response.ok || !data.success) {
                throw new Error(data.message || '리스트 삭제에 실패했습니다.');
            }

            await fetchBookmarkLists();
            setBookmarkSurveys([]);
            setBookmarkListPage(1);
            setRelationView('created');
            setIsBookmarkListMenuOpen(false);
            notify('리스트가 삭제되었습니다.', 'success');
        } catch (err) {
            notify(err.message || '리스트 삭제에 실패했습니다.', 'error');
        }
    };

    const renderBookmarkListCards = ({ limit, page = 1 } = {}) => {
        if (loading.bookmarkLists) {
            return <p className="mypage-loading-text">리스트를 불러오는 중...</p>;
        }

        if (bookmarkLists.length === 0) {
            return <p className="mypage-empty-text">아직 만든 리스트가 없습니다.</p>;
        }

        const start = limit ? 0 : (page - 1) * DETAIL_PER_PAGE;
        const end = limit ? limit : start + DETAIL_PER_PAGE;
        const targetLists = bookmarkLists.slice(start, end);

        return (
            <div className="mypage-list-card-grid">
                {targetLists.map((list) => (
                    <div
                        key={list.id}
                        className={`mypage-list-card ${selectedBookmarkListIds.includes(String(list.id)) ? 'is-selected' : ''}`}
                        onClick={() => handleBookmarkListSelect(list.id)}
                        role="button"
                        tabIndex={0}
                    >
                        <button
                            type="button"
                            className={`mypage-selection-box ${selectedBookmarkListIds.includes(String(list.id)) ? 'is-selected' : ''}`}
                            onClick={(event) => {
                                event.stopPropagation();
                                toggleSelectedIds(setSelectedBookmarkListIds, list.id);
                            }}
                            aria-label={`${list.name} 선택`}
                            aria-pressed={selectedBookmarkListIds.includes(String(list.id))}
                        >
                            {selectedBookmarkListIds.includes(String(list.id)) ? '✓' : ''}
                        </button>
                        <div className="mypage-list-card-body">
                            <p className="mypage-list-card-title">{list.name}</p>
                            <p className="mypage-list-card-meta">저장된 설문 {list.bookmarkCount || 0}개</p>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    const renderUserList = () => {
        if (relationLoading) {
            return <p className="mypage-loading-text">사용자 목록을 불러오는 중...</p>;
        }

        if (error) {
            return <p className="mypage-empty-text">사용자 목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.</p>;
        }

        if (relationUsers.length === 0) {
            return <p className="mypage-empty-text">표시할 사용자가 없습니다.</p>;
        }

        return (
            <div className="mypage-rectList">
                {relationUsers.map((user, index) => (
                    <div className="mypage-rect" key={`${user.userId}-${index}`}>
                        <div className="mypage-survey-info" onClick={() => {/* 프로필은 새 창 이동 허용 */ navigate(`/profile/${user.userId}`); }}>
                            <div className="mypage-user-row">
                                <div className="mypage-user-avatar">
                                    {resolveUploadUrl(user.avatarUrl) ? (
                                        <img src={resolveUploadUrl(user.avatarUrl)} alt="" className="mypage-user-avatar-image" />
                                    ) : (
                                        <span>{String(user.displayName || user.userId || 'SV').slice(0, 2).toUpperCase()}</span>
                                    )}
                                </div>
                                <div className="mypage-user-meta">
                                    <p className="mypage-user-name">{user.displayName || user.userId}</p>
                                    <p className="mypage-user-id">@{user.userId}</p>
                                </div>
                            </div>
                        </div>
                        {!user.isMe ? (
                            <div className="mypage-actions">
                                <button className="mypage-copyLinkBtn" onClick={() => toggleFollowFromList(user)}>
                                    {user.isFollowing ? 'unfollow' : 'follow'}
                                </button>
                            </div>
                        ) : null}
                    </div>
                ))}
            </div>
        );
    };

    // const renderCommentsPreview = () => {
    //     ... 미사용 함수 제거
    // };

    // const renderRespondedPreview = () => {
    //     ... 미사용 함수 제거
    // };


    /**
     * @function renderSurveyList
     * @description 설문 목록을 렌더링하는 재사용 가능한 함수.
     * @param {Array} surveys - 렌더링할 설문 데이터 배열
    * @param {string} type - 목록의 타입 ('created' 또는 'list')
     * @param {number} pageNum - 현재 페이지 번호 (항목 번호 계산용)
     * @returns {JSX.Element}
     */
    const renderSurveyList = (surveys, type) => {
        if (surveys.length === 0) {
            if (type === 'created') {
                return <p className="mypage-empty-text">아직 생성한 설문이 없습니다.</p>;
            }
            return <p className="mypage-empty-text">이 리스트에 저장된 설문이 없습니다.</p>;
        }

        const selectedIds = type === 'created' ? selectedCreatedSurveyIds : selectedBookmarkSurveyIds;
        const setSelectedIds = type === 'created' ? setSelectedCreatedSurveyIds : setSelectedBookmarkSurveyIds;

        return (
            <div className="mypage-rectList">
                {surveys.map((survey) => (
                    <div className={`mypage-rect ${selectedIds.includes(String(survey.id)) ? 'is-selected' : ''}`} key={survey.id}>
                        <div className="mypage-survey-info" onClick={() => handleSurveyClick(survey.id)}>
                            <button
                                type="button"
                                className={`mypage-selection-box ${selectedIds.includes(String(survey.id)) ? 'is-selected' : ''}`}
                                onClick={(event) => {
                                    event.stopPropagation();
                                    toggleSelectedIds(setSelectedIds, survey.id);
                                }}
                                aria-label={`${survey.title} 선택`}
                                aria-pressed={selectedIds.includes(String(survey.id))}
                            >
                                {selectedIds.includes(String(survey.id)) ? '✓' : ''}
                            </button>
                                                    <p className="mypage-rectText">{survey.title}</p>
                            {/* '생성한 설문' 목록에만 공개/비공개 상태 표시 */}
                            {(type === 'created' || type === 'created-preview') && (
                                <span className={`mypage-survey-status ${survey.isPublic ? 'mypage-status-public' : 'mypage-status-private'}`}>
                                    {survey.isPublic ? '[공개]' : '[비공개]'}
                                </span>
                            )}
                        </div>
                        {/* '생성한 설문' 목록에만 수정/삭제/링크복사 버튼 표시 */}
                        {type === 'created' && (
                            <div className="mypage-actions">
                                <div className="mypage-list-menu-wrap" onClick={(event) => event.stopPropagation()}>
                                    <button
                                        type="button"
                                        className="mypage-list-menu-btn"
                                        onClick={() => toggleSurveyMenu(survey.id)}
                                        aria-label="설문 옵션 열기"
                                    >
                                        ...
                                    </button>
                                    {openSurveyMenuId === String(survey.id) && (
                                        <div className="mypage-list-menu">
                                            {!survey.isPublic && (
                                                <button type="button" onClick={() => copyLink(survey.link)}>링크 복사</button>
                                            )}
                                            <button type="button" onClick={() => handleEditClick(survey.id)}>수정</button>
                                            <button type="button" onClick={() => handleDeleteClick(survey.id)}>삭제</button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {type === 'list' && (
                            <div className="mypage-actions">
                                <div className="mypage-list-menu-wrap" onClick={(event) => event.stopPropagation()}>
                                    <button
                                        type="button"
                                        className="mypage-list-menu-btn"
                                        onClick={() => toggleSurveyMenu(survey.id)}
                                        aria-label="설문 옵션 열기"
                                    >
                                        ...
                                    </button>
                                    {openSurveyMenuId === String(survey.id) && (
                                        <div className="mypage-list-menu">
                                            <button type="button" onClick={() => handleRemoveSurveyFromList(survey.id)}>목록에서 삭제</button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        );
    };

    const createdVisibleIds = createdSurveys.map((survey) => String(survey.id));
    const bookmarkListVisibleIds = bookmarkLists
        .slice((bookmarkListOverviewPage - 1) * DETAIL_PER_PAGE, bookmarkListOverviewPage * DETAIL_PER_PAGE)
        .map((list) => String(list.id));
    const bookmarkSurveyVisibleIds = bookmarkSurveys.map((survey) => String(survey.id));
    const respondedVisibleIds = managedRespondedSurveys.map((survey) => String(survey.id));

    return (
        <>
            <NavBar />

            {/* 삭제 확인 모달 */}
            {deleteConfirm.open && (
                <div className="mypage-delete-modal-overlay" onClick={() => setDeleteConfirm({ open: false, surveyId: null })}>
                    <div className="mypage-delete-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="mypage-delete-modal__icon">
                            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="#e05c5c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                        <p className="mypage-delete-modal__title">설문 삭제</p>
                        <p className="mypage-delete-modal__body">정말 이 설문을 삭제하시겠습니까?<br />관련된 모든 응답도 함께 삭제됩니다.</p>
                        <div className="mypage-delete-modal__actions">
                            <button className="mypage-delete-modal__cancel" onClick={() => setDeleteConfirm({ open: false, surveyId: null })}>취소</button>
                            <button className="mypage-delete-modal__confirm" onClick={executeDelete}>삭제</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 참여 응답 삭제 확인 모달 */}
            {responseDeleteConfirm.open && (
                <div className="mypage-delete-modal-overlay" onClick={() => setResponseDeleteConfirm({ open: false, surveyId: null })}>
                    <div className="mypage-delete-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="mypage-delete-modal__icon">
                            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="#e05c5c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                        <p className="mypage-delete-modal__title">참여 응답 삭제</p>
                        <p className="mypage-delete-modal__body">내 참여 응답을 삭제하시겠습니까?</p>
                        <div className="mypage-delete-modal__actions">
                            <button className="mypage-delete-modal__cancel" onClick={() => setResponseDeleteConfirm({ open: false, surveyId: null })}>취소</button>
                            <button className="mypage-delete-modal__confirm" onClick={executeDeleteRespondedSurvey}>삭제</button>
                        </div>
                    </div>
                </div>
            )}

            {commentDeleteConfirm.open && (
                <div className="mypage-delete-modal-overlay" onClick={() => setCommentDeleteConfirm({ open: false, count: 0 })}>
                    <div className="mypage-delete-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="mypage-delete-modal__icon">
                            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="#e05c5c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                        <p className="mypage-delete-modal__title">댓글 삭제</p>
                        <p className="mypage-delete-modal__body">선택한 댓글 {commentDeleteConfirm.count}개를 삭제하시겠습니까?</p>
                        <div className="mypage-delete-modal__actions">
                            <button className="mypage-delete-modal__cancel" onClick={() => setCommentDeleteConfirm({ open: false, count: 0 })}>취소</button>
                            <button className="mypage-delete-modal__confirm" onClick={executeDeleteSelectedComments}>삭제</button>
                        </div>
                    </div>
                </div>
            )}

            {isBookmarkModalOpen && (
                <div className="mypage-modal-overlay" onClick={closeBookmarkCreateModal}>
                    <div className="mypage-modal" onClick={(event) => event.stopPropagation()}>
                        <div className="mypage-modal-header">
                            <h3 className="mypage-modal-title">{bookmarkModalMode === 'rename' ? '리스트 수정' : '리스트 만들기'}</h3>
                            <button type="button" className="mypage-modal-close" onClick={closeBookmarkCreateModal} aria-label="리스트 생성 닫기">×</button>
                        </div>
                        <label className="mypage-modal-field">
                            <span>리스트 이름</span>
                            <input
                                type="text"
                                value={newBookmarkListName}
                                onChange={(event) => setNewBookmarkListName(event.target.value)}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter') {
                                        event.preventDefault();
                                        handleCreateBookmarkList();
                                    }
                                }}
                                maxLength={24}
                                placeholder="새 리스트 이름"
                                autoFocus
                            />
                        </label>
                        <div className="mypage-modal-actions">
                            <button type="button" className="mypage-delete-modal__cancel" onClick={closeBookmarkCreateModal}>취소</button>
                            <button type="button" className="mypage-primary-btn" onClick={handleCreateBookmarkList} disabled={bookmarkListCreating}>
                                {bookmarkListCreating ? (bookmarkModalMode === 'rename' ? '수정 중...' : '생성 중...') : (bookmarkModalMode === 'rename' ? '수정하기' : '만들기')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="mypage-container">
                <div className={`mypage-layout ${isCenterOnlyView ? 'mypage-layout--center-only' : ''}`}>
                    {!isCenterOnlyView && (
                        <aside className="mypage-left-column">
                            <div className="mypage-profile-panel">
                                <div className="mypage-profile-layout">
                                    <div className="mypage-avatar-column">
                                        <input
                                            ref={avatarInputRef}
                                            type="file"
                                            accept="image/*"
                                            className="mypage-avatar-input"
                                            onChange={handleAvatarChange}
                                        />
                                        <div className={`mypage-avatar-shell ${isEditingProfile ? 'mypage-avatar-shell--editable' : ''}`} onClick={isEditingProfile ? openAvatarPicker : undefined}>
                                            {displayedAvatar && !brokenAvatarKeys.profile ? (
                                                <img
                                                    src={resolveUploadUrl(displayedAvatar)}
                                                    alt="Profile avatar"
                                                    className="mypage-avatar-image"
                                                    onError={() => markAvatarBroken('profile')}
                                                />
                                            ) : (
                                                <span className="mypage-avatar-fallback">{avatarFallback}</span>
                                            )}
                                        </div>
                                        <h1 className="mypage-profile-name">{profileLoading ? '불러오는 중...' : (profile.displayName || loggedInUserId)}</h1>
                                        <p className="mypage-profile-id">@{loggedInUserId}</p>
                                        {/* 팔로워/팔로잉 버튼은 프로필 편집 모드가 아닐 때만 표시 (중복 제거) */}
                                        {!isEditingProfile && (
                                            <div className="mypage-follow-stats">
                                                <button type="button" className="mypage-follow-stat-btn" onClick={() => openRelationView('followers')}>
                                                    <strong>{profile.followerCount || 0}</strong> followers
                                                </button>
                                                <button type="button" className="mypage-follow-stat-btn" onClick={() => openRelationView('following')}>
                                                    <strong>{profile.followingCount || 0}</strong> following
                                                </button>
                                            </div>
                                        )}
                                        {!isEditingProfile && (
                                            <nav className="mypage-nav-grid mypage-nav-under-id">
                                                <a href="#" className={relationView === 'created' ? 'mypage-nav-btn active' : 'mypage-nav-btn'} onClick={e => { e.preventDefault(); openCreatedDetail(); }}>내 설문</a>
                                                <a href="#" className={relationView === 'lists' ? 'mypage-nav-btn active' : 'mypage-nav-btn'} onClick={e => { e.preventDefault(); openListOverviewDetail(); }}>내 리스트</a>
                                                <a href="#" className={relationView === 'responses' ? 'mypage-nav-btn active' : 'mypage-nav-btn'} onClick={e => { e.preventDefault(); openManageDetail('responses'); }}>참여한 설문 관리</a>
                                                <a href="#" className={relationView === 'comments' ? 'mypage-nav-btn active' : 'mypage-nav-btn'} onClick={e => { e.preventDefault(); openManageDetail('comments'); }}>댓글 관리</a>
                                            </nav>
                                        )}
                                    </div>

                                        <div className="mypage-profile-fields">
                                            {profileLoading ? (
                                                <p className="mypage-loading-text">프로필을 불러오는 중...</p>
                                            ) : (
                                                isEditingProfile ? (
                                                    <div className="mypage-edit-grid">
                                                        <label className="mypage-field">
                                                            <span>아이디</span>
                                                            <div className="mypage-id-check-row">
                                                                <input
                                                                    type="text"
                                                                    value={profileDraft.userId || ''}
                                                                    maxLength={20}
                                                                    onChange={(event) => handleDraftChange('userId', event.target.value)}
                                                                    placeholder="아이디"
                                                                />
                                                                <button type="button" className="mypage-id-check-btn" onClick={handleUserIdDuplicateCheck}>
                                                                    중복확인
                                                                </button>
                                                            </div>
                                                            {userIdCheck.message ? (
                                                                <p className={`mypage-id-check-message mypage-id-check-message--${userIdCheck.status}`}>
                                                                    {userIdCheck.message}
                                                                </p>
                                                            ) : null}
                                                        </label>
                                                        <label className="mypage-field">
                                                            <span>표시 이름</span>
                                                            <input
                                                                type="text"
                                                                value={profileDraft.displayName}
                                                                maxLength={24}
                                                                onChange={(event) => handleDraftChange('displayName', event.target.value)}
                                                                placeholder="커뮤니티에서 보여질 이름"
                                                            />
                                                        </label>
                                                    </div>
                                                ) : (
                                                    <></>
                                                )
                                            )}

                                            {!profileLoading && (
                                                <div className="mypage-profile-controls mypage-profile-controls--stack">
                                                    {isEditingProfile ? (
                                                        <button className="mypage-primary-btn" type="button" onClick={handleProfileSave} disabled={profileSaving}>
                                                            {profileSaving ? '저장 중...' : '프로필 저장'}
                                                        </button>
                                                    ) : (
                                                        <button className="mypage-primary-btn mypage-edit-cta" type="button" onClick={() => setIsEditingProfile(true)}>
                                                            프로필 편집
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                        </aside>
                    )}

                    <section className={`mypage-right-column ${isCenterOnlyView ? 'mypage-right-column--center-only' : ''}`}>
                        {error && <p className="mypage-error-message">{error}</p>}

                        {(relationView === 'followers' || relationView === 'following') && (
                            <div className="mypage-survey-section">
                                <div className="mypage-card-header mypage-card-header--detail">
                                    <div className="mypage-section-title-row">
                                        <button
                                            type="button"
                                            className="mypage-back-icon-btn"
                                            onClick={() => { setRelationView('created'); setRelationUsers([]); }}
                                            aria-label="뒤로가기"
                                        >
                                            <img src={import.meta.env.BASE_URL + 'img/ArrowLeftShort.svg'} alt="" aria-hidden="true" />
                                        </button>

                                        <div>
                                            <h2 className="mypage-section-title">{relationView === 'followers' ? '팔로워 목록' : '팔로잉 목록'}</h2>
                                            <span>사용자를 눌러 프로필을 볼 수 있습니다.</span>
                                        </div>
                                    </div>
                                </div>
                                {renderUserList()}
                            </div>
                        )}

                        {relationView === 'bookmark-list' && (
                            <div className="mypage-survey-section">
                                <div className="mypage-card-header mypage-card-header--detail">
                                    <div className="mypage-section-title-row">
                                        <button
                                            type="button"
                                            className="mypage-back-icon-btn"
                                            onClick={closeBookmarkListDetail}
                                            aria-label="리스트 목록으로 돌아가기"
                                        >
                                            <img src={import.meta.env.BASE_URL + 'img/ArrowLeftShort.svg'} alt="" aria-hidden="true" />
                                        </button>
                                        <div>
                                            <h2 className="mypage-section-title">{selectedBookmarkList?.name || '리스트'}</h2>
                                            <span>이 리스트에 저장된 설문만 보여줍니다.</span>
                                        </div>
                                    </div>
                                    <div className="mypage-card-header-actions">
                                        <button
                                            type="button"
                                            className="mypage-section-action-btn"
                                            onClick={() => toggleSelectAllVisible(bookmarkSurveyVisibleIds, selectedBookmarkSurveyIds, setSelectedBookmarkSurveyIds)}
                                        >
                                            {isAllVisibleSelected(bookmarkSurveyVisibleIds, selectedBookmarkSurveyIds) ? '선택 해제' : '전체 선택'}
                                        </button>
                                        <button
                                            type="button"
                                            className="mypage-section-action-btn mypage-section-action-btn--danger"
                                            onClick={deleteSelectedBookmarkSurveyItems}
                                            disabled={selectedBookmarkSurveyIds.length === 0}
                                        >
                                            삭제
                                        </button>
                                        <div className="mypage-list-menu-wrap">
                                            <button type="button" className="mypage-list-menu-btn" onClick={toggleBookmarkListMenu} aria-label="리스트 옵션 열기">...</button>
                                            {isBookmarkListMenuOpen && (
                                                <div className="mypage-list-menu">
                                                    <button type="button" onClick={openBookmarkRenameModal}>리스트 수정</button>
                                                    <button type="button" onClick={handleDeleteBookmarkList}>리스트 삭제</button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {loading.bookmarkSurveys
                                    ? <p className="mypage-loading-text">로딩 중...</p>
                                    : renderSurveyList(bookmarkSurveys, 'list', bookmarkListPage)}
                                {!loading.bookmarkSurveys && bookmarkListTotalPages > 1 && (
                                    <Pagination
                                        currentPage={bookmarkListPage}
                                        totalPages={bookmarkListTotalPages}
                                        onPageChange={setBookmarkListPage}
                                    />
                                )}
                            </div>
                        )}

                        {relationView === 'created' && (
                            <div className="mypage-survey-section">
                                <div className="mypage-card-header mypage-card-header--detail">
                                    <div className="mypage-section-title-row">

                                        <div>
                                            <h2 className="mypage-section-title">내 설문</h2>
                                            <span>내 설문 전체를 확인할 수 있습니다.</span>
                                        </div>
                                    </div>
                                    <div className="mypage-card-header-actions">
                                        <button
                                            type="button"
                                            className="mypage-section-action-btn"
                                            onClick={() => toggleSelectAllVisible(createdVisibleIds, selectedCreatedSurveyIds, setSelectedCreatedSurveyIds)}
                                        >
                                            {isAllVisibleSelected(createdVisibleIds, selectedCreatedSurveyIds) ? '선택 해제' : '전체 선택'}
                                        </button>
                                        <button
                                            type="button"
                                            className="mypage-section-action-btn mypage-section-action-btn--danger"
                                            onClick={deleteSelectedCreatedSurveys}
                                            disabled={selectedCreatedSurveyIds.length === 0}
                                        >
                                            삭제
                                        </button>
                                    </div>
                                </div>
                                {loading.created ? <p className="mypage-loading-text">로딩 중...</p> : renderSurveyList(createdSurveys, 'created', createdPage)}
                                {!loading.created && createdTotalPages > 1 && (
                                    <Pagination
                                        currentPage={createdPage}
                                        totalPages={createdTotalPages}
                                        onPageChange={setCreatedPage}
                                    />
                                )}
                            </div>
                        )}

                        {relationView === 'lists' && (
                            <div className="mypage-survey-section">
                                <div className="mypage-card-header mypage-card-header--detail">
                                    <div className="mypage-section-title-row">

                                        <div>
                                            <h2 className="mypage-section-title">내 리스트</h2>
                                            <span>내 리스트 전체를 확인할 수 있습니다.</span>
                                        </div>
                                    </div>
                                    <div className="mypage-card-header-actions">
                                        <button
                                            type="button"
                                            className="mypage-section-action-btn"
                                            onClick={() => toggleSelectAllVisible(bookmarkListVisibleIds, selectedBookmarkListIds, setSelectedBookmarkListIds)}
                                        >
                                            {isAllVisibleSelected(bookmarkListVisibleIds, selectedBookmarkListIds) ? '선택 해제' : '전체 선택'}
                                        </button>
                                        <button
                                            type="button"
                                            className="mypage-section-action-btn mypage-section-action-btn--danger"
                                            onClick={deleteSelectedBookmarkLists}
                                            disabled={selectedBookmarkListIds.length === 0}
                                        >
                                            삭제
                                        </button>
                                        <button type="button" className="mypage-add-list-btn" onClick={openBookmarkCreateModal} aria-label="새 리스트 만들기">+</button>
                                    </div>
                                </div>

                                {renderBookmarkListCards({ page: bookmarkListOverviewPage })}
                                {!loading.bookmarkLists && Math.ceil(bookmarkLists.length / DETAIL_PER_PAGE) > 1 && (
                                    <Pagination
                                        currentPage={bookmarkListOverviewPage}
                                        totalPages={Math.ceil(bookmarkLists.length / DETAIL_PER_PAGE)}
                                        onPageChange={setBookmarkListOverviewPage}
                                    />
                                )}
                            </div>
                        )}

                        {relationView === 'comments' && (
                            <div className="mypage-survey-section">
                                <div className="mypage-card-header mypage-card-header--detail">
                                    <div className="mypage-section-title-row">

                                        <div>
                                            <h2 className="mypage-section-title">댓글 관리</h2>
                                            <span>내 댓글 전체를 관리할 수 있습니다.</span>
                                        </div>
                                    </div>
                                    <div className="mypage-card-header-actions">
                                        <button
                                            type="button"
                                            className="mypage-section-action-btn"
                                            onClick={() => toggleSelectAllVisible(managedComments.map((comment) => String(comment.id)), selectedCommentIds, setSelectedCommentIds)}
                                        >
                                            {isAllVisibleSelected(managedComments.map((comment) => String(comment.id)), selectedCommentIds) ? '선택 해제' : '전체 선택'}
                                        </button>
                                        <button
                                            type="button"
                                            className="mypage-section-action-btn mypage-section-action-btn--danger"
                                            onClick={deleteSelectedComments}
                                            disabled={selectedCommentIds.length === 0}
                                        >
                                            삭제
                                        </button>
                                    </div>
                                </div>

                                {manageLoading ? (
                                    <p className="mypage-loading-text">댓글 목록을 불러오는 중...</p>
                                ) : managedComments.length === 0 ? (
                                    <p className="mypage-empty-text">관리할 댓글이 없습니다.</p>
                                ) : (
                                    <div className="mypage-rectList">
                                        {managedComments.map((comment) => (
                                            <div className="mypage-rect" key={comment.id}>
                                                <div className="mypage-survey-info" onClick={() => openCommentDetail(comment)}>
                                                    <button
                                                        type="button"
                                                        className={`mypage-selection-box ${selectedCommentIds.includes(String(comment.id)) ? 'is-selected' : ''}`}
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            toggleSelectedIds(setSelectedCommentIds, comment.id);
                                                        }}
                                                        aria-label={`${comment.surveyTitle || '댓글'} 선택`}
                                                        aria-pressed={selectedCommentIds.includes(String(comment.id))}
                                                    >
                                                        {selectedCommentIds.includes(String(comment.id)) ? '✓' : ''}
                                                    </button>
                                                    <div className="mypage-manage-preview-body">
                                                        <p className="mypage-rectText">{comment.surveyTitle}</p>
                                                        <p className="mypage-manage-preview-sub">{comment.content}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {!manageLoading && commentManageTotalPages > 1 && (
                                    <Pagination
                                        currentPage={commentManagePage}
                                        totalPages={commentManageTotalPages}
                                        onPageChange={setCommentManagePage}
                                    />
                                )}
                            </div>
                        )}

                        {relationView === 'responses' && (
                            <div className="mypage-survey-section">
                                <div className="mypage-card-header mypage-card-header--detail">
                                    <div className="mypage-section-title-row">

                                        <div>
                                            <h2 className="mypage-section-title">참여한 설문 관리</h2>
                                            <span>내 참여 설문 전체를 확인하고 관리할 수 있습니다.</span>
                                        </div>
                                    </div>
                                    <div className="mypage-card-header-actions">
                                        <button
                                            type="button"
                                            className="mypage-section-action-btn"
                                            onClick={() => toggleSelectAllVisible(respondedVisibleIds, selectedRespondedSurveyIds, setSelectedRespondedSurveyIds)}
                                        >
                                            {isAllVisibleSelected(respondedVisibleIds, selectedRespondedSurveyIds) ? '선택 해제' : '전체 선택'}
                                        </button>
                                        <button
                                            type="button"
                                            className="mypage-section-action-btn mypage-section-action-btn--danger"
                                            onClick={deleteSelectedRespondedSurveys}
                                            disabled={selectedRespondedSurveyIds.length === 0}
                                        >
                                            삭제
                                        </button>
                                    </div>
                                </div>

                                {manageLoading ? (
                                    <p className="mypage-loading-text">참여 설문 목록을 불러오는 중...</p>
                                ) : managedRespondedSurveys.length === 0 ? (
                                    <p className="mypage-empty-text">참여한 설문이 없습니다.</p>
                                ) : (
                                    <div className="mypage-rectList">
                                        {managedRespondedSurveys.map((survey) => (
                                            <div className={`mypage-rect ${selectedRespondedSurveyIds.includes(String(survey.id)) ? 'is-selected' : ''}`} key={survey.id}>
                                                <div className="mypage-survey-info" onClick={() => navigate(`/surveys/${survey.id}`)}>
                                                    <button
                                                        type="button"
                                                        className={`mypage-selection-box ${selectedRespondedSurveyIds.includes(String(survey.id)) ? 'is-selected' : ''}`}
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            toggleSelectedIds(setSelectedRespondedSurveyIds, survey.id);
                                                        }}
                                                        aria-label={`${survey.title} 선택`}
                                                        aria-pressed={selectedRespondedSurveyIds.includes(String(survey.id))}
                                                    >
                                                        {selectedRespondedSurveyIds.includes(String(survey.id)) ? '✓' : ''}
                                                    </button>
                                                    <div className="mypage-manage-preview-body">
                                                        <p className="mypage-rectText">{survey.title}</p>
                                                    </div>
                                                </div>
                                                <div className="mypage-actions">
                                                    <div className="mypage-list-menu-wrap" onClick={(event) => event.stopPropagation()}>
                                                        <button
                                                            type="button"
                                                            className="mypage-list-menu-btn"
                                                            onClick={() => toggleRespondedSurveyMenu(survey.id)}
                                                            aria-label="참여한 설문 옵션 열기"
                                                        >
                                                            ...
                                                        </button>
                                                        {openRespondedSurveyMenuId === String(survey.id) && (
                                                            <div className="mypage-list-menu">
                                                                <button type="button" onClick={() => handleEditRespondedSurvey(survey.id)}>수정</button>
                                                                <button type="button" onClick={() => handleDeleteRespondedSurvey(survey.id)}>삭제</button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {!manageLoading && responseManageTotalPages > 1 && (
                                    <Pagination
                                        currentPage={responseManagePage}
                                        totalPages={responseManageTotalPages}
                                        onPageChange={setResponseManagePage}
                                    />
                                )}
                            </div>
                        )}

                        {/* 대시보드 그리드 제거, 네비게이션에서 제어 */}
                    </section>
                </div>
            </div>
        </>
    );
}

export default Mypage;

