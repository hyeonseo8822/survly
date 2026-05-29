import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import NavBar from '../components/NavBar';
import './css/Mypage.css';
import './css/UserProfile.css';
import { resolveUploadUrl } from '../utils/uploadUrl';

const getProfileStorageKey = (profileUserId) => `survly-profile-${profileUserId}`;

const readCachedAvatarUrl = (profileUserId) => {
  if (!profileUserId) {
    return '';
  }

  try {
    const raw = localStorage.getItem(getProfileStorageKey(profileUserId));
    if (!raw) {
      return '';
    }

    const cachedProfile = JSON.parse(raw);
    return resolveUploadUrl(cachedProfile?.avatarUrl || '');
  } catch {
    return '';
  }
};

function UserProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState(null);
  const [createdSurveys, setCreatedSurveys] = useState([]);
  const [respondedSurveys, setRespondedSurveys] = useState([]);
  const [followLoading, setFollowLoading] = useState(false);
  const [relationView, setRelationView] = useState('surveys');
  const [relationUsers, setRelationUsers] = useState([]);
  const [relationLoading, setRelationLoading] = useState(false);

  const safeParseJson = async (response) => {
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch {
      throw new Error('서버 응답을 처리하지 못했습니다. 서버 연결 상태를 확인해주세요.');
    }
  };

  useEffect(() => {
    const fetchProfile = async () => {
      if (!userId) {
        setError('사용자 아이디가 없습니다.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const [profileResponse, createdResponse, respondedResponse] = await Promise.all([
          fetch(`${import.meta.env.VITE_API_BASE}/api/users/${encodeURIComponent(userId)}/profile`, { headers }),
          fetch(`${import.meta.env.VITE_API_BASE}/api/users/${encodeURIComponent(userId)}/surveys`, { headers }),
          fetch(`${import.meta.env.VITE_API_BASE}/api/users/${encodeURIComponent(userId)}/responded-surveys`, { headers })
        ]);

        const profileData = await safeParseJson(profileResponse);
        const createdData = await safeParseJson(createdResponse);
        const respondedData = await safeParseJson(respondedResponse);

        if (!profileResponse.ok || !profileData.success) {
          throw new Error(profileData.message || '프로필을 불러오지 못했습니다.');
        }

        setProfile(profileData.profile);
        setCreatedSurveys(createdData.success ? (createdData.surveys || []) : []);
        setRespondedSurveys(respondedData.success ? (respondedData.surveys || []) : []);
      } catch (err) {
        setError(err.message || '프로필을 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
    setRelationView('surveys');
    setRelationUsers([]);
  }, [userId]);

  const fallbackText = String(profile?.displayName || profile?.userId || 'SV').slice(0, 2).toUpperCase();
  const avatarSrc = resolveUploadUrl(profile?.avatarUrl);

  const handleFollowToggle = async () => {
    if (!profile || profile.isMe || followLoading) {
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      setFollowLoading(true);
      const method = profile.isFollowing ? 'DELETE' : 'POST';
      const response = await fetch(`${import.meta.env.VITE_API_BASE}/api/users/${encodeURIComponent(profile.userId)}/follow`, {
        method,
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await safeParseJson(response);
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'follow 상태를 변경하지 못했습니다.');
      }

      setProfile((prev) => ({
        ...prev,
        isFollowing: Boolean(data.isFollowing),
        followerCount: Number(data.followerCount) || 0
      }));
    } catch (err) {
      setError(err.message || 'follow 상태를 변경하지 못했습니다.');
    } finally {
      setFollowLoading(false);
    }
  };

  const openRelationView = async (type) => {
    if (!profile?.userId) {
      return;
    }

    const nextType = type === 'followers' ? 'followers' : 'following';
    setRelationView(nextType);
    setRelationUsers([]);

    try {
      setRelationLoading(true);
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await fetch(`${import.meta.env.VITE_API_BASE}/api/users/${encodeURIComponent(profile.userId)}/${nextType}`, { headers });
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
      setProfile((prev) => ({ ...prev, followerCount: Number(data.followerCount) || prev.followerCount }));
    } catch (err) {
      setError(err.message || 'follow 상태 변경에 실패했습니다.');
    }
  };

  const renderUserList = () => {
    if (relationLoading) {
      return <p className='mypage-loading-text'>사용자 목록을 불러오는 중...</p>;
    }

    if (error) {
      return <p className='mypage-empty-text'>사용자 목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.</p>;
    }

    if (relationUsers.length === 0) {
      return <p className='mypage-empty-text'>표시할 사용자가 없습니다.</p>;
    }

    return (
      <div className='mypage-rectList'>
        {relationUsers.map((user, index) => {
          const avatarSrc = resolveUploadUrl(user.avatarUrl) || readCachedAvatarUrl(user.userId);

          return (
            <div className='mypage-rect' key={`${user.userId}-${index}`}>
              <div className='mypage-survey-info' onClick={() => navigate(`/profile/${user.userId}`)}>
                <div className='mypage-user-row'>
                  <div className='mypage-user-avatar'>
                    {avatarSrc ? <img src={avatarSrc} alt='' className='mypage-user-avatar-image' /> : <span>{String(user.displayName || user.userId || 'SV').slice(0, 2).toUpperCase()}</span>}
                  </div>
                  <div className='mypage-user-meta'>
                    <p className='mypage-user-name'>{user.displayName || user.userId}</p>
                    <p className='mypage-user-id'>@{user.userId}</p>
                  </div>
                </div>
              </div>
              {!user.isMe ? (
                <div className='mypage-actions'>
                  <button className='mypage-copyLinkBtn' onClick={() => toggleFollowFromList(user)}>
                    {user.isFollowing ? 'unfollow' : 'follow'}
                  </button>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    );
  };

  const renderSurveyList = (surveys) => {
    if (!Array.isArray(surveys) || surveys.length === 0) {
      return <p className='mypage-empty-text'>목록이 비어 있습니다.</p>;
    }

    return (
      <div className='mypage-rectList'>
        {surveys.map((survey, index) => (
          <div className='mypage-rect' key={survey.id}>
            <div className='mypage-survey-info' onClick={() => navigate(`/surveys/${survey.id}`)}>
              <p className='num'>{String(index + 1).padStart(2, '0')}</p>
              <p className='rectText'>{survey.title}</p>
            </div>
            <span className={`mypage-survey-status ${survey.isPublic ? 'mypage-status-public' : 'mypage-status-private'}`}>
              {survey.isPublic ? '공개' : '비공개'}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      <NavBar />
      <div className='mypage-container'>
        <div className='mypage-layout'>
          <aside className='mypage-left-column'>
            <div className='mypage-profile-panel'>
              <div className='mypage-profile-layout'>
                <div className='mypage-avatar-column'>
                  <div className='mypage-avatar-shell'>
                    {avatarSrc ? (
                      <img src={avatarSrc} alt='' className='mypage-avatar-image' />
                    ) : (
                      <span className='mypage-avatar-fallback'>{fallbackText}</span>
                    )}
                  </div>
                  <h1 className='mypage-profile-name'>{profile?.displayName || profile?.userId || userId}</h1>
                  <p className='mypage-profile-id'>@{profile?.userId || userId}</p>
                  <div className='mypage-follow-stats'>
                    <button type='button' className='mypage-follow-stat-btn' onClick={() => openRelationView('followers')}>
                      <strong>{profile?.followerCount || 0}</strong> followers
                    </button>
                    <button type='button' className='mypage-follow-stat-btn' onClick={() => openRelationView('following')}>
                      <strong>{profile?.followingCount || 0}</strong> following
                    </button>
                  </div>
                </div>

                <div className='mypage-profile-fields'>
                  {loading ? (
                    <p className='mypage-loading-text'>프로필을 불러오는 중...</p>
                  ) : (
                    <>
                      <p className='mypage-profile-empty'>프로필 소개가 없습니다.</p>
                    </>
                  )}

                  <div className='mypage-profile-controls mypage-profile-controls--stack'>
                    <button type='button' className='mypage-secondary-btn user-profile-back-btn' onClick={() => navigate(-1)}>이전으로</button>
                    {!loading && profile && !profile.isMe ? (
                      <button type='button' className='mypage-primary-btn' onClick={handleFollowToggle} disabled={followLoading}>
                        {followLoading ? '처리 중...' : (profile.isFollowing ? 'unfollow' : 'follow')}
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </aside>

          <section className='mypage-right-column'>
            {error ? <p className='mypage-error-message'>{error}</p> : null}

            {relationView !== 'surveys' && (
              <div className='mypage-survey-section'>
                <div className='mypage-card-header'>
                  <div className='mypage-section-title-row'>
                    <button type='button' className='mypage-back-arrow-btn' onClick={() => setRelationView('surveys')} aria-label='사용자 페이지로 돌아가기'>&lt;</button>
                    <h2 className='mypage-section-title'>{relationView === 'followers' ? '팔로워 목록' : '팔로잉 목록'}</h2>
                  </div>
                  <span>사용자를 눌러 프로필을 볼 수 있습니다.</span>
                </div>
                {renderUserList()}
              </div>
            )}

            {relationView === 'surveys' && (
            <div className='mypage-survey-section'>
              <div className='mypage-card-header'>
                <h2 className='mypage-section-title'>작성한 설문</h2>
                <span>이 사용자가 만든 설문 목록입니다.</span>
              </div>
              {loading ? <p className='mypage-loading-text'>로딩 중...</p> : renderSurveyList(createdSurveys)}
            </div>
            )}

            {relationView === 'surveys' && (
            <div className='mypage-survey-section'>
              <div className='mypage-card-header'>
                <h2 className='mypage-section-title'>참여한 설문</h2>
                <span>이 사용자가 참여한 공개 설문입니다.</span>
              </div>
              {loading ? <p className='mypage-loading-text'>로딩 중...</p> : renderSurveyList(respondedSurveys)}
            </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}

export default UserProfile;
