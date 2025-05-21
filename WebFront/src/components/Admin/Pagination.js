// components/Admin/Pagination.js
import React, { useState } from "react";

const Pagination = React.memo(({ totalPages, currentPage, paginate }) => {
  const [inputPage, setInputPage] = useState('');

  const handlePageInput = (e) => {
    e.preventDefault();
    const page = parseInt(inputPage);
    if (page >= 1 && page <= totalPages) {
      paginate(page);
    }
    setInputPage('');
  };

  const getVisiblePages = () => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    
    let pages = [];
    pages.push(1);
    
    if (currentPage > 3) pages.push('...');
    
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    
    for (let i = start; i <= end; i++) pages.push(i);
    
    if (currentPage < totalPages - 2) pages.push('...');
    
    pages.push(totalPages);
    
    return pages;
  };

  return (
    <div className="pagination">
      {getVisiblePages().map((page, index) => (
        page === '...' ? 
          <span key={`ellipsis-${index}`} className="pagination-ellipsis">...</span> :
          <button
            key={page}
            onClick={() => paginate(page)}
            className={`pagination_button ${currentPage === page ? "active" : ""}`}
          >
            {page}
          </button>
      ))}

      {totalPages > 10 && (
        <form onSubmit={handlePageInput} className="page-input-form">
          <input
            type="number"
            min="1"
            max={totalPages}
            value={inputPage}
            onChange={(e) => setInputPage(e.target.value)}
            placeholder="№"
          />
          <button type="submit">Перейти</button>
        </form>
      )}
    </div>
  );
});

export default Pagination;