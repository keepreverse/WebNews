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
    searchQuery: "",
    author: "",
    dateRange: [],
  });

  const isFilterChange = useRef(false);
  const prevFilters = useRef({
    author: "",
    dateRange: JSON.stringify([]),
    searchQuery: "",
  });

  const clearFilters = useCallback(() => {
    setFilters({ searchQuery: "", author: "", dateRange: [] });
    isFilterChange.current = true;
  }, []);

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
    const term = filters.searchQuery.trim().toLowerCase();

    let filtered = allNews.filter((item) => {
      if (term) {
        const inTitle = item.title?.toLowerCase().includes(term);
        const inDesc = item.description?.toLowerCase().includes(term);
        if (!inTitle && !inDesc) return false;
      }
      return true;
    });

    if (filters.author) {
      filtered = filtered.filter(
        (item) => item.publisher_nick === filters.author
      );
    }

    if (filters.dateRange[0] && filters.dateRange[1]) {
      const from = new Date(filters.dateRange[0]).setHours(0, 0, 0, 0);
      const to = new Date(filters.dateRange[1]).setHours(23, 59, 59, 999);
      filtered = filtered.filter((item) => {
        const eventDate = new Date(item.event_start).getTime();
        return eventDate >= from && eventDate <= to;
      });
    }

    setFilteredNews(filtered);

    setPagination((prev) => {
      const totalPages = Math.ceil(filtered.length / prev.perPage);
      const currentPage =
        prev.currentPage > totalPages ? totalPages : prev.currentPage;
      return {
        ...prev,
        totalItems: filtered.length,
        totalPages,
        currentPage: filtered.length === 0 ? 1 : currentPage,
      };
    });

    if (isFilterChange.current) {
      handlePageChange(1, filtered.length);
      isFilterChange.current = false;
    }
  }, [allNews, filters, setPagination, handlePageChange]);


  const handleFilterChange = useCallback((type, value) => {
    const isSearchChanged =
      type === 'searchQuery' && value !== prevFilters.current.searchQuery

    const isAuthorChanged =
      type === 'author' && value !== prevFilters.current.author;
    const isDateChanged =
      type === 'dateRange' &&
      JSON.stringify(value) !== prevFilters.current.dateRange;

    if (isSearchChanged || isAuthorChanged || isDateChanged) {
      isFilterChange.current = true;
      prevFilters.current = {
        searchQuery: type === 'searchQuery' ? value : prevFilters.current.searchQuery,
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
    onClearFilters: clearFilters,
    handleModerate,
    handleArchive,
    fetchPendingNews,
    handlePageChange,
  };
};

export default useNewsModeration;
