import { useState, useCallback, useEffect } from 'react';
import { api } from '../apiClient';
import { toast } from "react-toastify";
import usePagination from './usePagination';

const useCategoriesManagement = () => {
  const { 
    pagination,
    handlePageChange,
    handleDeleteAdjustment,
    setPagination
  } = usePagination({ 
    page: 1, 
    perPage: 10,
    totalItems: 0,
    totalPages: 1
  });

  const [categories, setCategories] = useState([]);
  const [filteredCategories, setFilteredCategories] = useState([]);
  const [filters, setFilters] = useState({ 
    search: '',
    dateRange: []
  });

  const fetchCategories = useCallback(async () => {
    try {
      const data = await api.get('/api/categories');
      setCategories(data);
      setFilteredCategories(data);
      setPagination(prev => ({
        ...prev,
        totalItems: data.length,
        totalPages: Math.ceil(data.length / prev.perPage)
      }));
    } catch (error) {
      toast.error('Ошибка загрузки категорий');
    }
  }, [setPagination]);

  useEffect(() => {
    fetchCategories(); // Добавляем первоначальную загрузку
  }, [fetchCategories]); // Пустой массив зависимостей для однократного вызова

  useEffect(() => {
    const filtered = categories.filter(cat => {
      // Добавляем поиск по описанию
      const searchTerm = filters.search.toLowerCase();
      const matchesSearch = cat.name.toLowerCase().includes(searchTerm) || 
                          (cat.description && cat.description.toLowerCase().includes(searchTerm));
      
      const dateFrom = filters.dateRange[0] ? new Date(filters.dateRange[0]) : null;
      const dateTo = filters.dateRange[1] ? new Date(filters.dateRange[1]) : null;
      const catDate = new Date(cat.createdAt);
      
      const matchesDate = (!dateFrom || catDate >= dateFrom) && 
                        (!dateTo || catDate <= dateTo);
      
      return matchesSearch && matchesDate;
    });
    
    setFilteredCategories(filtered);
    setPagination(prev => ({
      ...prev,
      totalItems: filtered.length,
      totalPages: Math.ceil(filtered.length / prev.perPage)
    }));
  }, [categories, filters, setPagination]);

  // Обновим функцию создания категории
  const createCategory = useCallback(async (name, description) => {
    try {
      await api.post('/api/categories', { name, description });
      await fetchCategories();
      toast.success('Категория создана');
    } catch (error) {
      toast.error(error.message || 'Ошибка создания категории');
    }
  }, [fetchCategories]);

  const handleFilterChange = useCallback((type, value) => {
    setFilters(prev => ({ ...prev, [type]: value }));
  }, []);

  const deleteCategory = useCallback(async (categoryId) => {
    try {
      await api.delete(`/api/categories?id=${categoryId}`);
      setCategories(prev => prev.filter(c => c.categoryID !== categoryId));
      handleDeleteAdjustment(filteredCategories.length - 1);
      toast.success('Категория удалена');
    } catch (error) {
      toast.error(error.message || 'Ошибка удаления категории');
    }
  }, [filteredCategories.length, handleDeleteAdjustment]);

  const updateCategory = useCallback(async (categoryId, newData) => {
    try {
      await api.put(`/api/categories/${categoryId}`, newData);
      await fetchCategories();
      toast.success("Изменения сохранены");
    } catch (error) {
      toast.error(error.message || "Ошибка обновления");
    }
  }, [fetchCategories]);

  return {
    categories: filteredCategories,
    pagination,
    filters,
    fetchCategories,
    handlePageChange,
    handleFilterChange,
    createCategory,
    deleteCategory,
    handleDeleteAllCategories: deleteCategory,
    updateCategory
  };
};

export default useCategoriesManagement;