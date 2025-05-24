import React, { useEffect, useState } from "react";
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ToastContainer, toast } from "react-toastify";
import PageWrapper from "./PageWrapper";
import UsersManagement from "./components/Admin/UsersManagement/UsersManagement";
import NewsModeration from "./components/Admin/NewsModeration/NewsModeration";
import useUsersManagement from "./hooks/useUsersManagement";
import useNewsModeration from "./hooks/useNewsModeration";
import { initAuthToken } from './apiClient';
import "react-toastify/dist/ReactToastify.css";

function AdminPanel() {
  const [activeTab, setActiveTab] = useState('news');
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  
  const {
    users,
    uniqueRoles,
    pagination,
    showPasswords,
    editingUser,
    setEditingUser,
    handleDeleteUser,
    handleDeleteAllUsers,
    updateUser,
    toggleAllPasswords,
    usersWithRealPasswords,
    filters: usersFilters,
    handleFilterChange: handleUsersFilterChange,
    clearFilters: clearUsersFilters,
    fetchUsers,
    onPageChange: handleUsersPageChange
  } = useUsersManagement();

  const {
    allNews,
    pendingNews,
    pagination: newsPagination,
    handleModerate,
    handleArchive,
    filters: newsFilters,
    onFilterChange: handleNewsFilterChange,
    onClearFilters: clearNewsFilters,
    fetchPendingNews,
    onPageChange: handleNewsPageChange
  } = useNewsModeration();

  useEffect(() => {
    fetchUsers();
    fetchPendingNews();
  }, [fetchUsers, fetchPendingNews]);

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    } else {
      fetchPendingNews();
    }
  }, [activeTab, fetchUsers, fetchPendingNews]);

  useEffect(() => {
    initAuthToken();
    const userData = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || 'null');
    
    if (userData) {
      setCurrentUser(userData);
      
      if (!['Administrator', 'Moderator'].includes(userData.role)) {
        navigate('/');
      }
    } else {
      navigate('/login');
      setTimeout(() => toast.error("Требуется авторизация"), 200);
    }
  }, [navigate]);

  const enhancedHandleModerate = async (newsID, action) => {
    if (!currentUser?.id) {
      toast.error("Ошибка авторизации");
      return;
    }

    try {
      await handleModerate(newsID, action, currentUser.id);
    } catch (error) {
      toast.error(error.message || "Ошибка модерации");
    }
  };
  
  return (
    <PageWrapper>
      <Helmet>
        <title>Панель администратора</title>
      </Helmet>
      
      <div id="data-list-form" className="container">
        <h1>Панель администратора</h1>

        <div className="admin-tabs">
          <button 
            className={`tab-button ${activeTab === 'news' ? 'active' : ''}`}
            onClick={() => setActiveTab('news')}
          >
            Модерация новостей
          </button>
          <button 
            className={`tab-button ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            Управление пользователями
          </button>
        </div>
        
        {activeTab === 'users' ? (
          <UsersManagement
            users={users}
            uniqueRoles={uniqueRoles}
            pagination={pagination}
            editingUser={editingUser}
            setEditingUser={setEditingUser}
            handleDeleteUser={handleDeleteUser}
            handleDeleteAllUsers={handleDeleteAllUsers} // Добавьте эту строку
            updateUser={updateUser}
            showPasswords={showPasswords}
            toggleAllPasswords={toggleAllPasswords}
            usersWithRealPasswords={usersWithRealPasswords}
            filters={usersFilters}
            onFilterChange={handleUsersFilterChange}
            onClearFilters={clearUsersFilters}
            onPageChange={handleUsersPageChange}
          />
        ) : (
          <NewsModeration
            allNews={allNews}
            pendingNews={pendingNews}
            pagination={newsPagination}
            handleModerate={enhancedHandleModerate}
            handleArchive={handleArchive}
            filters={newsFilters}
            onFilterChange={handleNewsFilterChange}
            onClearFilters={clearNewsFilters}
            onPageChange={handleNewsPageChange}
          />
        )}
      </div>
      
      <ToastContainer />
    </PageWrapper>
  );
}

export default AdminPanel;