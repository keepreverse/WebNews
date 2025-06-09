import { useState, useCallback, useEffect } from 'react';
import { api } from '../services/apiClient';
import { toast } from "react-toastify";
import usePagination from './usePagination';

const useCategoriesManagement = () => {
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

  const [categories, setCategories] = useState([]);
  const [filteredCategories, setFilteredCategories] = useState([]);
  const [filters, setFilters] = useState({ 
    search: '',
    dateRange: []
  });

  const fetchCategories = useCallback(async () => {
    try {
      const data = await api.get("/categories");
      const items = data || [];
      setCategories(items);

      setPagination(prev => ({
        ...prev,
        currentPage: 1,
        totalItems: items.length,
        totalPages: Math.ceil(items.length / prev.perPage),
      }));
    } catch (error) {
    }
  }, [setPagination]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);


  useEffect(() => {
    const filtered = categories.filter(cat => {
      const searchTerm = filters.search.toLowerCase();
      const matchesSearch = cat.name.toLowerCase().includes(searchTerm) || 
                          (cat.description && cat.description.toLowerCase().includes(searchTerm));
      
      const dateFrom = filters.dateRange[0] ? new Date(filters.dateRange[0]) : null;
      const dateTo = filters.dateRange[1] ? new Date(filters.dateRange[1]) : null;
      const catDate = new Date(cat.create_date || cat.createdAt);
      
      const matchesDate = (!dateFrom || catDate >= dateFrom) && 
                        (!dateTo || catDate <= dateTo);
      
      return matchesSearch && matchesDate;
    });
    
    setFilteredCategories(filtered);

    setPagination(prev => {
      const totalPages = Math.ceil(filtered.length / prev.perPage);
      return {
        ...prev,
        totalItems: filtered.length,
        totalPages,
        currentPage: prev.currentPage > totalPages ? totalPages : prev.currentPage
      };
    });
  }, [categories, filters, setPagination]);


  const createCategory = useCallback(async (name, description) => {
    try {
      await api.post('/categories', { name, description });
      await fetchCategories();
      setPagination(prev => ({
        ...prev,
        currentPage: 1
      }));
      toast.success('Категория создана');
    } catch (error) {
    }
  }, [fetchCategories, setPagination]);

  const handleFilterChange = useCallback((type, value) => {
    setFilters(prev => ({ ...prev, [type]: value }));
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  }, [setPagination]);

  const deleteCategory = useCallback(async (categoryId) => {
    try {
      await api.delete(`/categories?id=${categoryId}`);
      setCategories(prev => prev.filter(c => c.categoryID !== categoryId));

      setPagination(prev => ({
        ...prev,
        totalItems: prev.totalItems - 1
      }));
      toast.success('Категория удалена');
    } catch (error) {
      toast.error(error.message || 'Ошибка удаления категории');
    }
  }, [setPagination]);

  const deleteAllCategories = useCallback(async () => {
    if (!window.confirm("Вы уверены, что хотите удалить ВСЕ категории?")) return;

    try {
      await api.delete('/categories/all');
      setCategories([]);
      setFilteredCategories([]);
      toast.success('Все категории удалены');
    } catch (error) {
      toast.error(error.message || 'Ошибка удаления категорий');
    }
  }, []);

  const updateCategory = useCallback(async (categoryId, newData) => {
    try {
      await api.put(`/categories/${categoryId}`, newData);
      await fetchCategories();
      toast.success("Изменения сохранены");
    } catch (error) {
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
    deleteAllCategories,
    updateCategory
  };
};

export default useCategoriesManagement;