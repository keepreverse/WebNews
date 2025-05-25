import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import PageWrapper from "./PageWrapper";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/flatpickr.min.css";
import HTMLReactParser from "html-react-parser";
import { Russian } from "flatpickr/dist/l10n/ru.js";

import Lightbox from "yet-another-react-lightbox";
import Fullscreen from "yet-another-react-lightbox/plugins/fullscreen";
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/plugins/thumbnails.css";
import "yet-another-react-lightbox/styles.css";

import { api } from './apiClient';
import { initAuthToken } from './apiClient';

function AdminPanel() {

  const navigate = useNavigate();

  // Состояние для активного раздела
  const [activeTab, setActiveTab] = useState('news');
  
  // Состояния для управления пользователями
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [showPasswords, setShowPasswords] = useState(false);
  const [usersWithRealPasswords, setUsersWithRealPasswords] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 10;

  // Фильтры для пользователей
  const [roleFilter, setRoleFilter] = useState("");
  const [dateRange, setDateRange] = useState([null, null]);
  const [uniqueRoles, setUniqueRoles] = useState([]);

  // Состояния для модерации новостей
  const [pendingNews, setPendingNews] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [newsCurrentPage, setNewsCurrentPage] = useState(1);
  const newsPerPage = 5;

  // Конфигурация Flatpickr для диапазона дат
  const configFlatpickr = useMemo(() => ({
    mode: "range",
    altInput: true,
    altFormat: "F j, Y",
    dateFormat: "Y-m-d",
    locale: Russian,
  }), []);
  

  useEffect(() => {
    // Инициализируем токен из хранилища
    initAuthToken();
    
    const userData = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || 'null');
    if (userData) {
      setCurrentUser(userData);
      
      // Проверяем, есть ли у пользователя права администратора
      if (userData.role !== 'Administrator' && userData.role !== 'Moderator' ) {
        toast.error('Недостаточно прав для доступа к панели администратора');
        // Перенаправляем на главную или страницу входа
        navigate('/');
      }
    } else {
      toast.error('Требуется авторизация');
      navigate('/login');
    }
  }, [navigate]);

  // Загрузка пользователей
  const fetchUsers = useCallback(async () => {
    try {
      const data = await api.get("/api/admin/users");
      
      setUsers(data);
      setFilteredUsers(data);
      
      const roles = [...new Set(data.map(user => user.user_role))];
      setUniqueRoles(roles);
    } catch (error) {
      console.error("Ошибка загрузки пользователей:", error);
      toast.error(error.message || "Не удалось загрузить данные пользователей");
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    }
  }, [activeTab, fetchUsers]);

  // Загрузка паролей
  const fetchRealPasswords = useCallback(async () => {
    try {
      const data = await api.get("/api/admin/users/real_passwords");
      return data;
    } catch (error) {
      console.error("Ошибка загрузки паролей:", error);
      toast.error(error.message || "Не удалось загрузить пароли");
      return null;
    }
  }, []);

  const toggleAllPasswords = async () => {
    const newShowPasswords = !showPasswords;
    
    if (newShowPasswords && usersWithRealPasswords.length === 0) {
      const realPasswordsData = await fetchRealPasswords();
      if (realPasswordsData) {
        setUsersWithRealPasswords(realPasswordsData);
      }
    }
    
    setShowPasswords(newShowPasswords);
  };

  const getPasswordDisplay = (user) => {
    if (!showPasswords) return '********';
    
    const userWithPassword = usersWithRealPasswords.find(u => u.userID === user.userID);
    return userWithPassword ? userWithPassword.real_password || userWithPassword.password : '********';
  };

  // Фильтрация пользователей
  useEffect(() => {
    let result = [...users];
    
    if (roleFilter) {
      result = result.filter(user => user.user_role === roleFilter);
    }

    if (dateRange[0] && dateRange[1]) {
      const [startDate, endDate] = dateRange;
      result = result.filter(user => {
        const registrationDate = new Date(user.registration_date);
        return registrationDate >= startDate && registrationDate <= endDate;
      });
    }
    
    setFilteredUsers(result);
    setCurrentPage(1);
  }, [users, roleFilter, dateRange]);

  // Загрузка новостей на модерацию
  const fetchPendingNews = useCallback(async () => {
    try {
      const data = await api.get("/api/admin/pending-news");

      setPendingNews(data);
      return data;
    } catch (error) {
      console.error("Ошибка загрузки новостей:", error);
      return [];
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'news') {
      fetchPendingNews();
    }
  }, [activeTab, fetchPendingNews]);

  // Обработчики для пользователей
  const handleRoleChange = (e) => setRoleFilter(e.target.value || "");

  const clearFilters = () => {
    setRoleFilter("");
    setDateRange([null, null]);
    setShowPasswords(false);
  };
  
  const currentUsers = useMemo(() => {
    const indexOfLastUser = currentPage * usersPerPage;
    const indexOfFirstUser = indexOfLastUser - usersPerPage;
    return filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  }, [filteredUsers, currentPage, usersPerPage]);

  const usersTotalPages = Math.ceil(filteredUsers.length / usersPerPage);

  const translateRole = (role) => {
    const roleTranslations = {
      'Administrator': 'Администратор',
      'Moderator': 'Модератор',
      'Publisher': 'Публикатор'
    };
    return roleTranslations[role] || role;
  };

  // Действия с пользователями
  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Вы уверены, что хотите удалить этого пользователя?")) return;
    
    try {
      await api.delete(`/api/admin/users/${userId}`);
      toast.success("Пользователь успешно удален");
      fetchUsers();
    } catch (error) {
      console.error("Ошибка удаления пользователя:", error);
      toast.error(error.message || "Не удалось удалить пользователя");
    }
  };

  const updateUser = async (userId, updateData) => {
    try {
      await api.put(`/api/admin/users/${userId}`, updateData);
      toast.success("Данные пользователя обновлены");
      setEditingUser(null);
      fetchUsers();
    } catch (error) {
      console.error("Ошибка обновления пользователя:", error);
      toast.error(error.message || "Не удалось обновить данные пользователя");
    }
  };

  const handleModerate = async (newsID, action) => {
    if (!currentUser?.id || !newsID) {
      toast.error("Ошибка авторизации");
      return;
    }
  
    try {
      await api.post(`/api/admin/moderate-news/${newsID}`, {
        action: action,
        moderator_id: currentUser.id
      });
  
      toast.success(`Новость успешно ${action === 'approve' ? 'одобрена' : 'отклонена'}`);
      
      // Обновляем список новостей
      const updatedNews = await fetchPendingNews();
      
      // Корректируем пагинацию
      if (updatedNews.length > 0) {
        const maxPossiblePage = Math.ceil(updatedNews.length / newsPerPage);
        setNewsCurrentPage(prev => Math.min(prev, maxPossiblePage));
      } else {
        setNewsCurrentPage(1);
      }
    } catch (error) {
      console.error("Ошибка модерации:", error);
      toast.error(error.message || "Не удалось выполнить модерацию");
    }
  };

  // Компоненты форм
  const UserEditForm = ({ user, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
      nick: user.nick || '',
      user_role: user.user_role,
      login: user.login
    });

    return (
      <div className="edit-form">
        <div className="form-group">
          <label>Логин:</label>
          <input
            type="text"
            value={formData.login}
            onChange={(e) => setFormData({ ...formData, login: e.target.value })}
          />
        </div>
        <div className="form-group">
          <label>Никнейм:</label>
          <input
            type="text"
            value={formData.nick}
            onChange={(e) => setFormData({ ...formData, nick: e.target.value })}
          />
        </div>
        <div className="form-group">
          <label>Роль:</label>
          <select
            value={formData.user_role}
            onChange={(e) => setFormData({ ...formData, user_role: e.target.value })}
          >
            <option value="Administrator">Администратор</option>
            <option value="Moderator">Модератор</option>
            <option value="Publisher">Публикатор</option>
          </select>
        </div>
        <div className="form-actions">
          <button className="custom_button_short" id="submit" onClick={() => onSave(user.userID, formData)}>
            Сохранить
          </button>
          <button className="custom_button_short" id="delete" onClick={onCancel}>
            Отмена
          </button>
        </div>
      </div>
    );
  };

  // Рендер разделов
  const UsersTab = () => (
    <>
      <div className="filters-container">
        <div className="filter-group">
          <label htmlFor="role-filter">Фильтр по роли</label>
          <select
            id="role-filter"
            value={roleFilter}
            onChange={handleRoleChange}
          >
            <option value="">Все роли</option>
            {uniqueRoles.map(role => (
              <option key={role} value={role}>{translateRole(role)}</option>
            ))}
          </select>
        </div>
          
        <div className="filter-group">
          <label htmlFor="date-filter-visible">Фильтр по дате регистрации</label>
          <Flatpickr
            options={configFlatpickr}
            value={dateRange}
            placeholder="Выберите диапазон дат"
          />
        </div>

        <div className="filter-group filter-group--checkbox">
          <label>
            <input
              type="checkbox"
              checked={showPasswords}
              onChange={toggleAllPasswords}
            />
            Показать пароли
          </label>
        </div>

        <button
          onClick={clearFilters}
          className="custom_button_long"
          disabled={!roleFilter && !dateRange[0] && !showPasswords}
        >
          Сбросить фильтры
        </button>
      </div>

      {usersTotalPages > 1 && (
        <Pagination
          totalPages={usersTotalPages}
          currentPage={currentPage}
          paginate={setCurrentPage}
        />
      )}

      <div className="data-list">
        {currentUsers.length === 0 ? (
          <p>Пользователи не найдены</p>
        ) : currentUsers.map(user => (
          <div key={user.userID} className="data-item">
            <h2>{user.nick || user.login}</h2>

            {editingUser === user.userID
              ? <UserEditForm user={user} onSave={updateUser} onCancel={() => setEditingUser(null)} />
              : (
                <>
                  <div className="user-details">
                    <p><strong>ID:</strong> {user.userID}</p>
                    <p><strong>Роль:</strong> {translateRole(user.user_role)}</p>
                    <p><strong>Никнейм:</strong> {user.nick || "Не указан"}</p>
                    <p><strong>Логин:</strong> {user.login}</p>
                    <p><strong>Пароль:</strong> {getPasswordDisplay(user)}</p>
                  </div>
                  <div className="list-actions">
                    <button className="custom_button_short" id="edit" onClick={() => setEditingUser(user.userID)}>
                      Редактировать
                    </button>
                    <button className="custom_button_short" id="delete" onClick={() => handleDeleteUser(user.userID)}>
                      Удалить
                    </button>
                  </div>
                </>
              )
            }
          </div>
        ))}
      </div>

      {usersTotalPages > 1 && (
        <Pagination
          totalPages={usersTotalPages}
          currentPage={currentPage}
          paginate={setCurrentPage}
        />
      )}
    </>
  );

  // Компонент модерации новостей с фильтрами
  const NewsModerationTab = () => {
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);
    const [lightboxSlides, setLightboxSlides] = useState([]);

    const [authorFilter, setAuthorFilter] = useState("");
    const [dateRangeNews, setDateRangeNews] = useState([null, null]);
    const [uniqueAuthors, setUniqueAuthors] = useState([]);
  

    const openLightbox = (newsItem, index) => {
      if (!newsItem.files || newsItem.files.length === 0) return;

      const slides = newsItem.files.map(file => ({
        src: `http://127.0.0.1:5000/uploads/${file.fileName}`,
        alt: `Изображение новости ${newsItem.newsID}`
      }));

      setLightboxSlides(slides);
      setLightboxIndex(index);
      setLightboxOpen(true);
    };


    // Получаем уникальных авторов при загрузке новостей
    useEffect(() => {
      if (pendingNews.length > 0) {
        const authors = [...new Set(pendingNews.map(item => item.publisher_nick).filter(Boolean))];
        setUniqueAuthors(authors);
      }
    }, []); // Убрал pendingNews из зависимостей
  
    // Обработчик изменения автора
    const handleAuthorChange = (e) => {
      setAuthorFilter(e.target.value || "");
      setNewsCurrentPage(1);
    };
  
    // Обработчик изменения даты
    const handleDateChangeNews = (selectedDates) => {
      setDateRangeNews(selectedDates);
      setNewsCurrentPage(1);
    };
  
    // Сброс фильтров
    const clearNewsFilters = () => {
      setAuthorFilter("");
      setDateRangeNews([null, null]);
    };

    const handleArchive = async (newsID) => {
      try {
        await api.post(`/api/news/${newsID}/archive`, {});
        toast.success("Новость успешно архивирована");
        fetchPendingNews();
      } catch (error) {
        console.error("Ошибка архивации:", error);
        toast.error(error.message || "Не удалось архивировать новость");
      }
    };

    // Фильтрация новостей
    const filteredNews = useMemo(() => {
      let result = [...pendingNews];
      
      if (authorFilter) {
        result = result.filter(item => item.publisher_nick === authorFilter);
      }
    
      if (dateRangeNews[0] && dateRangeNews[1]) {
        const [startDate, endDate] = dateRangeNews;
        const filterStartDate = new Date(startDate).setHours(0, 0, 0, 0);
        const filterEndDate = new Date(endDate).setHours(23, 59, 59, 999);
    
        result = result.filter(item => {
          const itemDate = new Date(item.event_start).getTime();
          return itemDate >= filterStartDate && itemDate <= filterEndDate;
        });
      }
      
      return result;
    }, [authorFilter, dateRangeNews]); // Убрал pendingNews из зависимостей
  
    // Текущие новости с учетом пагинации
    const currentNews = useMemo(() => {
      const indexOfLastNews = newsCurrentPage * newsPerPage;
      const indexOfFirstNews = indexOfLastNews - newsPerPage;
      return filteredNews.slice(indexOfFirstNews, indexOfLastNews);
    }, [filteredNews]); // Убрал newsCurrentPage и newsPerPage из зависимостей
  
    const newsTotalPages = Math.ceil(filteredNews.length / newsPerPage);

    return (
      <>
        {/* Блок фильтров для новостей */}
        <div className="filters-container">
          <div className="filter-group">
            <label htmlFor="author-filter">Фильтр по автору:</label>
            <select
              id="author-filter"
              value={authorFilter}
              onChange={handleAuthorChange}
            >
              <option value="">Все авторы</option>
              {uniqueAuthors.map(author => (
                <option key={author} value={author}>{author}</option>
              ))}
            </select>
          </div>
          
          <div className="filter-group">
            <label>Фильтр по дате события:</label>
            <Flatpickr
              options={configFlatpickr}
              onChange={handleDateChangeNews}
              value={dateRangeNews}
              placeholder="Выберите диапазон дат"
            />
          </div>
          
          <button 
            onClick={clearNewsFilters} 
            className="custom_button_long"
            disabled={!authorFilter && !dateRangeNews[0]}
          >
            Сбросить фильтры
          </button>

          {/* Кнопка "Удалить все" - только для администраторов */}
          {(currentUser?.user_role === 'Administrator' || currentUser?.user_role === 'Moderator') && (
            <button 
              onClick={() => {
                if (window.confirm("Вы уверены, что хотите удалить ВСЕ новости на модерации?")) {
                  // Здесь можно добавить логику удаления всех новостей
                }
              }} 
              className="custom_button_long" 
              id="delete-all"
            >
              Удалить все новости
            </button>
          )}
        </div>

        {newsTotalPages > 1 && (
          <Pagination
            totalPages={newsTotalPages}
            currentPage={newsCurrentPage}
            paginate={setNewsCurrentPage}
          />
        )}

        <div className="data-list">
          {currentNews.length === 0 ? (
            <p>Нет новостей на модерации</p>
          ) : currentNews.map(news => (
            <div key={news.newsID} className="data-item">
              <h2>{news.title}</h2>
              <div className="news-description">{HTMLReactParser(news.description)}</div>
              
              <div className="news-meta">
                {news.publisher_nick && (
                  <p><strong>Автор:</strong> {news.publisher_nick}</p>
                )}
                
                {news.event_start && (
                  <p>
                    <strong>Дата события:</strong>{" "}
                    {new Date(news.event_start).toLocaleDateString("ru-RU", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                    {", "}
                    {new Date(news.event_start).toLocaleTimeString("ru-RU", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                )}

                {news.event_end && (
                  <p>
                    <strong>Дата окончания:</strong>{" "}
                    {new Date(news.event_end).toLocaleDateString("ru-RU", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                    {", "}
                    {new Date(news.event_end).toLocaleTimeString("ru-RU", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                )}

                {news.files?.length > 0 && (
                  <>
                    <p><strong>Количество фотографий:</strong> {news.files.length}</p>
                    <div className="thumbnail-container">
                    {news.files.map((file, index) => (
                      <div key={index} className="thumbnail">
                        <img
                          src={`http://127.0.0.1:5000/uploads/${file.fileName}`}
                          alt={`Фото ${index + 1}`}
                          className="data-image"
                          onClick={() => openLightbox(news, index)}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = '/path/to/placeholder/image.jpg';
                          }}
                        />
                      </div>
                    ))}
                    </div>
                  </>
                )}
              </div>

              <div className="moderation-actions">
                <button 
                  onClick={() => handleModerate(news.newsID, 'approve')}
                  className="custom_button_short approve"
                >
                  Одобрить
                </button>
                <button 
                  onClick={() => handleModerate(news.newsID, 'reject')}
                  className="custom_button_short reject"
                >
                  Отклонить
                </button>
                <button
                  onClick={() => handleArchive(news.newsID)}
                  className="custom_button_short archive"
                >
                  В архив
                </button>
              </div>
            </div>
          ))}
        </div>

        {newsTotalPages > 1 && (
          <Pagination
            totalPages={newsTotalPages}
            currentPage={newsCurrentPage}
            paginate={setNewsCurrentPage}
          />
        )}

        <Lightbox
          open={lightboxOpen}
          close={() => setLightboxOpen(false)}
          index={lightboxIndex}
          slides={lightboxSlides}
          plugins={[Fullscreen, Thumbnails, Zoom]}
          styles={{
            container: { backgroundColor: "rgba(0, 0, 0, 0.8)" },
            thumbnail: {
              backgroundColor: "rgba(0, 0, 0, 0.5)",
            },
            thumbnailsContainer: {
              backgroundColor: "rgba(0, 0, 0, 0.8)",
            },
            icon: {
              color: "rgba(255, 255, 255, 0.7)",
              filter: "drop-shadow(0 0 2px rgba(0, 0, 0, 0.5))",
            },
            iconDisabled: {
              color: "rgba(255, 255, 255, 0.3)",
            },
            iconHover: {
              color: "#fff",
              backgroundColor: "rgba(0, 0, 0, 0.3)",
            }
          }}
          thumbnails={{
            vignette: false,
          }}
          zoom={{
            maxZoomPixelRatio: 4, // Максимальный уровень увеличения
            zoomInMultiplier: 1.2,  // Множитель увеличения
            scrollToZoom: true    // Включить зум скроллом
          }}
        />

      </>
    );
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
        
        {activeTab === 'users' ? <UsersTab /> : <NewsModerationTab />}
      </div>
      
      <ToastContainer />
    </PageWrapper>
  );
}


const Pagination = React.memo(({ totalPages, currentPage, paginate }) => {
  const [inputPage, setInputPage] = useState('');

  const handlePageInput = (e) => {
    e.preventDefault();
    const page = parseInt(inputPage);
    if (page >= 1 && page <= totalPages) {
      paginate(page);
    }
    setInputPage('');
  };

  const getVisiblePages = () => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    
    let pages = [];
    pages.push(1);
    
    if (currentPage > 3) pages.push('...');
    
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    
    for (let i = start; i <= end; i++) pages.push(i);
    
    if (currentPage < totalPages - 2) pages.push('...');
    
    pages.push(totalPages);
    
    return pages;
  };

  return (
    <div className="pagination">
      {getVisiblePages().map((page, index) => (
        page === '...' ? 
          <span key={`ellipsis-${index}`} className="pagination-ellipsis">...</span> :
          <button
            key={page}
            onClick={() => paginate(page)}
            className={`pagination_button ${currentPage === page ? "active" : ""}`}
          >
            {page}
          </button>
      ))}

      {totalPages > 10 && (
        <form onSubmit={handlePageInput} className="page-input-form">
          <input
            type="number"
            min="1"
            max={totalPages}
            value={inputPage}
            onChange={(e) => setInputPage(e.target.value)}
            placeholder="№"
          />
          <button type="submit">Перейти</button>
        </form>
      )}
    </div>
  );
});


export default AdminPanel;