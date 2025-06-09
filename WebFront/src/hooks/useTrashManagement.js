import { useState, useCallback, useEffect } from 'react';
import { api } from '../services/apiClient';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import usePagination from './usePagination';

const useTrashManagement = ({ isActiveTab, onExternalRefresh = 0 }) => {
  const {
    pagination,
    handlePageChange,
    setPagination,
  } = usePagination({
    page: 1,
    perPage: 5,
    totalItems: 0,
    totalPages: 1,
  });

  const navigate = useNavigate();

  const [allTrash, setAllTrash] = useState([]);
  const [trash, setTrash] = useState([]);
  const [filters, setFilters] = useState({
    search: '',
    dateRange: [],
  });

  const fetchDeletedNews = useCallback(async () => {
    try {
      const data = await api.get('/admin/trash');
      const items = data || [];
      setAllTrash(items);

      setPagination((prev) => ({
        ...prev,
        currentPage: 1,
        totalItems: items.length,
        totalPages: Math.ceil(items.length / prev.perPage),
      }));
    } catch {
    }
  }, [setPagination]);

  useEffect(() => {
    if (!isActiveTab) return;
    fetchDeletedNews();
  }, [isActiveTab, onExternalRefresh, fetchDeletedNews]);

  useEffect(() => {
    const term = filters.search.trim().toLowerCase();

    let result = allTrash.filter((item) => {
      if (term) {
        const inTitle = item.title?.toLowerCase().includes(term);
        const inDesc = item.description?.toLowerCase().includes(term);
        if (!inTitle && !inDesc) return false;
      }
      return true;
    });

    if (filters.dateRange[0] && filters.dateRange[1]) {
      const from = new Date(filters.dateRange[0]).setHours(0, 0, 0, 0);
      const to = new Date(filters.dateRange[1]).setHours(23, 59, 59, 999);
      result = result.filter((item) => {
        if (!item.delete_date) return false;
        const d = new Date(item.delete_date).getTime();
        return d >= from && d <= to;
      });
    }

    setTrash(result);

    setPagination((prev) => {
      const totalPages = Math.ceil(result.length / prev.perPage);
      const currentPage =
        prev.currentPage > totalPages ? totalPages : prev.currentPage;
      return {
        ...prev,
        totalItems: result.length,
        totalPages,
        currentPage: result.length === 0 ? 1 : currentPage,
      };
    });
  }, [allTrash, filters, setPagination]);

  const handleFilterChange = useCallback(
    (type, value) => {
      setFilters((prev) => ({ ...prev, [type]: value }));
      setPagination((prev) => ({
        ...prev,
        currentPage: 1,
      }));
    },
    [setPagination]
  );

  const restoreNews = useCallback(async (newsID) => {
    try {
      await api.post(`/admin/trash/${newsID}/restore`);
      setAllTrash((prev) => prev.filter((item) => item.newsID !== newsID));
      toast.success('Новость восстановлена');
    } catch {
      toast.error('Ошибка восстановления');
    }
  }, []);

  const restoreEditNews = async (newsID) => {
    try {
      await api.post(`/admin/trash/${newsID}/restore-edit`);
      navigate(`/news-creator?edit=${newsID}`);
    } catch (err) {
      console.error('Не удалось восстановить новость:', err);
    }
  };

  const purgeSingleNews = useCallback(async (newsID) => {
    try {
      await api.delete(`/admin/trash/${newsID}/purge`);
      setAllTrash((prev) => prev.filter((item) => item.newsID !== newsID));
      toast.success('Новость окончательно удалена');
    } catch {
      toast.error('Ошибка удаления');
    }
  }, []);

  const purgeTrash = useCallback(async () => {
    if (!window.confirm('Удалить ВСЕ новости безвозвратно?')) return;
    try {
      await api.delete('/admin/trash/purge');
      setAllTrash([]);
      toast.success('Корзина очищена');
    } catch {
      toast.error('Ошибка очистки корзины');
    }
  }, []);

  return {
    allTrash,
    trash,
    pagination,
    filters,
    fetchDeletedNews,
    handlePageChange,
    handleFilterChange,
    restoreNews,
    restoreEditNews,
    purgeSingleNews,
    purgeTrash,
  };
};

export default useTrashManagement;
