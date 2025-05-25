// useNewsModeration.js
import { useState, useCallback, useEffect, useRef } from 'react';
import { api } from '../apiClient';
import { toast } from "react-toastify";
import usePagination from './usePagination';

const useNewsModeration = () => {
  const { 
    pagination,
    handlePageChange,
    handleDeleteAdjustment,
    setPagination
  } = usePagination({ 
    page: 1, 
    perPage: 5,
    totalItems: 0,
    totalPages: 1
  });

  const [allNews, setAllNews] = useState([]);
  const [filteredNews, setFilteredNews] = useState([]);
  const [filters, setFilters] = useState({
    author: '',
    dateRange: [null, null]
  });

  const isFilterChange = useRef(false);
  const prevFilters = useRef({ 
    author: filters.author, 
    dateRange: JSON.stringify(filters.dateRange) 
  });

  useEffect(() => {
    // Сброс фильтра автора, если в списке больше нет его новостей
    if (
      filters.author && 
      !allNews.some(n => n.publisher_nick === filters.author)
    ) {
      setFilters(prev => ({ 
        ...prev, 
        author: '' 
      }));
      isFilterChange.current = true;
    }
  }, [allNews, filters.author]);

  // Загрузка данных
  const fetchPendingNews = useCallback(async () => {
    try {
      const data = await api.get("/api/admin/pending-news");
      setAllNews(data || []);
      localStorage.setItem('cachedPendingNews', JSON.stringify(data));
      
      setPagination(prev => ({
        ...prev,
        totalItems: data.length,
        totalPages: Math.ceil(data.length / prev.perPage)
      }));
      
      return data;
    } catch (error) {
      toast.error(error.message || "Не удалось загрузить новости");
      return [];
    }
  }, [setPagination]);

  // Фильтрация
  useEffect(() => {
    const filtered = allNews.filter(news => {
      const matchesAuthor = !filters.author || news.publisher_nick === filters.author;
      const dateFrom = filters.dateRange[0] ? new Date(filters.dateRange[0]) : null;
      const dateTo = filters.dateRange[1] ? new Date(filters.dateRange[1]) : null;
      const eventDate = new Date(news.event_start);

      const matchesDate = !dateFrom || !dateTo || 
        (eventDate >= dateFrom && eventDate <= dateTo);

      return matchesAuthor && matchesDate;
    });

    setFilteredNews(filtered);
    
    setPagination(prev => ({
      ...prev,
      totalItems: filtered.length,
      totalPages: Math.ceil(filtered.length / prev.perPage)
    }));

    if (isFilterChange.current) {
      handlePageChange(1, filtered.length);
      isFilterChange.current = false;
    }
  }, [allNews, filters, handlePageChange, setPagination]);

  // Обработчик фильтров
  const handleFilterChange = useCallback((type, value) => {
    const isAuthorChanged = type === 'author' && value !== prevFilters.current.author;
    const isDateChanged = type === 'dateRange' && JSON.stringify(value) !== prevFilters.current.dateRange;

    if (isAuthorChanged || isDateChanged) {
      isFilterChange.current = true;
      prevFilters.current = {
        author: type === 'author' ? value : prevFilters.current.author,
        dateRange: type === 'dateRange' ? JSON.stringify(value) : prevFilters.current.dateRange
      };
    }

    setFilters(prev => ({ ...prev, [type]: value }));
  }, []);

  // Модерация и архивация (без изменений)
  const handleModerate = async (newsID, action, moderatorId) => {
    try {
      await api.post(`/api/admin/moderate-news/${newsID}`, { action, moderator_id: moderatorId });
      setAllNews(prev => prev.filter(news => news.newsID !== newsID));
      handleDeleteAdjustment(filteredNews.length - 1);
      toast.success(`Новость ${action === 'approve' ? 'одобрена' : 'отклонена'}`);
    } catch (error) {
      throw error;
    }
  };

  const handleArchive = async (newsID) => {
    try {
      await api.post(`/api/news/${newsID}/archive`, {});
      setAllNews(prev => prev.filter(news => news.newsID !== newsID));
      handleDeleteAdjustment(filteredNews.length - 1);
      toast.success("Новость архивирована");
    } catch (error) {
      toast.error(error.message || "Ошибка архивации");
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
    handlePageChange
  };
};

export default useNewsModeration;