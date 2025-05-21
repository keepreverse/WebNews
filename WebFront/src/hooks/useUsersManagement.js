import { useState, useCallback, useEffect } from 'react';
import { api } from '../apiClient';
import { toast } from "react-toastify";

const useUsersManagement = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [showPasswords, setShowPasswords] = useState(false);
  const [usersWithRealPasswords, setUsersWithRealPasswords] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 10;

  // Фильтры
  const [roleFilter, setRoleFilter] = useState('');
  const [dateRange, setDateRange] = useState([null, null]);

  // Загрузка пользователей
  const fetchUsers = useCallback(async () => {
    try {
      const { data } = await api.get("/api/admin/users");
      setUsers(data);
      setFilteredUsers(data);
    } catch (error) {
      console.error("Ошибка загрузки пользователей:", error);
      throw error;
    }
  }, []);

  // Загрузка реальных паролей
  const fetchRealPasswords = useCallback(async () => {
    try {
      const { data } = await api.get("/api/admin/users/real_passwords");
      return data;
    } catch (error) {
      console.error("Ошибка загрузки паролей:", error);
      return [];
    }
  }, []);

  // Переключение отображения паролей
  const toggleAllPasswords = useCallback(async () => {
    if (!showPasswords && usersWithRealPasswords.length === 0) {
      const passwords = await fetchRealPasswords();
      setUsersWithRealPasswords(passwords);
    }
    setShowPasswords(prev => !prev);
  }, [fetchRealPasswords, showPasswords, usersWithRealPasswords.length]);

  // Фильтрация пользователей
  useEffect(() => {
    let filtered = [...users];

    if (roleFilter) {
      filtered = filtered.filter(user => user.user_role === roleFilter);
    }

    if (dateRange[0] && dateRange[1]) {
      filtered = filtered.filter(user => {
        const regDate = new Date(user.registration_date);
        return regDate >= dateRange[0] && regDate <= dateRange[1];
      });
    }

    setFilteredUsers(filtered);
    setCurrentPage(1);
  }, [users, roleFilter, dateRange]);

  const handleDeleteUser = useCallback(async userId => {
    try {
      await api.delete(`/api/admin/users/${userId}`);
      toast.success("Пользователь успешно удален");
      await fetchUsers();
      return true;
    } catch (error) {
      console.error("Ошибка удаления:", error);
      toast.error(error.message || "Не удалось удалить пользователя");
      return false;
    }
  }, [fetchUsers]);

  const updateUser = useCallback(async (userId, newData) => {
    try {
      await api.put(`/api/admin/users/${userId}`, newData);
      toast.success("Данные пользователя обновлены");
      await fetchUsers();
      return true;
    } catch (error) {
      console.error("Ошибка обновления:", error);
      toast.error(error.message || "Не удалось обновить данные");
      return false;
    }
  }, [fetchUsers]);

  return {
    // Состояния
    users: filteredUsers,
    uniqueRoles: [...new Set(users.map(u => u.user_role))],
    currentPage,
    usersPerPage,
    usersTotalPages: Math.ceil(filteredUsers.length / usersPerPage),
    showPasswords,
    editingUser,
    usersWithRealPasswords,

    // Фильтры
    filters: {
      role: roleFilter,
      dateRange
    },

    // Методы
    setCurrentPage,
    setEditingUser,
    handleDeleteUser,
    updateUser,
    toggleAllPasswords,
    handleFilterChange: (type, value) => {
      if (type === 'role') setRoleFilter(value);
      if (type === 'dateRange') setDateRange(value);
    },
    clearFilters: () => {
      setRoleFilter('');
      setDateRange([null, null]);
      setShowPasswords(false);
    },
    fetchUsers
  };
};

export default useUsersManagement;