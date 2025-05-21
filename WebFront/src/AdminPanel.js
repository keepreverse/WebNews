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
    currentPage,
    usersPerPage,
    usersTotalPages,
    showPasswords,
    editingUser,
    setCurrentPage,
    setEditingUser,
    handleDeleteUser,
    updateUser,
    toggleAllPasswords,
    usersWithRealPasswords,
    filters: usersFilters,
    handleFilterChange: handleUsersFilterChange,
    clearFilters: clearUsersFilters,
    fetchUsers  // Добавлен fetchUsers из хука
  } = useUsersManagement();

  const {
    pendingNews,
    newsCurrentPage,
    newsPerPage,
    newsTotalPages,
    setNewsCurrentPage,
    handleModerate,
    handleArchive,
    filters: newsFilters,
    handleFilterChange: handleNewsFilterChange,
    clearFilters: clearNewsFilters,
    fetchPendingNews  // Добавлен fetchPendingNews из хука
  } = useNewsModeration();

  // Загрузка данных при смене вкладки
  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    } else {
      fetchPendingNews();
    }
  }, [activeTab, fetchUsers, fetchPendingNews]);

  // Проверка авторизации
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
      const updatedNews = await fetchPendingNews();
      
      if (updatedNews.length > 0) {
        const maxPage = Math.ceil(updatedNews.length / newsPerPage);
        setNewsCurrentPage(prev => Math.min(prev, maxPage));
      } else {
        setNewsCurrentPage(1);
      }
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
            currentPage={currentPage}
            usersPerPage={usersPerPage}
            usersTotalPages={usersTotalPages}
            setCurrentPage={setCurrentPage}
            editingUser={editingUser}
            setEditingUser={setEditingUser}
            handleDeleteUser={handleDeleteUser}
            updateUser={updateUser}
            showPasswords={showPasswords}
            toggleAllPasswords={toggleAllPasswords}
            usersWithRealPasswords={usersWithRealPasswords}
            filters={usersFilters}
            onFilterChange={handleUsersFilterChange}
            onClearFilters={clearUsersFilters}
          />
        ) : (
          <NewsModeration
            pendingNews={pendingNews}
            currentPage={newsCurrentPage}
            newsPerPage={newsPerPage}
            newsTotalPages={newsTotalPages}
            setCurrentPage={setNewsCurrentPage}
            handleModerate={enhancedHandleModerate}
            handleArchive={handleArchive}
            filters={newsFilters}
            onFilterChange={handleNewsFilterChange}
            onClearFilters={clearNewsFilters}
          />
        )}
      </div>
      
      <ToastContainer />
    </PageWrapper>
  );
}

export default AdminPanel;