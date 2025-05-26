import React, { useEffect, useState } from "react";
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ToastContainer, toast } from "react-toastify";
import PageWrapper from "./PageWrapper";
import UsersManagement from "./components/Admin/UsersManagement/UsersManagement";
import NewsModeration from "./components/Admin/NewsModeration/NewsModeration";
import CategoriesManagement from "./components/Admin/CategoriesManagement/CategoriesManagement";
import useUsersManagement from "./hooks/useUsersManagement";
import useNewsModeration from "./hooks/useNewsModeration";
import useCategoriesManagement from "./hooks/useCategoriesManagement";
import { initAuthToken } from './apiClient';
import "react-toastify/dist/ReactToastify.css";

function AdminPanel() {
  const [activeTab, setActiveTab] = useState('news');
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  
  // Инициализация хуков с деструктуризацией
  const {
    users,
    uniqueRoles,
    pagination,
    showPasswords,
    editingUser,
    setEditingUser,
    deleteUser,
    deleteAllUsers,
    updateUser,
    toggleAllPasswords,
    usersWithRealPasswords,
    filters: usersFilters,
    handleFilterChange: handleUsersFilterChange,
    clearFilters: clearUsersFilters,
    fetchUsers,
    handlePageChange: handleUsersPageChange
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
    handlePageChange: handleNewsPageChange
  } = useNewsModeration();

  const {
    categories,
    pagination: categoriesPagination,
    filters: categoriesFilters,
    fetchCategories,
    handlePageChange: handleCategoriesPageChange,
    handleFilterChange: handleCategoriesFilterChange,
    createCategory,
    deleteCategory,
    deleteAllCategories,
    updateCategory
  } = useCategoriesManagement();

  // Унифицированный эффект загрузки данных
  useEffect(() => {
    const loadData = {
      'users': fetchUsers,
      'news': fetchPendingNews,
      'categories': fetchCategories,
    };

    if (loadData[activeTab]) {
      loadData[activeTab]();
    }
  }, [activeTab, fetchUsers, fetchPendingNews, fetchCategories]);

  // Проверка авторизации
  useEffect(() => {
    initAuthToken();
    const userData = JSON.parse(
      localStorage.getItem('user') || 
      sessionStorage.getItem('user') || 
      'null'
    );
    
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

  // Обработчик модерации
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
            Пользователи
          </button>
          <button 
            className={`tab-button ${activeTab === 'categories' ? 'active' : ''}`}
            onClick={() => setActiveTab('categories')}
          >
            Категории
          </button>
        </div>
        
        {activeTab === 'users' && (
          <UsersManagement
            users={users}
            uniqueRoles={uniqueRoles}
            pagination={pagination}
            editingUser={editingUser}
            setEditingUser={setEditingUser}
            deleteUser={deleteUser}
            deleteAllUsers={deleteAllUsers}
            updateUser={updateUser}
            showPasswords={showPasswords}
            toggleAllPasswords={toggleAllPasswords}
            usersWithRealPasswords={usersWithRealPasswords}
            filters={usersFilters}
            handleFilterChange={handleUsersFilterChange}
            onClearFilters={clearUsersFilters}
            handlePageChange={handleUsersPageChange}
          />
        )}

        {activeTab === 'news' && (
          <NewsModeration
            allNews={allNews}
            pendingNews={pendingNews}
            pagination={newsPagination}
            handleModerate={enhancedHandleModerate}
            handleArchive={handleArchive}
            filters={newsFilters}
            onFilterChange={handleNewsFilterChange}
            onClearFilters={clearNewsFilters}
            handlePageChange={handleNewsPageChange}
          />
        )}

        {activeTab === 'categories' && (
          <CategoriesManagement
            categories={categories}
            pagination={categoriesPagination}
            filters={categoriesFilters}
            handlePageChange={handleCategoriesPageChange}
            handleFilterChange={handleCategoriesFilterChange}
            createCategory={createCategory}
            deleteCategory={deleteCategory}
            deleteAllCategories={deleteAllCategories}
            updateCategory={updateCategory}
          />
        )}
      </div>
      
      <ToastContainer />
    </PageWrapper>
  );
}

export default AdminPanel;