import { useState, useCallback } from 'react';
import { api } from '../apiClient';
import { toast } from "react-toastify";

const useNewsModeration = () => {
  const [pendingNews, setPendingNews] = useState([]);
  const [filters, setFilters] = useState({
    author: '',
    dateRange: []
  });
  const [newsCurrentPage, setNewsCurrentPage] = useState(1);
  const newsPerPage = 5;

  const fetchPendingNews = useCallback(async () => {
    try {
      const data = await api.get("/api/admin/pending-news");
      setPendingNews(data);
      return data;
    } catch (error) {
      console.error("Ошибка загрузки новостей:", error);
      toast.error(error.message || "Не удалось загрузить новости");
      return [];
    }
  }, []);

  const handleModerate = async (newsID, action, moderatorId) => {
    try {
      await api.post(`/api/admin/moderate-news/${newsID}`, {
        action: action,
        moderator_id: moderatorId
      });
      toast.success(`Новость успешно ${action === 'approve' ? 'одобрена' : 'отклонена'}`);
    } catch (error) {
      console.error("Ошибка модерации:", error);
      throw error;
    }
  };

  const handleArchive = async (newsID) => {
    try {
      await api.post(`/api/news/${newsID}/archive`, {});
      toast.success("Новость успешно архивирована");
      fetchPendingNews();
    } catch (error) {
      console.error("Ошибка архивации:", error);
      toast.error(error.message || "Не удалось архивировать новость");
    }
  };

  return {
    pendingNews,
    newsCurrentPage,
    newsPerPage,
    newsTotalPages: Math.ceil(pendingNews.length / newsPerPage),
    setNewsCurrentPage,
    handleModerate,
    handleArchive,
    filters,
    handleFilterChange: (type, value) => {
      setFilters(prev => ({ ...prev, [type]: value }));
    },
    clearFilters: () => {
      setFilters({ author: '', dateRange: [] });
    },
    fetchPendingNews
  };
};

export default useNewsModeration;