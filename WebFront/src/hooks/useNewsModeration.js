import { useState, useCallback, useEffect, useRef } from 'react';
import { api } from '../services/apiClient';
import { toast } from 'react-toastify';
import usePagination from './usePagination';

const useNewsModeration = ({ isActiveTab, onExternalRefresh = 0 }) => {
  const { pagination, handlePageChange, handleDeleteAdjustment, setPagination } =
    usePagination({
      page: 1,
      perPage: 5,
      totalItems: 0,
      totalPages: 1,
    });

  const [allNews, setAllNews] = useState([]);
  const [filteredNews, setFilteredNews] = useState([]);
  const [filters, setFilters] = useState({
    author: '',
    dateRange: [],
  });

  const isFilterChange = useRef(false);
  const prevFilters = useRef({
    author: filters.author,
    dateRange: JSON.stringify(filters.dateRange),
  });

  const fetchPendingNews = useCallback(async () => {
    try {
      const data = await api.get('/admin/pending-news');
      const items = data || [];
      setAllNews(items);

      setPagination((prev) => ({
        ...prev,
        currentPage: 1,
        totalItems: items.length,
        totalPages: Math.ceil(items.length / prev.perPage),
      }));
      return items;
    } catch (error) {
      toast.error('Ошибка при загрузке списка новостей на модерацию');
      return [];
    }
  }, [setPagination]);

  useEffect(() => {
    if (!isActiveTab) return;
    fetchPendingNews();
  }, [isActiveTab, onExternalRefresh, fetchPendingNews]);

  useEffect(() => {
    let filtered = allNews.filter((news) => {
      const matchesAuthor =
        !filters.author || news.publisher_nick === filters.author;

      let matchesDate = true;
      if (filters.dateRange[0] && filters.dateRange[1]) {
        const dateFrom = new Date(filters.dateRange[0]).setHours(0, 0, 0, 0);
        const dateTo = new Date(filters.dateRange[1]).setHours(23, 59, 59, 999);
        const eventDate = new Date(news.event_start).getTime();
        matchesDate = eventDate >= dateFrom && eventDate <= dateTo;
      }
      return matchesAuthor && matchesDate;
    });

    setFilteredNews(filtered);

    setPagination((prev) => ({
      ...prev,
      totalItems: filtered.length,
      totalPages: Math.ceil(filtered.length / prev.perPage),
    }));

    if (isFilterChange.current) {
      handlePageChange(1, filtered.length);
      isFilterChange.current = false;
    }
  }, [allNews, filters, handlePageChange, setPagination]);

  const handleFilterChange = useCallback((type, value) => {
    const isAuthorChanged =
      type === 'author' && value !== prevFilters.current.author;
    const isDateChanged =
      type === 'dateRange' &&
      JSON.stringify(value) !== prevFilters.current.dateRange;

    if (isAuthorChanged || isDateChanged) {
      isFilterChange.current = true;
      prevFilters.current = {
        author: type === 'author' ? value : prevFilters.current.author,
        dateRange:
          type === 'dateRange'
            ? JSON.stringify(value)
            : prevFilters.current.dateRange,
      };
    }

    setFilters((prev) => ({ ...prev, [type]: value }));
  }, []);

  const handleModerate = useCallback(async (newsID, action, moderatorId) => {
    try {
      await api.post(`/admin/moderate-news/${newsID}`, {
        action,
        moderator_id: moderatorId,
      });
      setAllNews((prev) => prev.filter((n) => n.newsID !== newsID));
      handleDeleteAdjustment(filteredNews.length - 1);
      toast.success(
        `Новость ${action === 'approve' ? 'одобрена' : 'отклонена'}`
      );
    } catch (error) {
      toast.error(error.message || 'Ошибка модерации');
    }
  }, [filteredNews.length, handleDeleteAdjustment]);

  const handleArchive = useCallback(
    async (newsID) => {
      try {
        await api.post(`/news/${newsID}/archive`, {});
        setAllNews((prev) => prev.filter((n) => n.newsID !== newsID));
        handleDeleteAdjustment(filteredNews.length - 1);
        toast.success('Новость архивирована');
      } catch (error) {
        toast.error(error.message || 'Ошибка архивации');
      }
    },
    [filteredNews.length, handleDeleteAdjustment]
  );

  return {
    allNews,
    pendingNews: filteredNews,
    pagination,
    filters,
    onFilterChange: handleFilterChange,
    onClearFilters: () => {
      setFilters({ author: '', dateRange: [] });
      isFilterChange.current = true;
    },
    handleModerate,
    handleArchive,
    fetchPendingNews,
    handlePageChange,
  };
};

export default useNewsModeration;
