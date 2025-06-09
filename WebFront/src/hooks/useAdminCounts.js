import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/apiClient';

const useAdminCounts = (pollIntervalMs) => {
  const [pendingNewsCount, setPendingNewsCount] = useState(0);
  const [trashCount, setTrashCount] = useState(0);
  const [archiveCount, setArchiveCount] = useState(0);
  const [usersCount, setUsersCount] = useState(0);

  const fetchCounts = useCallback(async () => {
    try {
      const [
        { count: pendingCount } = {},
        { count: trashCnt } = {},
        { count: archiveCnt } = {},
        { count: usersCnt } = {},
      ] = await Promise.all([
        api.get('/admin/pending-news/count'),
        api.get('/admin/trash/count'),
        api.get('/admin/archive/count'),
        api.get('/admin/users/count'),
      ]);

      if (typeof pendingCount === 'number') {
        setPendingNewsCount(pendingCount);
      }
      if (typeof trashCnt === 'number') {
        setTrashCount(trashCnt);
      }
      if (typeof archiveCnt === 'number') {
        setArchiveCount(archiveCnt);
      }
      if (typeof usersCnt === 'number') {
        setUsersCount(usersCnt);
      }
    } catch (err) {
      console.error('Ошибка при получении count-счётчиков:', err);
    }
  }, []);

  useEffect(() => {
    const conditionalFetch = () => {
      if (window.location.hash === '#/admin-panel') {
        fetchCounts();
      }
    };

    conditionalFetch();
    const id = setInterval(conditionalFetch, pollIntervalMs);
    return () => clearInterval(id);
  }, [fetchCounts, pollIntervalMs]);

  return {
    pendingNewsCount,
    trashCount,
    archiveCount,
    usersCount,
    refreshCounts: fetchCounts,
  };
};

export default useAdminCounts;
