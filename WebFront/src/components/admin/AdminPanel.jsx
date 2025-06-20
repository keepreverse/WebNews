import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { isAdmin, isModerator } from '../../services/authHelpers';
import { api } from '../../services/apiClient';
import PageWrapper from '../../features/PageWrapper';
import { ToastContainer, toast } from 'react-toastify';

import useAdminCounts from '../../hooks/useAdminCounts';
import useNewsModeration from '../../hooks/useNewsModeration';
import useUsersManagement from '../../hooks/useUsersManagement';
import useCategoriesManagement from '../../hooks/useCategoriesManagement';
import useTrashManagement from '../../hooks/useTrashManagement';
import useArchiveManagement from '../../hooks/useArchiveManagement';

import UsersManagement from './users/UsersManagement';
import NewsModeration from './news/NewsModeration';
import CategoriesManagement from './categories/CategoriesManagement';
import TrashManagement from './trash/TrashManagement';
import ArchiveManagement from './archive/ArchiveManagement';

function AdminPanel() {
  const [activeTab, setActiveTab] = useState('news');
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);

  const [newsRefreshCounter, setNewsRefreshCounter] = useState(0);
  const [usersRefreshCounter, setUsersRefreshCounter] = useState(0);
  const [trashRefreshCounter, setTrashRefreshCounter] = useState(0);
  const [archiveRefreshCounter, setArchiveRefreshCounter] = useState(0);

  // Ссылки на DOM-элементы спиннеров
  const newsRefreshRef = useRef(null);
  const usersRefreshRef = useRef(null);
  const trashRefreshRef = useRef(null);
  const archiveRefreshRef = useRef(null);

  // Хук для получения счётчиков (Pending, Users, Trash, Archive)
  const { pendingNewsCount, usersCount, trashCount, archiveCount, refreshCounts } = useAdminCounts(20000);

  // Проверка доступности сервера при монтировании
  useEffect(() => {
    api.ping().then((alive) => {
      if (!alive) {
        toast.error("Сервер не отвечает! Пожалуйста, попробуйте позже");
      }
    });
  }, []);

  // --------------------------------------------------------------------------
  // Обёртки для действий над новостью + автоматическое обновление счётчиков
  // --------------------------------------------------------------------------

  const handleModerateAndRefresh = async (newsID, action, moderatorId) => {
    await handleModerate(newsID, action, moderatorId);
    refreshCounts();
    setNewsRefreshCounter((c) => c + 1);
  };

  const handleArchiveAndRefresh = async (newsID) => {
    await handleArchive(newsID);
    refreshCounts();
    setNewsRefreshCounter((c) => c + 1);
  };


  const deleteUserAndRefresh = async (newsID) => {
    await deleteUser(newsID);
    refreshCounts();
    setUsersRefreshCounter((c) => c + 1);
  };

  const deleteAllUsersAndRefresh = async (newsID) => {
    await deleteAllUsers(newsID);
    refreshCounts();
    setUsersRefreshCounter((c) => c + 1);
  };

  const restoreNewsAndRefresh = async (newsID) => {
    await restoreNews(newsID);
    refreshCounts();
    setTrashRefreshCounter((c) => c + 1);
  };

  const restoreEditNewsAndRefresh = async (newsID) => {
    await restoreEditNews(newsID);
    refreshCounts();
    setTrashRefreshCounter((c) => c + 1);
  };

  const purgeSingleNewsAndRefresh = async (newsID) => {
    await purgeSingleNews(newsID);
    refreshCounts();
    setTrashRefreshCounter((c) => c + 1);
  };

  const purgeTrashAndRefresh = async (newsID) => {
    await purgeTrash(newsID);
    refreshCounts();
    setTrashRefreshCounter((c) => c + 1);
  };

  const restoreArchiveNewsAndRefresh = async (newsID) => {
    await restoreArchiveNews(newsID);
    refreshCounts();
    setArchiveRefreshCounter((c) => c + 1);
  };

  const restoreEditArchiveNewsAndRefresh = async (newsID) => {
    await restoreEditArchiveNews(newsID);
    refreshCounts();
    setArchiveRefreshCounter((c) => c + 1);
  };

  const deleteArchiveNewsAndRefresh = async (newsID) => {
    await deleteArchiveNews(newsID);
    refreshCounts();
    setArchiveRefreshCounter((c) => c + 1);
  };

  const deleteArchiveAndRefresh = async (newsID) => {
    await deleteArchive(newsID);
    refreshCounts();
    setArchiveRefreshCounter((c) => c + 1);
  };

  // --------------------------------------------------------------------------
  // Получение данных из кастомных хуков (NewsModeration, Trash, Archive и т.д.)
  // --------------------------------------------------------------------------

  const {
    allNews,
    pendingNews,
    pagination: newsPagination,
    handleModerate,
    handleArchive,
    filters: newsFilters,
    onFilterChange: handleNewsFilterChange,
    onClearFilters: clearNewsFilters,
    handlePageChange: handleNewsPageChange
  } = useNewsModeration({
    isActiveTab: activeTab === 'news',
    onExternalRefresh: newsRefreshCounter,
  });

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
    handlePageChange: handleUsersPageChange,
  } = useUsersManagement({
    isActiveTab: activeTab === 'users',
    onExternalRefresh: usersRefreshCounter,
  });

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
    updateCategory,
  } = useCategoriesManagement();

  const {
    allTrash,
    trash,
    pagination: trashPagination,
    filters: trashFilters,
    handlePageChange: handleTrashPageChange,
    handleFilterChange: handleTrashFilterChange,
    restoreNews,
    restoreEditNews,
    purgeSingleNews,
    purgeTrash,
  } = useTrashManagement({
    isActiveTab: activeTab === 'trash',
    onExternalRefresh: trashRefreshCounter,
  });

  const {
    allArchive,
    archive,
    pagination: archivePagination,
    filters: archiveFilters,
    onFilterChange: handleArchiveFilterChange,
    onClearFilters: clearArchiveFilters,
    restoreNews: restoreArchiveNews,
    restoreEditNews: restoreEditArchiveNews,
    deleteArchiveNews,
    deleteArchive,
    handlePageChange: handleArchivePageChange
  } = useArchiveManagement({
    isActiveTab: activeTab === 'archive',
    onExternalRefresh: archiveRefreshCounter,
  });

  // При смене вкладки: если это одна из трёх — news, trash или archive — сразу обновляем счётчики.
  // Для вкладок users/categories вызываем fetchUsers/fetchCategories.
  useEffect(() => {
    if (activeTab === 'news' || activeTab === 'trash' || activeTab === 'archive') {
      refreshCounts();
      return;
    }
    const loadData = {
      users: fetchUsers,
      categories: fetchCategories,
    };
    if (loadData[activeTab]) {
      loadData[activeTab]();
    }
  }, [activeTab, fetchUsers, fetchCategories, refreshCounts]);

  // Проверка прав и редирект при отсутствии авторизации
  useEffect(() => {
    const userData = JSON.parse(
      localStorage.getItem('user') ||
        sessionStorage.getItem('user') ||
        'null'
    );
    if (!userData) {
      navigate('/login');
      return;
    }
    setCurrentUser(userData);
    if (!(isModerator(userData) || isAdmin(userData))) {
      navigate('/');
    }
  }, [navigate]);

  // --------------------------------------------------------------------------
  // Обработчики для кнопок «Обновить» на каждой вкладке (с запуском спиннера)
  // --------------------------------------------------------------------------

  const handleNewsRefreshClick = useCallback(() => {
    // Запускаем обновление данных
    refreshCounts();
    setNewsRefreshCounter((c) => c + 1);
    // Триггерим анимацию спиннера
    if (newsRefreshRef.current) {
      newsRefreshRef.current.classList.remove('spin');
      void newsRefreshRef.current.offsetWidth;
      newsRefreshRef.current.classList.add('spin');
    }
  }, [refreshCounts]);

  const handleUsersRefreshClick = useCallback(() => {
    // Запускаем обновление данных
    refreshCounts();
    setUsersRefreshCounter((c) => c + 1);
    // Триггерим анимацию спиннера
    if (usersRefreshRef.current) {
      usersRefreshRef.current.classList.remove('spin');
      void usersRefreshRef.current.offsetWidth;
      usersRefreshRef.current.classList.add('spin');
    }
  }, [refreshCounts]);

  const handleTrashRefreshClick = useCallback(() => {
    refreshCounts();
    setTrashRefreshCounter((c) => c + 1);
    if (trashRefreshRef.current) {
      trashRefreshRef.current.classList.remove('spin');
      void trashRefreshRef.current.offsetWidth;
      trashRefreshRef.current.classList.add('spin');
    }
  }, [refreshCounts]);

  const handleArchiveRefreshClick = useCallback(() => {
    refreshCounts();
    setArchiveRefreshCounter((c) => c + 1);
    if (archiveRefreshRef.current) {
      archiveRefreshRef.current.classList.remove('spin');
      void archiveRefreshRef.current.offsetWidth;
      archiveRefreshRef.current.classList.add('spin');
    }
  }, [refreshCounts]);

  return (
    <PageWrapper>
      <Helmet>
        <title>
          {isModerator(currentUser)
            ? 'Панель модератора'
            : 'Панель администратора'}
        </title>
      </Helmet>

      <div id="data-list-form" className="container">
        <h1>
          {isModerator(currentUser)
            ? 'Панель модератора'
            : 'Панель администратора'}
        </h1>

        <div className="admin-tabs">
          <button
            className={`tab-button ${activeTab === 'news' ? 'active' : ''}`}
            onClick={() => setActiveTab('news')}
          >
            Новости ({pendingNewsCount})
          </button>

          {isAdmin(currentUser) && (
            <button
              className={`tab-button ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => setActiveTab('users')}
            >
              Пользователи ({usersCount})
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
            Корзина ({trashCount})
          </button>

          <button
            className={`tab-button ${activeTab === 'archive' ? 'active' : ''}`}
            onClick={() => setActiveTab('archive')}
          >
            Архив ({archiveCount})
          </button>
        </div>

        {activeTab === 'users' && isAdmin(currentUser) && (
          <>
            <div className="refresh-container">
              <span
                ref={usersRefreshRef}
                className="refresh-spinner"
                onClick={handleUsersRefreshClick}
                title="Обновить список"
                onAnimationEnd={(e) => {
                  e.currentTarget.classList.remove('spin');
                }}
              >
                ⟳
              </span>
            </div>
            <UsersManagement
              users={users}
              uniqueRoles={uniqueRoles}
              pagination={usersPagination}
              editingUser={editingUser}
              setEditingUser={setEditingUser}
              deleteUser={deleteUserAndRefresh}
              deleteAllUsers={deleteAllUsersAndRefresh}
              updateUser={updateUser}
              showPasswords={showPasswords}
              toggleAllPasswords={toggleAllPasswords}
              usersWithRealPasswords={usersWithRealPasswords}
              filters={usersFilters}
              handleFilterChange={handleUsersFilterChange}
              onClearFilters={clearUsersFilters}
              handlePageChange={handleUsersPageChange}
            />
          </>
        )}

        {activeTab === 'news' && (
          <>
            <div className="refresh-container">
              <span
                ref={newsRefreshRef}
                className="refresh-spinner"
                onClick={handleNewsRefreshClick}
                title="Обновить список"
                onAnimationEnd={(e) => {
                  e.currentTarget.classList.remove('spin');
                }}
              >
                ⟳
              </span>
            </div>
            <NewsModeration
              allNews={allNews}
              pendingNews={pendingNews}
              pagination={newsPagination}
              handleModerate={handleModerateAndRefresh}
              handleArchive={handleArchiveAndRefresh}
              filters={newsFilters}
              onFilterChange={handleNewsFilterChange}
              onClearFilters={clearNewsFilters}
              handlePageChange={handleNewsPageChange}
            />
          </>
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
          <>
            <div className="refresh-container">
              <span
                ref={trashRefreshRef}
                className="refresh-spinner"
                onClick={handleTrashRefreshClick}
                title="Обновить список"
                onAnimationEnd={(e) => {
                  e.currentTarget.classList.remove('spin');
                }}
              >
                ⟳
              </span>
            </div>
            <TrashManagement
              trash={trash}
              allTrash={allTrash}
              pagination={trashPagination}
              filters={trashFilters}
              handleFilterChange={handleTrashFilterChange}
              handlePageChange={handleTrashPageChange}
              restoreNews={restoreNewsAndRefresh}
              restoreEditNews={restoreEditNewsAndRefresh}
              purgeSingleNews={purgeSingleNewsAndRefresh}
              purgeTrash={purgeTrashAndRefresh}
            />
          </>
        )}

        {activeTab === 'archive' && (
          <>
            <div className="refresh-container">
              <span
                ref={archiveRefreshRef}
                className="refresh-spinner"
                onClick={handleArchiveRefreshClick}
                title="Обновить список"
                onAnimationEnd={(e) => {
                  e.currentTarget.classList.remove('spin');
                }}
              >
                ⟳
              </span>
            </div>
            <ArchiveManagement
              archive={archive}
              allArchive={allArchive}
              pagination={archivePagination}
              filters={archiveFilters}
              onFilterChange={handleArchiveFilterChange}
              onClearFilters={clearArchiveFilters}
              restoreNews={restoreArchiveNewsAndRefresh}
              restoreEditNews={restoreEditArchiveNewsAndRefresh}
              deleteArchiveNews={deleteArchiveNewsAndRefresh}
              deleteArchive={deleteArchiveAndRefresh}
              handlePageChange={handleArchivePageChange}
            />
          </>
        )}
      </div>

      <ToastContainer />
    </PageWrapper>
  );
}

export default AdminPanel;
