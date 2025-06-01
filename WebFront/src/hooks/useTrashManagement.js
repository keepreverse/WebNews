import { useState, useCallback, useEffect } from 'react';
import { api } from '../apiClient';
import { toast } from "react-toastify";
import usePagination from './usePagination';

const useTrashManagement = () => {
  const { 
    pagination,
    handlePageChange,
    setPagination
  } = usePagination({ 
    page: 1, 
    perPage: 5,
    totalItems: 0,
    totalPages: 1
  });

  const [deletedNews, setDeletedNews] = useState([]);

  useEffect(() => {
    setPagination(prev => {
      const totalItems = deletedNews.length;
      const totalPages = Math.ceil(totalItems / prev.perPage);
      
      // Рассчитываем корректный текущий номер страницы
      const currentPage = totalItems === 0 
        ? 1 
        : Math.min(prev.currentPage, totalPages);
      
      return {
        ...prev,
        totalItems,
        totalPages,
        currentPage
      };
    });
  }, [deletedNews, setPagination]);

  const fetchDeletedNews = useCallback(async () => {
    try {
      const data = await api.get("/api/admin/trash");
      setDeletedNews(data);
    } catch (error) {
      toast.error("Ошибка загрузки корзины");
    }
  }, []);

  const restoreNews = useCallback(async (newsID) => {
    try {
      await api.post(`/api/admin/trash/${newsID}/restore`);
      setDeletedNews(prev => prev.filter(n => n.newsID !== newsID));
      toast.success("Новость восстановлена");
    } catch (error) {
      toast.error("Ошибка восстановления");
    }
  }, []);

  const purgeSingleNews = useCallback(async (newsID) => {
    try {
      await api.delete(`/api/admin/trash/${newsID}/purge`);
      setDeletedNews(prev => prev.filter(n => n.newsID !== newsID));
      toast.success("Новость окончательно удалена");
    } catch (error) {
      toast.error("Ошибка удаления");
    }
  }, []); // Убрана ручная установка пагинации

  const purgeTrash = useCallback(async () => {
    if (!window.confirm("Удалить все новости безвозвратно?")) return;
    
    try {
      await api.delete("/api/admin/trash/purge");
      setDeletedNews([]);
      toast.success("Корзина очищена");
    } catch (error) {
      toast.error("Ошибка очистки");
    }
  }, []);

  useEffect(() => {
    const checkExpiration = async () => {
      try {
        await api.post('/api/admin/trash/check-expired');
      } catch (error) {
        console.error('Ошибка проверки срока хранения:', error);
      }
    };
    checkExpiration();
  }, []);

  return {
    deletedNews,
    restoreNews,
    purgeSingleNews,
    purgeTrash,
    pagination,
    fetchDeletedNews,
    handlePageChange
  };
};

export default useTrashManagement;