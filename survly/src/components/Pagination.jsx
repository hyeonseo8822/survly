import { useState, useEffect } from 'react';

/**
 * @component Pagination
 * @description 페이지네이션 UI를 생성하고 관리하는 컴포넌트입니다.
 *              페이지 번호 목록과 이전/다음 버튼을 제공합니다.
 * 
 * @param {object} props - 컴포넌트의 props
 * @param {number} props.currentPage - 현재 활성화된 페이지 번호
 * @param {number} props.totalPages - 전체 페이지 수
 * @param {function} props.onPageChange - 페이지 번호가 변경될 때 호출되는 콜백 함수
 */
const Pagination = ({ currentPage, totalPages, onPageChange }) => {
    // 한 번에 보여줄 페이지 번호의 그룹 크기 (예: 1, 2, 3 또는 4, 5, 6)
    const pagesPerGroup = 3;
    
    // 현재 페이지가 속한 페이지 그룹을 관리하는 state
    // 예: currentPage가 1~3이면 pageGroup은 0, 4~6이면 1
    const [pageGroup, setPageGroup] = useState(Math.floor((currentPage - 1) / pagesPerGroup));

    // currentPage prop이 변경될 때마다 pageGroup state를 다시 계산하여 동기화합니다.
    useEffect(() => {
        setPageGroup(Math.floor((currentPage - 1) / pagesPerGroup));
    }, [currentPage]);

    // 현재 페이지 그룹의 시작 페이지 번호를 계산합니다.
    const startPage = pageGroup * pagesPerGroup + 1;
    // 현재 페이지 그룹의 끝 페이지 번호를 계산합니다. 전체 페이지 수를 넘지 않도록 합니다.
    const endPage = Math.min(startPage + pagesPerGroup - 1, totalPages);

    // 화면에 표시할 페이지 번호들의 배열을 생성합니다.
    const pageNumbers = [];
    for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
    }

    /**
     * @function handlePrev
     * @description '이전' 버튼 클릭 시 호출됩니다. 현재 페이지가 1보다 크면 onPageChange를 호출하여 이전 페이지로 이동합니다.
     */
    const handlePrev = () => {
        if (currentPage > 1) {
            onPageChange(currentPage - 1);
        }
    };

    /**
     * @function handleNext
     * @description '다음' 버튼 클릭 시 호출됩니다. 현재 페이지가 마지막 페이지보다 작으면 onPageChange를 호출하여 다음 페이지로 이동합니다.
     */
    const handleNext = () => {
        if (currentPage < totalPages) {
            onPageChange(currentPage + 1);
        }
    };

    // 전체 페이지가 1 이하이면 페이지네이션을 렌더링하지 않습니다.
    if (totalPages <= 1) return null;

    return (
        <div className="pagination">
            {/* 이전 페이지로 가는 버튼. 첫 페이지에서는 비활성화됩니다. */}
            <button onClick={handlePrev} disabled={currentPage === 1}>&lt;</button>
            
            {/* 계산된 페이지 번호들을 버튼으로 렌더링합니다. */}
            {pageNumbers.map(number => (
                <button 
                    key={number} 
                    onClick={() => onPageChange(number)} 
                    // 현재 페이지와 일치하는 버튼에는 'active' 클래스를 적용합니다.
                    className={currentPage === number ? 'active' : ''}
                >
                    {number}
                </button>
            ))}
            
            {/* 다음 페이지로 가는 버튼. 마지막 페이지에서는 비활성화됩니다. */}
            <button onClick={handleNext} disabled={currentPage === totalPages}>&gt;</button>
        </div>
    );
};

export default Pagination;
