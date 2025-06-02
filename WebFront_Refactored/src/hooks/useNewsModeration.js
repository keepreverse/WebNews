// useNewsModeration.js
import { useState, useCallback, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../services/apiClient';
import { toast } from 'react-toastify';
import usePagination from './usePagination';

const useNewsModeration = () => {
  const {
    pagination,
    handlePageChange,
    handleDeleteAdjustment,
    setPagination,
  } = usePagination({
    page: 1,
    perPage: 5,
    totalItems: 0,
    totalPages: 1,
  });

  const [allNews, setAllNews] = useState([]);
  const [filteredNews, setFilteredNews] = useState([]);
  const [filters, setFilters] = useState({
    author: '',
    dateRange: [null, null],
  });

  const isFilterChange = useRef(false);
  const prevFilters = useRef({
    author: filters.author,
    dateRange: JSON.stringify(filters.dateRange),
  });

  // Сбрасываем фильтр автора, если он больше не встречается в allNews
  useEffect(() => {
    if (
      filters.author &&
      !allNews.some((n) => n.publisher_nick === filters.author)
    ) {
      setFilters((prev) => ({ ...prev, author: '' }));
      isFilterChange.current = true;
    }
  }, [allNews, filters.author]);

  // Функция загрузки списка новостей на модерацию
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
      return [];
    }
  }, [setPagination]);

  const location = useLocation();

  // Запуск polling только при нахождении на /admin-panel
  useEffect(() => {
    if (location.pathname !== '/admin-panel') return;

    fetchPendingNews();
    const interval = setInterval(fetchPendingNews, 20000);
    return () => clearInterval(interval);
  }, [fetchPendingNews, location.pathname]);

  // Применяем фильтрацию по allNews → filteredNews
  useEffect(() => {
    const filtered = allNews.filter((news) => {
      const matchesAuthor =
        !filters.author || news.publisher_nick === filters.author;
      const dateFrom = filters.dateRange[0]
        ? new Date(filters.dateRange[0])
        : null;
      const dateTo = filters.dateRange[1]
        ? new Date(filters.dateRange[1])
        : null;
      const eventDate = new Date(news.event_start);

      const matchesDate =
        !dateFrom ||
        !dateTo ||
        (eventDate >= dateFrom && eventDate <= dateTo);

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

  // Обработчик изменения фильтров
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

  // Отправка решения по модерации (approve/reject)
  const handleModerate = useCallback(async (newsID, action, moderatorId) => {
    try {
      await api.post(`/admin/moderate-news/${newsID}`, {
        action,
        moderator_id: moderatorId,
      });
      setAllNews((prev) => prev.filter((n) => n.newsID !== newsID));
      toast.success(
        `Новость ${action === 'approve' ? 'одобрена' : 'отклонена'}`
      );
    } catch (error) {
      toast.error(error.message || "Ошибка модерации");
    }
  }, []);

  // Архивирование новости
  const handleArchive = async (newsID) => {
    try {
      await api.post(`/news/${newsID}/archive`, {});
      setAllNews((prev) => prev.filter((n) => n.newsID !== newsID));
      handleDeleteAdjustment(filteredNews.length - 1);
      toast.success('Новость архивирована');
    } catch (error) {
      toast.error(error.message || 'Ошибка архивации');
    }
  };

  return {
    allNews,
    pendingNews: filteredNews,
    pagination,
    handleModerate,
    handleArchive,
    filters,
    onFilterChange: handleFilterChange,
    onClearFilters: () => {
      setFilters({ author: '', dateRange: [null, null] });
      isFilterChange.current = true;
    },
    fetchPendingNews,
    handlePageChange,
  };
};

export default useNewsModeration;
