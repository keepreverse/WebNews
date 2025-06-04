// src/hooks/useAdminCounts.js
import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/apiClient';

const useAdminCounts = (pollIntervalMs = 20000) => {
  const [pendingNewsCount, setPendingNewsCount] = useState(0);
  const [trashCount, setTrashCount] = useState(0);
  const [archiveCount, setArchiveCount] = useState(0);

  const fetchCounts = useCallback(async () => {
    try {
      const [
        { count: pendingCount } = {},
        { count: trashCnt } = {},
        { count: archiveCnt } = {},
      ] = await Promise.all([
        api.get('/admin/pending-news/count'),
        api.get('/admin/trash/count'),
        api.get('/admin/archive/count'),
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
    } catch (err) {
      console.error('Ошибка при получении count-счётчиков:', err);
    }
  }, []);

  useEffect(() => {
    // Загрузка сразу при монтировании
    fetchCounts();
    // Последующий периодический опрос
    const id = setInterval(fetchCounts, pollIntervalMs);
    return () => clearInterval(id);
  }, [fetchCounts, pollIntervalMs]);

  return {
    pendingNewsCount,
    trashCount,
    archiveCount,
    // Функция для ручного обновления (например, при смене вкладки)
    refreshCounts: fetchCounts,
  };
};

export default useAdminCounts;
