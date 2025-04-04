import React, { useEffect, useState, useMemo } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import PageWrapper from "./PageWrapper";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/flatpickr.min.css";
import { Russian } from "flatpickr/dist/l10n/ru.js";

function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch("http://127.0.0.1:5000/api/admin/users", {
          credentials: "include"
        });
        
        if (!response.ok) {
          throw new Error("Ошибка при загрузке пользователей");
        }
        
        const data = await response.json();
        setUsers(data);
        setFilteredUsers(data);
        
        // Получаем уникальные роли
        const roles = [...new Set(data.map(user => user.user_role))];
        setUniqueRoles(roles);
        setLoading(false);
      } catch (error) {
        console.error("Ошибка загрузки пользователей:", error);
        toast.error("Не удалось загрузить данные пользователей");
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  useEffect(() => {
    let result = [...users];
    
    if (roleFilter) {
      result = result.filter(user => user.user_role === roleFilter);
    }
    
    // Фильтрация по дате (если нужно)
    // if (dateRange[0] && dateRange[1]) { ... }
    
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
          
          <button 
            onClick={clearFilters} 
            className="custom_button_mid"
            disabled={!roleFilter && !dateRange[0]}
          >
            Сбросить фильтры
          </button>
        </div>

        {loading ? (
          <p>Загрузка...</p>
        ) : (
          <>
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
                      <p><strong>Логин:</strong> {user.login}</p>
                      <p><strong>Никнейм:</strong> {user.nick || "Не указан"}</p>
                      <p><strong>Роль:</strong> {user.user_role}</p>
                      <p><strong>Пароль (hash):</strong> {user.password}</p>
                    </div>

                    <div className="list-actions">
                      <button 
                        className="custom_button_short" 
                        id="edit"
                        onClick={() => {/* Редактирование пользователя */}}
                      >
                        Изменить
                      </button>
                      <button 
                        className="custom_button_short" 
                        id="delete"
                        onClick={() => {/* Удаление пользователя */}}
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
          </>
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