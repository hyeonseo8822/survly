import { useState, useEffect } from 'react';

// Pagination 컴포넌트
const Pagination = ({ currentPage, totalPages, onPageChange }) => {
    const pagesPerGroup = 3;
    const [pageGroup, setPageGroup] = useState(Math.floor((currentPage - 1) / pagesPerGroup));

    useEffect(() => {
        setPageGroup(Math.floor((currentPage - 1) / pagesPerGroup));
    }, [currentPage]);

    const startPage = pageGroup * pagesPerGroup + 1;
    const endPage = Math.min(startPage + pagesPerGroup - 1, totalPages);

    const pageNumbers = [];
    for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
    }

    const handlePrev = () => {
        if (currentPage > 1) {
            onPageChange(currentPage - 1);
        }
    };

    const handleNext = () => {
        if (currentPage < totalPages) {
            onPageChange(currentPage + 1);
        }
    };

    if (totalPages <= 1) return null;

    return (
        <div className="pagination">
            <button onClick={handlePrev} disabled={currentPage === 1}>&lt;</button>
            {pageNumbers.map(number => (
                <button 
                    key={number} 
                    onClick={() => onPageChange(number)} 
                    className={currentPage === number ? 'active' : ''}
                >
                    {number}
                </button>
            ))}
            <button onClick={handleNext} disabled={currentPage === totalPages}>&gt;</button>
        </div>
    );
};

export default Pagination;
