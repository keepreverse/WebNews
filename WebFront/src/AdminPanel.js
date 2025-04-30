import React, { useEffect, useState, useMemo, useCallback } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import PageWrapper from "./PageWrapper";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/flatpickr.min.css";
import { Russian } from "flatpickr/dist/l10n/ru.js";

function AdminPanel() {
  // Состояние для активного раздела
  const [activeTab, setActiveTab] = useState('users');
  
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
  

  // Загрузка текущего пользователя
  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    setCurrentUser(userData);
  }, []);

  // Загрузка пользователей
  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch("http://127.0.0.1:5000/api/admin/users", {
        credentials: "include"
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.DESCRIPTION || "Ошибка при загрузке пользователей");
      }
      
      const data = await response.json();
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
      const response = await fetch(
        "http://127.0.0.1:5000/api/admin/users/real_passwords", 
        { credentials: "include" }
      );
      
      if (!response.ok) throw new Error("Ошибка при загрузке паролей");
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Ошибка загрузки паролей:", error);
      toast.error("Не удалось загрузить пароли");
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
      const response = await fetch("http://127.0.0.1:5000/api/admin/pending-news", {
        credentials: "include"
      });
      
      if (!response.ok) throw new Error("Ошибка при загрузке новостей");
      
      const data = await response.json();
      setPendingNews(data);
    } catch (error) {
      console.error("Ошибка загрузки новостей:", error);
      toast.error("Не удалось загрузить новости на модерацию");
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

  const currentNews = useMemo(() => {
    const indexOfLastNews = newsCurrentPage * newsPerPage;
    const indexOfFirstNews = indexOfLastNews - newsPerPage;
    return pendingNews.slice(indexOfFirstNews, indexOfLastNews);
  }, [pendingNews, newsCurrentPage, newsPerPage]);

  const usersTotalPages = Math.ceil(filteredUsers.length / usersPerPage);
  const newsTotalPages = Math.ceil(pendingNews.length / newsPerPage);

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
      const response = await fetch(`http://127.0.0.1:5000/api/admin/users/${userId}`, {
        method: "DELETE",
        credentials: "include"
      });

      if (!response.ok) throw new Error("Ошибка при удалении пользователя");

      toast.success("Пользователь успешно удален");
      fetchUsers();
    } catch (error) {
      console.error("Ошибка удаления пользователя:", error);
      toast.error("Не удалось удалить пользователя");
    }
  };

  const updateUser = async (userId, updateData) => {
    try {
      const response = await fetch(`http://127.0.0.1:5000/api/admin/users/${userId}`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) throw new Error("Ошибка при обновлении пользователя");

      toast.success("Данные пользователя обновлены");
      setEditingUser(null);
      fetchUsers();
    } catch (error) {
      console.error("Ошибка обновления пользователя:", error);
      toast.error("Не удалось обновить данные пользователя");
    }
  };

  // Действия с новостями
  const handleModerate = async (newsID, action) => {
    if (!currentUser?.id) {
      toast.error("Требуется авторизация");
      return;
    }
  
    // Проверяем, что action имеет допустимое значение
    const allowedActions = ['approve', 'reject'];
    if (!allowedActions.includes(action)) {
      toast.error("Недопустимое действие модерации");
      return;
    }
  
    try {
      const response = await fetch(`http://127.0.0.1:5000/api/admin/moderate-news/${newsID}`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: action, // 'approve' или 'reject' в нижнем регистре
          moderator_id: currentUser.id
        })
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Moderation error:', errorData);
        throw new Error(errorData.DESCRIPTION || "Ошибка при модерации");
      }
      
      toast.success(`Новость успешно ${action === 'approve' ? 'одобрена' : 'отклонена'}`);
      fetchPendingNews();
    } catch (error) {
      console.error("Full moderation error:", error);
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
          className="custom_button_mid"
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
                      Изменить
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

  const NewsModerationTab = () => (
    <>
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
          <div key={news.newsID} className="moderation-item">
            <h3>{news.title}</h3>
            <div className="news-content" dangerouslySetInnerHTML={{ __html: news.description }} />
            <p><strong>Автор:</strong> {news.publisher_nick}</p>
            <p><strong>Дата создания:</strong> {new Date(news.create_date).toLocaleString()}</p>
            
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
    </>
  );

  return (
    <PageWrapper>
      <title>Панель администратора</title>
      <div id="data-list-form" className="container">
        <h1>Панель администратора</h1>
        
        <div className="admin-tabs">
          <button 
            className={`tab-button ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            Управление пользователями
          </button>
          <button 
            className={`tab-button ${activeTab === 'news' ? 'active' : ''}`}
            onClick={() => setActiveTab('news')}
          >
            Модерация новостей
          </button>
        </div>
        
        {activeTab === 'users' ? <UsersTab /> : <NewsModerationTab />}
      </div>
      
      <ToastContainer />
    </PageWrapper>
  );
}

const Pagination = React.memo(({ totalPages, currentPage, paginate }) => (
  <div className="pagination">
    {Array.from({ length: totalPages }).map((_, index) => (
      <button
        key={index}
        onClick={() => paginate(index + 1)}
        className={`pagination_button ${currentPage === index + 1 ? "active" : ""}`}
      >
        {index + 1}
      </button>
    ))}
  </div>
));

export default AdminPanel;