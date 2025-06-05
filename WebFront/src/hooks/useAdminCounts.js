// src/hooks/useAdminCounts.js
import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/apiClient';

const useAdminCounts = (pollIntervalMs) => {
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
    // Функция-обёртка: выполняет fetchCounts только если пользователь на /#/admin-panel
    const conditionalFetch = () => {
      if (window.location.hash === '#/admin-panel') {
        fetchCounts();
      }
    };

    // Выполняем один раз при монтировании, если на нужной странице
    conditionalFetch();

    // Устанавливаем интервал, в котором периодически проверяем hash и вызываем fetchCounts
    const id = setInterval(conditionalFetch, pollIntervalMs);
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
