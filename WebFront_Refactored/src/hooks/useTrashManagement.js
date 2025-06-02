// src/hooks/useTrashManagement.js
import { useState, useCallback, useEffect } from "react";
import { api } from "../services/apiClient";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import usePagination from "./usePagination";

const useTrashManagement = () => {
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

  // 1) полный список (аналог allCategories)
  const [allTrash, setAllTrash] = useState([]);

  // 2) отфильтрованный (аналог categories)
  const [trash, setTrash] = useState([]);

  // 3) фильтры (аналог filters в категориях: здесь search + dateRange)
  const [filters, setFilters] = useState({
    search: "",
    dateRange: [null, null],
  });

  // 4) загрузка «сырая»
  const fetchDeletedNews = useCallback(async () => {
    try {
      const data = await api.get("/admin/trash");
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
    fetchDeletedNews();
  }, [fetchDeletedNews]);

  // 5) фильтрация → пересчёт pagination
  useEffect(() => {
    const term = filters.search.trim().toLowerCase();

    let result = allTrash.filter((item) => {
      if (term) {
        // ищем по title или description
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

  // 6) изменение фильтров (сброс на 1-ю страницу)
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

  // 7) восстановление новости
  const restoreNews = useCallback(async (newsID) => {
    try {
      await api.post(`/admin/trash/${newsID}/restore`);
      setAllTrash((prev) => prev.filter((item) => item.newsID !== newsID));
      toast.success("Новость восстановлена");
    } catch {
      toast.error("Ошибка восстановления");
    }
  }, []);

  // 8) восстановление с правкой новости
  const restoreEditNews = async (newsID) => {
    try {
      // Сначала восстанавливаем новость
      await api.post(`/admin/trash/${newsID}/restore-edit`);
      // После успешного restore — переходим в редактор с передачей ?edit=id
      navigate(`/news-creator?edit=${newsID}`);
    } catch (err) {
      console.error("Не удалось восстановить новость:", err);
      // Здесь, при желании, можно вывести toast.error(err.message)
    }
  };

  // 9) окончательное удаление одной новости
  const purgeSingleNews = useCallback(async (newsID) => {
    try {
      await api.delete(`/admin/trash/${newsID}/purge`);
      setAllTrash((prev) => prev.filter((item) => item.newsID !== newsID));
      toast.success("Новость окончательно удалена");
    } catch {
      toast.error("Ошибка удаления");
    }
  }, []);

  // 10) очистка всей корзины
  const purgeTrash = useCallback(async () => {
    if (!window.confirm("Удалить все новости безвозвратно?")) return;
    try {
      await api.delete("/admin/trash/purge");
      setAllTrash([]);
      toast.success("Корзина очищена");
    } catch {
      toast.error("Ошибка очистки корзины");
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
