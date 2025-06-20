import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { api } from "../services/apiClient";
import { toast } from "react-toastify";

import usePagination from "./usePagination";

const useNewsList = () => {
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
    author: "",
    dateRange: [],
    searchQuery: "",
  });
  const isFilterChange = useRef(false);
  const prevFilters = useRef({
    author: "",
    dateRange: JSON.stringify([]),
    searchQuery: "",
  });

  const fetchNews = useCallback(async () => {
    try {
      const data = await api.get("/news");
      const published = data.filter(
        (item) => item.status === "Approved" && !item.delete_date
      );
      setAllNews(published);
      setFilteredNews(published);
      setPagination((prev) => ({
        ...prev,
        totalItems: published.length,
        totalPages: Math.ceil(published.length / prev.perPage),
      }));
    } catch (error) {
      setAllNews([]);
      setFilteredNews([]);
      setPagination((prev) => ({
        ...prev,
        totalItems: 0,
        totalPages: 1,
      }));
    }
  }, [setPagination]);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  useEffect(() => {
    let result = [...allNews];

    if (filters.author) {
      result = result.filter(
        (item) => item.publisher_nick === filters.author
      );
    }

    if (filters.dateRange[0] && filters.dateRange[1]) {
      const [start, end] = filters.dateRange;
      const fromTime = new Date(start).setHours(0, 0, 0, 0);
      const toTime = new Date(end).setHours(23, 59, 59, 999);

      result = result.filter((item) => {
        const itemTime = new Date(item.event_start).getTime();
        return itemTime >= fromTime && itemTime <= toTime;
      });
    }

    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      result = result.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          (item.description &&
            item.description.toLowerCase().includes(q))
      );
    }

    setFilteredNews(result);

    setPagination((prev) => ({
      ...prev,
      totalItems: result.length,
      totalPages: Math.ceil(result.length / prev.perPage),
    }));

    if (isFilterChange.current) {
      handlePageChange(1, result.length);
      isFilterChange.current = false;
    }
  }, [allNews, filters, handlePageChange, setPagination]);

  const handleFilterChange = useCallback((type, value) => {
    const prev = prevFilters.current;
    const next = { ...prev };

    if (type === "author" && value !== prev.author) {
      isFilterChange.current = true;
      next.author = value;
    }
    if (
      type === "dateRange" &&
      JSON.stringify(value) !== prev.dateRange
    ) {
      isFilterChange.current = true;
      next.dateRange = JSON.stringify(value);
    }
    if (type === "searchQuery" && value !== prev.searchQuery) {
      isFilterChange.current = true;
      next.searchQuery = value;
    }

    prevFilters.current = next;

    setFilters((prevState) => ({
      ...prevState,
      [type]: value,
    }));
  }, []);

  const clearFilters = useCallback(() => {
    prevFilters.current = {
      author: "",
      dateRange: JSON.stringify([]),
      searchQuery: "",
    };
    isFilterChange.current = true;
    setFilters({ author: "", dateRange: [], searchQuery: "" });
  }, []);

  const archiveNews = useCallback(
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

  const deleteNews = useCallback(
    async (newsID) => {
      try {
        await api.delete(`/news/${newsID}`);
        toast.success("Новость удалена успешно!");

        setAllNews((prev) =>
          prev.filter((item) => item.newsID !== newsID)
        );
        handleDeleteAdjustment(filteredNews.length - 1);
      } catch (error) {
        console.error("Ошибка при удалении новости:", error);
        toast.error(error.message || "Ошибка при удалении новости");
      }
    },
    [filteredNews.length, handleDeleteAdjustment]
  );

  const deleteAllNews = useCallback(async () => {
    if (!window.confirm("Вы уверены, что хотите удалить ВСЕ (не только опубликованные) новости?"))
      return;
    try {
      await api.delete("/news");
      toast.success("Все новости удалены успешно!");
      setAllNews([]);
      setFilteredNews([]);
      handlePageChange(1, 0);
    } catch (error) {
      console.error("Ошибка при удалении всех новостей:", error);
      toast.error(error.message || "Ошибка при удалении всех новостей");
    }
  }, [handlePageChange]);

  const currentNews = useMemo(() => {
    const start = (pagination.currentPage - 1) * pagination.perPage;
    return filteredNews.slice(start, start + pagination.perPage);
  }, [filteredNews, pagination]);

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxSlides, setLightboxSlides] = useState([]);

  const openLightbox = useCallback((files, idx) => {
    if (!files?.length) return;
    setLightboxSlides(
      files.map((file) => ({
        src: `http://127.0.0.1:5000/uploads/${file.fileName}`,
        alt: file.fileName,
      }))
    );
    setLightboxIndex(idx);
    setLightboxOpen(true);
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false);
    setLightboxSlides([]);
    setLightboxIndex(0);
  }, []);

  return {
    allNews,
    filteredNews,
    currentNews,
    pagination,
    filters,
    handleFilterChange,
    clearFilters,
    archiveNews,
    deleteNews,
    deleteAllNews,
    openLightbox,
    closeLightbox,
    lightboxOpen,
    lightboxIndex,
    lightboxSlides,
    fetchNews,
    handlePageChange,
  };
};

export default useNewsList;
