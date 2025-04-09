import React, { useEffect, useState, useMemo, useCallback } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import PageWrapper from "./PageWrapper";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/flatpickr.min.css";
import { Russian } from "flatpickr/dist/l10n/ru.js";

function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [showPasswords, setShowPasswords] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 10;

  // Фильтры
  const [roleFilter, setRoleFilter] = useState("");
  const [dateRange, setDateRange] = useState([null, null]);
  const [uniqueRoles, setUniqueRoles] = useState([]);

  // Конфигурация Flatpickr
  const configFlatpickr = useMemo(() => ({
    mode: "range",
    altInput: true,
    altFormat: "F j, Y",
    dateFormat: "Y-m-d",
    locale: Russian,
  }), []);

  const fetchUsers = useCallback(async () => {
    try {
      const endpoint = showPasswords 
        ? "http://127.0.0.1:5000/api/admin/users/real_passwords"
        : "http://127.0.0.1:5000/api/admin/users";
      
      const response = await fetch(endpoint, {
        credentials: "include"
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.DESCRIPTION || "Ошибка при загрузке пользователей");
      }
      
      const data = await response.json();
      setUsers(data);
      setFilteredUsers(data);
      
      // Получаем уникальные роли
      const roles = [...new Set(data.map(user => user.user_role))];
      setUniqueRoles(roles);
    } catch (error) {
      console.error("Ошибка загрузки пользователей:", error);
      toast.error(error.message || "Не удалось загрузить данные пользователей");
    }
  }, [showPasswords]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]); // useEffect, который вызывает fetchUsers при изменении showPasswords

  useEffect(() => {
    let result = [...users];
    
    if (roleFilter) {
      result = result.filter(user => user.user_role === roleFilter);
    }

    // Фильтрация по дате
    if (dateRange[0] && dateRange[1]) {
      const [startDate, endDate] = dateRange;
      result = result.filter(user => {
        const registrationDate = new Date(user.registration_date); // предполагаем, что у каждого пользователя есть поле registration_date
        return registrationDate >= startDate && registrationDate <= endDate;
      });
    }
    
    setFilteredUsers(result);
    setCurrentPage(1);
  }, [users, roleFilter, dateRange]);

  const handleRoleChange = (e) => {
    setRoleFilter(e.target.value || "");
  };

  const handleDateChange = (selectedDates) => {
    setDateRange(selectedDates);
  };

  const clearFilters = () => {
    setRoleFilter("");
    setDateRange([null, null]);
  };

  const currentUsers = useMemo(() => {
    const indexOfLastUser = currentPage * usersPerPage;
    const indexOfFirstUser = indexOfLastUser - usersPerPage;
    return filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  }, [filteredUsers, currentPage, usersPerPage]);

  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

  const handleEditUser = (user) => {
    const newNickname = prompt("Введите новый никнейм:", user.nick);
    if (newNickname && newNickname !== user.nick) {
      updateUser(user.userID, { nick: newNickname });
    }

    const newRole = prompt("Введите новую роль (Administrator, Moderator, Publisher):", user.user_role);
    if (newRole && ["Administrator", "Moderator", "Publisher"].includes(newRole) && newRole !== user.user_role) {
      updateUser(user.userID, { user_role: newRole });
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Вы уверены, что хотите удалить этого пользователя?")) return;
    
    try {
      const response = await fetch(`http://127.0.0.1:5000/api/admin/users/${userId}`, {
        method: "DELETE",
        credentials: "include"
      });

      if (!response.ok) {
        throw new Error("Ошибка при удалении пользователя");
      }

      toast.success("Пользователь успешно удален");
      fetchUsers(); // Обновляем список пользователей
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

      if (!response.ok) {
        throw new Error("Ошибка при обновлении пользователя");
      }

      toast.success("Данные пользователя обновлены");
      fetchUsers(); // Обновляем список пользователей
    } catch (error) {
      console.error("Ошибка обновления пользователя:", error);
      toast.error("Не удалось обновить данные пользователя");
    }
  };


  return (
    <PageWrapper>
      <title>Управление пользователями</title>
      <div id="data-list-form" className="container">
        <h1>Управление пользователями</h1>

        {/* Фильтры */}
        <div className="filters-container">
          <div className="filter-group">
            <label htmlFor="role-filter">Фильтр по роли:</label>
            <select
              id="role-filter"
              value={roleFilter}
              onChange={handleRoleChange}
            >
              <option value="">Все роли</option>
              {uniqueRoles.map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </div>
          
          <div className="filter-group">
            <label>Фильтр по дате регистрации:</label>
            <Flatpickr
              options={configFlatpickr}
              onChange={handleDateChange}
              value={dateRange}
              placeholder="Выберите диапазон дат"
            />
          </div>
          
          <div className="filter-group">
            <label>
              <input
                type="checkbox"
                checked={showPasswords}
                onChange={() => setShowPasswords(!showPasswords)}
              />
              Показать пароли
            </label>
          </div>
              
          <button 
            onClick={clearFilters} 
            className="custom_button_mid"
            disabled={!roleFilter && !dateRange[0]}
          >
            Сбросить фильтры
          </button>
        </div>

          {totalPages > 1 && (
            <Pagination 
              totalPages={totalPages} 
              currentPage={currentPage} 
              paginate={setCurrentPage} 
            />
          )}

          <div className="data-list">
            {currentUsers.length === 0 ? (
              <p>Пользователи не найдены</p>
            ) : (
              currentUsers.map(user => (
                <div key={user.userID} className="data-item">
                  <h2>{user.nick || user.login}</h2>
                  
                  <div className="user-details">
                    <p><strong>ID:</strong> {user.userID}</p>
                    <p><strong>Роль:</strong> {user.user_role}</p>
                    <p><strong>Никнейм:</strong> {user.nick || "Не указан"}</p>
                    <p><strong>Логин:</strong> {user.login}</p>
                    <p><strong>Пароль:</strong> {showPasswords ? user.password || '********' : '********'}</p>
                  </div>

                  <div className="list-actions">
                    <button 
                      className="custom_button_short" 
                      id="edit"
                      onClick={() => handleEditUser(user)}
                    >
                      Изменить
                    </button>
                    <button 
                      className="custom_button_short" 
                      id="delete"
                      onClick={() => handleDeleteUser(user.userID)}
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {totalPages > 1 && (
            <Pagination 
              totalPages={totalPages} 
              currentPage={currentPage} 
              paginate={setCurrentPage} 
            />
          )}
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
