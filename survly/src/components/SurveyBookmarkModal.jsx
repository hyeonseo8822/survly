function SurveyBookmarkModal({
  open,
  loading,
  title,
  lists,
  disabled,
  onClose,
  onToggle
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="survey-bookmark-modal-overlay" onClick={onClose}>
      <div className="survey-bookmark-modal" onClick={(event) => event.stopPropagation()}>
        <div className="survey-bookmark-modal__header">
          <div>
            <p className="survey-bookmark-modal__eyebrow">북마크 목록 선택</p>
            <h3>{title || '설문 북마크'}</h3>
          </div>
          <button type="button" className="survey-bookmark-modal__close" onClick={onClose} aria-label="북마크 팝업 닫기">×</button>
        </div>

        {loading ? (
          <p className="survey-bookmark-modal__empty">목록을 불러오는 중...</p>
        ) : !lists?.length ? (
          <p className="survey-bookmark-modal__empty">사용 가능한 목록이 없습니다.</p>
        ) : (
          <div className="survey-bookmark-modal__list">
            {lists.map((list) => (
              <button
                key={list.id}
                type="button"
                className={`survey-bookmark-modal__item ${list.isBookmarked ? 'is-active' : ''}`}
                onClick={(event) => onToggle(event, list.id)}
                disabled={disabled}
              >
                <span>{list.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default SurveyBookmarkModal;
