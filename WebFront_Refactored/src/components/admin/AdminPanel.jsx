// src/components/admin/AdminPanel.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { isAdmin, isModerator } from "../../services/authHelpers";

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

  // —————— News Moderation ——————
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

  // —————— Users Management ——————
  const {
    users,
    uniqueRoles,
    pagination: usersPagination,
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

  // —————— Categories Management ——————
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

  // —————— Trash Management ——————
  const {
    allTrash,
    trash,                // отфильтрованный массив
    pagination: trashPagination,
    filters: trashFilters,
    fetchDeletedNews,
    handlePageChange: handleTrashPageChange,
    handleFilterChange: handleTrashFilterChange,
    restoreNews,
    restoreEditNews,
    purgeSingleNews,
    purgeTrash,
  } = useTrashManagement();

  // —————— Унифицированная загрузка при переключении табов ——————
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

  // —————— Проверка авторизации ——————
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


  return (
    <PageWrapper>
      <Helmet>
        <title>
          {isModerator(currentUser) ? "Панель модератора" : "Панель администратора"}
        </title>
      </Helmet>

      <div id="data-list-form" className="container">

        <h1>
          {isModerator(currentUser) ? "Панель модератора" : "Панель администратора"}
        </h1>

        <div className="admin-tabs">
          <button
            className={`tab-button ${activeTab === 'news' ? 'active' : ''}`}
            onClick={() => setActiveTab('news')}
          >
            Новости ({allNews.length})
          </button>
          {isAdmin(currentUser) && (
            <button
              className={`tab-button ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => setActiveTab('users')}
            >
              Пользователи
            </button>
          )}
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
            Корзина ({allTrash.length})
          </button>
        </div>

        {activeTab === 'users' && isAdmin(currentUser) && (
          <UsersManagement
            users={users}
            uniqueRoles={uniqueRoles}
            pagination={usersPagination}
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
            handleModerate={handleModerate}
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
            trash={trash} 
            allTrash={allTrash}
            pagination={trashPagination}
            filters={trashFilters}
            handleFilterChange={handleTrashFilterChange}
            handlePageChange={handleTrashPageChange}
            restoreNews={restoreNews}
            restoreEditNews={restoreEditNews}
            purgeSingleNews={purgeSingleNews}
            purgeTrash={purgeTrash}
          />
        )}
      </div>

      <ToastContainer />
    </PageWrapper>
  );
}

export default AdminPanel;
