import { useState, useCallback, useEffect, useRef } from 'react';
import { api } from '../services/apiClient';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import usePagination from './usePagination';

const useArchiveManagement = ({ isActiveTab, onExternalRefresh = 0 }) => {
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

  const [allArchive, setAllArchive] = useState([]);
  const [archive, setArchive] = useState([]);
  const [filters, setFilters] = useState({
    searchQuery: '',
    dateRange: [],
  });

  const isFilterChange = useRef(false);
  const prevFilters = useRef({
    searchQuery: filters.searchQuery,
    dateRange: JSON.stringify(filters.dateRange),
  });

  const fetchArchivedNews = useCallback(async () => {
    try {
      const data = await api.get('/admin/archived-news');
      const items = data || [];
      setAllArchive(items);

      setPagination((prev) => ({
        ...prev,
        currentPage: 1,
        totalItems: items.length,
        totalPages: Math.ceil(items.length / prev.perPage),
      }));
    } catch (error) {
      toast.error('Ошибка при загрузке архива');
    }
  }, [setPagination]);

  useEffect(() => {
    if (!isActiveTab) return;
    fetchArchivedNews();
  }, [isActiveTab, onExternalRefresh, fetchArchivedNews]);

  useEffect(() => {
    const term = filters.searchQuery.trim().toLowerCase();

    let result = allArchive.filter((item) => {
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
        if (!item.publish_date && !item.create_date) return false;
        const d = new Date(item.publish_date || item.create_date).getTime();
        return d >= from && d <= to;
      });
    }

    setArchive(result);

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

    if (isFilterChange.current) {
      handlePageChange(1, result.length);
      isFilterChange.current = false;
    }
  }, [allArchive, filters, setPagination, handlePageChange]);

  const handleFilterChange = useCallback((type, value) => {
    const isSearchChanged =
      type === 'searchQuery' && value !== prevFilters.current.searchQuery;
    const isDateChanged =
      type === 'dateRange' &&
      JSON.stringify(value) !== prevFilters.current.dateRange;

    if (isSearchChanged || isDateChanged) {
      isFilterChange.current = true;
      prevFilters.current = {
        searchQuery:
          type === 'searchQuery' ? value : prevFilters.current.searchQuery,
        dateRange:
          type === 'dateRange'
            ? JSON.stringify(value)
            : prevFilters.current.dateRange,
      };
    }

    setFilters((prev) => ({ ...prev, [type]: value }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({ searchQuery: '', dateRange: [] });
    isFilterChange.current = true;
  }, []);

  const restoreNews = useCallback(
    async (newsID) => {
      try {
        await api.post(`/admin/archived-news/${newsID}/restore`);
        setAllArchive((prev) => prev.filter((item) => item.newsID !== newsID));
        toast.success('Новость восстановлена из архива');
      } catch {
        toast.error('Ошибка при восстановлении из архива');
      }
    },
    []
  );

  const restoreEditNews = async (newsID) => {
    try {
      await api.post(`/admin/archived-news/${newsID}/restore-edit`);
      navigate(`/news-creator?edit=${newsID}`);
    } catch {
      toast.error('Не удалось восстановить для редактирования');
    }
  };

  const deleteArchiveNews = useCallback(
    async (newsID) => {
      try {
        await api.delete(`/admin/archived-news/${newsID}/delete`);
        setAllArchive((prev) => prev.filter((item) => item.newsID !== newsID));
        toast.success('Новость перемещена в корзину');
      } catch {
        toast.error('Ошибка при перемещении в корзину');
      }
    },
    []
  );

  const deleteArchive = useCallback(async () => {
    if (!window.confirm('Переместить ВСЕ новости в корзину?')) return;
    try {
      await api.delete('/admin/archived-news/delete');
      setAllArchive([]);
      toast.success('Архив очищен');
    } catch {
      toast.error('Ошибка очистки архива');
    }
  },[]);
  
  return {
    allArchive,
    archive,
    pagination,
    filters,
    onFilterChange: handleFilterChange,
    onClearFilters: clearFilters,
    fetchArchivedNews,
    restoreNews,
    restoreEditNews,
    handlePageChange,
    deleteArchiveNews,
    deleteArchive,
  };
};

export default useArchiveManagement;
