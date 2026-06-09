export async function fetchSurveyBookmarkStatus(surveyId, token) {
  const response = await fetch(`${import.meta.env.VITE_API_BASE}/api/surveys/${surveyId}/bookmark-status`, {
    headers: { Authorization: `Bearer ${token}` }
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
}
