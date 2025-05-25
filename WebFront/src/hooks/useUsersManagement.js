import { useState, useCallback, useEffect, useRef } from 'react';
import { api } from '../apiClient';
import { toast } from "react-toastify";
import usePagination from './usePagination';

const useUsersManagement = () => {
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

  const [users, setUsers] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('cachedUsers')) || [];
    } catch {
      return [];
    }
  });

  const [filteredUsers, setFilteredUsers] = useState([]);
  const [showPasswords, setShowPasswords] = useState(false);
  const [usersWithRealPasswords, setUsersWithRealPasswords] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [roleFilter, setRoleFilter] = useState('');
  const [dateRange, setDateRange] = useState([null, null]);

  const isFilterChange = useRef(false);
  const prevFilters = useRef({ 
    role: roleFilter, 
    dateRange: JSON.stringify(dateRange) 
  });

  useEffect(() => {
    if (roleFilter && !users.some(u => u.user_role === roleFilter)) {
      setRoleFilter('');
      isFilterChange.current = true;
    }
  }, [users, roleFilter]);

  // Загрузка пользователей
  const fetchUsers = useCallback(async () => {
    try {
      const data = await api.get("/api/admin/users");
      setUsers(data || []);
      localStorage.setItem('cachedUsers', JSON.stringify(data));
      
      setPagination(prev => ({
        ...prev,
        totalItems: data.length,
        totalPages: Math.ceil(data.length / prev.perPage)
      }));
      
    } catch (error) {
      toast.error(error.message || "Ошибка загрузки пользователей");
    }
  }, [setPagination]);

  // Фильтрация
  useEffect(() => {
    const filtered = users.filter(user => {
      const matchesRole = !roleFilter || user.user_role === roleFilter;
      const dateFrom = dateRange[0] ? new Date(dateRange[0]) : null;
      const dateTo = dateRange[1] ? new Date(dateRange[1]) : null;
      const regDate = new Date(user.registration_date);

      const matchesDate = !dateFrom || !dateTo || 
        (regDate >= dateFrom && regDate <= dateTo);

      return matchesRole && matchesDate;
    });

    setFilteredUsers(filtered);

    setPagination(prev => ({
      ...prev,
      totalItems: filtered.length,
      totalPages: Math.ceil(filtered.length / prev.perPage)
    }));

    if (isFilterChange.current) {
      handlePageChange(1, filtered.length);
      isFilterChange.current = false;
    }
  }, [dateRange, handlePageChange, roleFilter, setPagination, users]);

  // Обработчик фильтров
  const handleFilterChange = useCallback((type, value) => {
    const isRoleChanged = type === 'role' && value !== prevFilters.current.role;
    const isDateChanged = type === 'dateRange' && 
      JSON.stringify(value) !== prevFilters.current.dateRange;

    if (isRoleChanged || isDateChanged) {
      isFilterChange.current = true;
      prevFilters.current = {
        role: type === 'role' ? value : prevFilters.current.role,
        dateRange: type === 'dateRange' ? JSON.stringify(value) : prevFilters.current.dateRange
      };
    }

    if (type === 'role') setRoleFilter(value);
    if (type === 'dateRange') setDateRange(value);
  }, []);

  // Удаление пользователя
  const handleDeleteUser = useCallback(async userId => {
    try {
      await api.delete(`/api/admin/users/${userId}`);
      const updatedUsers = users.filter(u => u.userID !== userId);
      setUsers(updatedUsers);
      
      // Корректировка пагинации без сброса страницы
      handleDeleteAdjustment(updatedUsers.length);
      toast.success("Пользователь удалён");
    } catch (error) {
      toast.error(error.message || "Ошибка удаления");
    }
  }, [users, handleDeleteAdjustment]);

  const handleDeleteAllUsers = useCallback(async () => {
      if (!window.confirm("Вы уверены, что хотите удалить ВСЕХ пользователей, кроме текущего и первого администратора?")) return;
      
      try {
          await api.delete("/api/admin/users/all");
          await fetchUsers();
          toast.success("Пользователи удалены успешно");
      } catch (error) {
          toast.error(error.message || "Ошибка удаления пользователей");
      }
  }, [fetchUsers]);

  // Остальные методы без изменений
  const fetchRealPasswords = useCallback(async () => {
    try {
      return await api.get("/api/admin/users/real_passwords") || [];
    } catch (error) {
      toast.error("Ошибка загрузки паролей");
      return [];
    }
  }, []);

  const toggleAllPasswords = useCallback(async () => {
    if (!showPasswords && usersWithRealPasswords.length === 0) {
      const passwords = await fetchRealPasswords();
      setUsersWithRealPasswords(passwords);
    }
    setShowPasswords(prev => !prev);
  }, [showPasswords, usersWithRealPasswords.length, fetchRealPasswords]);

  const updateUser = useCallback(async (userId, newData) => {
    try {
      await api.put(`/api/admin/users/${userId}`, newData);
      setEditingUser(null);
      await fetchUsers();
      toast.success("Изменения сохранены");
    } catch (error) {
      toast.error(error.message || "Ошибка обновления");
    }
  }, [fetchUsers]);

  
  return {
    users: filteredUsers,
    uniqueRoles: [...new Set(users.map(u => u.user_role))],
    pagination,
    showPasswords,
    editingUser,
    usersWithRealPasswords,
    filters: { role: roleFilter, dateRange },
    handlePageChange,
    setEditingUser,
    handleDeleteUser,
    handleDeleteAllUsers,
    updateUser,
    toggleAllPasswords,
    handleFilterChange,
    clearFilters: () => {
      setRoleFilter('');
      setDateRange([null, null]);
      setShowPasswords(false);
      isFilterChange.current = true;
    },
    fetchUsers
  };
};

export default useUsersManagement;