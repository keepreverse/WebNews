import { useState, useCallback, useEffect } from 'react';
import { api } from '../services/apiClient';
import { toast } from "react-toastify";
import usePagination from './usePagination';

const useUsersManagement = () => {
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

  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [filters, setFilters] = useState({
    role: '',
    dateRange: [],
  });

  const [showPasswords, setShowPasswords] = useState(false);
  const [usersWithRealPasswords, setUsersWithRealPasswords] = useState([]);
  const [editingUser, setEditingUser] = useState(null);

  const fetchUsers = useCallback(async () => {
    try {
      const data = await api.get("/admin/users");
      setUsers(data || []);
      
      setPagination(prev => ({
        ...prev,
        currentPage: 1,
        totalItems: data.length,
        totalPages: Math.ceil(data.length / prev.perPage)
      }));
    } catch (error) {
    }   
  }, [setPagination]);

  useEffect(() => {
    const filtered = users.filter(user => {
      const matchesRole = !filters.role || user.user_role === filters.role;
	  
      const dateFrom = filters.dateRange[0] ? new Date(filters.dateRange[0]) : null;
      const dateTo = filters.dateRange[1] ? new Date(filters.dateRange[1]) : null;
      const regDate = new Date(user.registration_date);

      const matchesDate = (!dateFrom || regDate >= dateFrom) && 
                        (!dateTo || regDate <= dateTo);

      return matchesRole && matchesDate;
    });

    setFilteredUsers(filtered);
    
    setPagination(prev => ({
      ...prev,
      totalItems: filtered.length,
      totalPages: Math.ceil(filtered.length / prev.perPage),
      currentPage: prev.currentPage > Math.ceil(filtered.length / prev.perPage) 
        ? Math.ceil(filtered.length / prev.perPage) 
        : prev.currentPage
    }));
  }, [users, filters, setPagination]);

  const handleFilterChange = useCallback((type, value) => {
    setFilters(prev => ({ ...prev, [type]: value }));
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  }, [setPagination]);

  const deleteUser = useCallback(async userId => {
    try {
      await api.delete(`/admin/users/${userId}`);
      setUsers(prev => prev.filter(u => u.userID !== userId));
      toast.success("Пользователь удалён");
    } catch (error) {
    }
  }, []);

  const deleteAllUsers = useCallback(async () => {
    if (!window.confirm("Вы уверены, что хотите удалить ВСЕХ пользователей?")) return;
    
    try {
      const response = await api.delete("/admin/users/all");
      
      setUsers(response.remainingUsers || []);
      
      setFilters({
        role: '',
        dateRange: [],
      });

      setPagination(prev => ({
        ...prev,
        currentPage: 1,
        totalItems: response.remainingUsers.length,
        totalPages: Math.ceil(response.remainingUsers.length / prev.perPage)
      }));
      
      toast.success(`Удалено ${response.deletedCount} пользователей`);
    } catch (error) {
    }
  }, [setPagination]);

  const fetchRealPasswords = useCallback(async () => {
    try {
      const passwords = await api.get("/admin/users/real_passwords");
      setUsersWithRealPasswords(passwords || []);
    } catch (error) {
      toast.error("Ошибка загрузки паролей");
    }
  }, []);

  const toggleAllPasswords = useCallback(async () => {
    if (!showPasswords && usersWithRealPasswords.length === 0) {
      await fetchRealPasswords();
    }
    setShowPasswords(prev => !prev);
  }, [showPasswords, usersWithRealPasswords.length, fetchRealPasswords]);

  const updateUser = useCallback(async (userId, newData) => {
    try {
      await api.put(`/admin/users/${userId}`, newData);
      await fetchUsers();
      setEditingUser(null);
      toast.success("Изменения сохранены");
    } catch (error) {
    }
  }, [fetchUsers]);

  return {
    users: filteredUsers,
    uniqueRoles: [...new Set(users.map(u => u.user_role))],
    pagination,
    filters,
    showPasswords,
    editingUser,
    usersWithRealPasswords,
    setEditingUser,
    fetchUsers,
    handlePageChange,
    handleFilterChange,
    deleteUser,
    deleteAllUsers,
    updateUser,
    toggleAllPasswords,
    clearFilters: () => {
      setFilters({
        role: '',
        dateRange: [],
      });
      setShowPasswords(false);
      setPagination(prev => ({ ...prev, currentPage: 1 }));
    }
  };
};

export default useUsersManagement;