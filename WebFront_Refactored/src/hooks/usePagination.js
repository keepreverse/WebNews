import { useState, useCallback } from 'react';

const usePagination = (initialState = { page: 1, perPage: 10 }) => {
  const [pagination, setPagination] = useState({
    currentPage: initialState.page,
    perPage: initialState.perPage,
    totalPages: 1,
    totalItems: 0,
  });

  const calculateTotalPages = useCallback(
    (totalItems) => Math.ceil(totalItems / pagination.perPage),
    [pagination.perPage]
  );

  const handlePageChange = useCallback(
    (newPage, totalItems) => {
      const totalPages = calculateTotalPages(totalItems);
      setPagination(prev => ({
        ...prev,
        currentPage: Math.max(1, Math.min(newPage, totalPages)),
        totalPages,
        totalItems
      }));
    },
    [calculateTotalPages]
  );

  const handleDeleteAdjustment = useCallback(
    (remainingItems) => {
      const totalPages = calculateTotalPages(remainingItems);
      setPagination(prev => ({
        ...prev,
        currentPage: prev.currentPage > totalPages ? totalPages : prev.currentPage,
        totalPages,
        totalItems: remainingItems
      }));
    },
    [calculateTotalPages]
  );

  return {
    pagination,
    setPagination,
    handlePageChange,
    handleDeleteAdjustment,
    calculateTotalPages
  };
};

export default usePagination;