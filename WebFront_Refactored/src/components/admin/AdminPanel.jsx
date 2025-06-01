import React, { useEffect, useState } from "react";
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

import PageWrapper from "../../features/PageWrapper";

import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import UsersManagement from "./users/UsersManagement";
import useUsersManagement from "../../hooks/useUsersManagement";

import NewsModeration from "./news/NewsModeration";
import useNewsModeration from "../../hooks/useNewsModeration";

import CategoriesManagement from "./categories/CategoriesManagement";
import useCategoriesManagement from "../../hooks/useCategoriesManagement";

import TrashManagement from "./trash/TrashManagement";
import useTrashManagement from "../../hooks/useTrashManagement";



function AdminPanel() {
  const [activeTab, setActiveTab] = useState('news');
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  
  // Инициализация хуков с деструктуризацией
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

  const {
    deletedNews,
    pagination: trashPagination,
    restoreNews,
    purgeSingleNews,
    purgeTrash,
    fetchDeletedNews,
    handlePageChange: handleTrashPageChange
  } = useTrashManagement();

  // Унифицированный эффект загрузки данных
  useEffect(() => {
    const loadData = {
      'users': fetchUsers,
      'news': fetchPendingNews,
      'categories': fetchCategories,
      'trash': fetchDeletedNews,
    };

    if (loadData[activeTab]) {
      loadData[activeTab]();
    }
  }, [activeTab, fetchUsers, fetchPendingNews, fetchCategories, fetchDeletedNews]);

  // Проверка авторизации
  useEffect(() => {
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
            Модерация новостей ({allNews.length})
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
          <button 
            className={`tab-button ${activeTab === 'trash' ? 'active' : ''}`}
            onClick={() => setActiveTab('trash')}
          >
            Корзина ({deletedNews.length})
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

        {activeTab === 'trash' && (
          <TrashManagement
            deletedNews={deletedNews}
            pagination={trashPagination}
            restoreNews={restoreNews}
            purgeNews={purgeSingleNews}
            purgeAllNews={purgeTrash}
            handlePageChange={handleTrashPageChange}
          />
        )}
      </div>
      
      <ToastContainer />
    </PageWrapper>
  );
}

export default AdminPanel;