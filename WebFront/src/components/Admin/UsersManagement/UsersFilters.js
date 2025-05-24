import React from 'react';
import PropTypes from 'prop-types';
import Flatpickr from 'react-flatpickr';
import { Russian } from 'flatpickr/dist/l10n/ru.js';
import 'flatpickr/dist/flatpickr.min.css';

const UsersFilters = ({
  uniqueRoles,
  roleFilter,
  dateRange,
  showPasswords,
  onRoleChange,
  onDateChange,
  onTogglePasswords,
  onClear,
  onDeleteAll,       // Добавляем новый проп
  deleteDisabled     // И этот
}) => {
  const configFlatpickr = {
    mode: "range",
    altInput: true,
    altFormat: "F j, Y",
    dateFormat: "Y-m-d",
    locale: Russian,
    onChange: (selectedDates) => onDateChange(selectedDates)
  };

  const translateRole = (role) => {
    const roleTranslations = {
      'Administrator': 'Администратор',
      'Moderator': 'Модератор',
      'Publisher': 'Публикатор'
    };
    return roleTranslations[role] || role;
  };

  return (
    <div className="filters-container">
      <div className="filter-group">
        <label htmlFor="role-filter">Фильтр по роли</label>
        <select
          id="role-filter"
          value={roleFilter}
          onChange={onRoleChange}
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
        <label htmlFor="date-filter">Диапазон дат регистрации</label>
        <Flatpickr
          options={configFlatpickr}
          value={dateRange}
          placeholder="Выберите даты"
          className="date-input"
        />
      </div>

      <div className="filter-group filter-group--checkbox">
        <label>
          <input
            type="checkbox"
            checked={showPasswords}
            onChange={onTogglePasswords}
          />
          Показать реальные пароли
        </label>
      </div>

      <button
        onClick={onClear}
        className="custom_button_long"
        disabled={!roleFilter && !dateRange[0] && !showPasswords}
      >
        Сбросить все фильтры
      </button>

      <button
        onClick={onDeleteAll}
        className="custom_button_long"
        id="delete-all"
        disabled={deleteDisabled}
      >
        Удалить всех пользователей
      </button>

    </div>
  );
};

UsersFilters.propTypes = {
  uniqueRoles: PropTypes.array.isRequired,
  roleFilter: PropTypes.string,
  dateRange: PropTypes.array.isRequired,
  showPasswords: PropTypes.bool.isRequired,
  onRoleChange: PropTypes.func.isRequired,
  onDateChange: PropTypes.func.isRequired,
  onTogglePasswords: PropTypes.func.isRequired,
  onClear: PropTypes.func.isRequired,
  onDeleteAll: PropTypes.func.isRequired,
  deleteDisabled: PropTypes.bool.isRequired  
};

export default React.memo(UsersFilters);