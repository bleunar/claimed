import React from 'react';
import { ChevronLeft, ChevronRight, ChevronDoubleLeft, ChevronDoubleRight } from 'react-bootstrap-icons';

const Pagination = ({ itemsPerPage, totalItems, paginate, currentPage }) => {
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    if (totalPages <= 1) return null;

    let startPage, endPage;
    if (totalPages <= 5) {
        startPage = 1;
        endPage = totalPages;
    } else {
        if (currentPage <= 3) {
            startPage = 1;
            endPage = 5;
        } else if (currentPage + 2 >= totalPages) {
            startPage = totalPages - 4;
            endPage = totalPages;
        } else {
            startPage = currentPage - 2;
            endPage = currentPage + 2;
        }
    }

    const pageNumbers = [];
    for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
    }

    return (
        <nav>
            <ul className="pagination justify-content-center mt-4 user-select-none">
                <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                    <button
                        onClick={() => paginate(1)}
                        className="page-link"
                        disabled={currentPage === 1}
                        title='Jump at the start'
                    >
                        <ChevronDoubleLeft />
                    </button>
                </li>
                <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                    <button
                        onClick={() => currentPage > 1 && paginate(currentPage - 1)}
                        className="page-link"
                        disabled={currentPage === 1}
                        title='Previous Page'
                    >
                        <ChevronLeft />
                    </button>
                </li>
                {pageNumbers.map(number => (
                    <li key={number} className={`page-item ${currentPage === number ? 'active' : ''}`}>
                        <button onClick={() => paginate(number)} className="page-link">
                            {number}
                        </button>
                    </li>
                ))}
                <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                    <button
                        onClick={() => currentPage < totalPages && paginate(currentPage + 1)}
                        className="page-link"
                        disabled={currentPage === totalPages}
                        title='Next Page'
                    >
                        <ChevronRight />
                    </button>
                </li>
                <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                    <button
                        onClick={() => paginate(totalPages)}
                        className="page-link"
                        disabled={currentPage === totalPages}
                        title='Jump at the end'
                    >
                        <ChevronDoubleRight />
                    </button>
                </li>
            </ul>
            <div className="text-center text-muted small mt-2">
                {currentPage} / {totalPages}
            </div>
        </nav>
    );
};

export default Pagination;
