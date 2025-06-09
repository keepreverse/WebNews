import React from 'react';
import PropTypes from 'prop-types';
import Flatpickr from 'react-flatpickr';
import { Russian } from 'flatpickr/dist/l10n/ru.js';
import 'flatpickr/dist/flatpickr.min.css';

const UsersFilters = ({
  uniqueRoles,
  filters,
  onFilterChange,
  onClear,
  onDeleteAll,
  deleteDisabled,
  showPasswords,
  toggleAllPasswords,
}) => {
  const configFlatpickr = {
    mode: "range",
    altInput: true,
    altFormat: "F j, Y",
    dateFormat: "Y-m-d",
    locale: Russian,
    onChange: (dates) => {
      if (dates.length === 2) {
        onFilterChange('dateRange', dates);
      }
    },
  };

  const translateRole = (role) => {
    const roleTranslations = {
      'Administrator': 'Администратор',
      'Moderator': 'Модератор',
      'Publisher': 'Публикатор'
    };
    return roleTranslations[role] || role;
  };

  const isAnyFilterActive = Boolean(
    filters.role ||
    (filters.dateRange && filters.dateRange.length === 2) ||
    showPasswords
  );

  return (
    <div className="filters-container">
      <div className="filter-group">
        <label htmlFor="role-filter">Фильтр по роли:</label>
        <select
          id="role-filter"
          value={filters.role}
          onChange={(e) => onFilterChange("role", e.target.value)}
        >
          <option value="">Все роли</option>
          {uniqueRoles.map(role => (
            <option key={role} value={role}>
              {translateRole(role)}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label>Фильтр по дате регистрации:</label>
        <Flatpickr
          options={configFlatpickr}
          value={filters.dateRange}
          placeholder="Выберите даты"
          className="date-input"
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
        onClick={onClear}
        className="custom_button_long"
        disabled={!isAnyFilterActive}
      >
        Сбросить все фильтры
      </button>

      {!deleteDisabled && (
        <button
          onClick={onDeleteAll}
          className="custom_button_long action-remove"
        >
          Удалить всех пользователей
        </button>
      )}
    </div>
  );
};

UsersFilters.propTypes = {
  uniqueRoles: PropTypes.array.isRequired,
  filters: PropTypes.shape({
    role: PropTypes.string,
    dateRange: PropTypes.arrayOf(PropTypes.instanceOf(Date)),
    search: PropTypes.string,
  }).isRequired,
  onFilterChange: PropTypes.func.isRequired,
  onClear: PropTypes.func.isRequired,
  onDeleteAll: PropTypes.func.isRequired,
  deleteDisabled: PropTypes.bool.isRequired,
  showPasswords: PropTypes.bool.isRequired,
  toggleAllPasswords: PropTypes.func.isRequired,
};

export default React.memo(UsersFilters);