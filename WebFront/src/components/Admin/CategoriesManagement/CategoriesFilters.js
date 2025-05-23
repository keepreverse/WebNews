import React from 'react';
import PropTypes from 'prop-types';
import Flatpickr from 'react-flatpickr';
import { Russian } from 'flatpickr/dist/l10n/ru.js';
import 'flatpickr/dist/flatpickr.min.css';

const CategoriesFilters = ({
  dateRange,
  searchFilter,
  onSearchChange,
  onDateChange,
  onClear,
  onDeleteAll,
  deleteDisabled
}) => {
  const configFlatpickr = {
    mode: "range",
    altInput: true,
    altFormat: "F j, Y",
    dateFormat: "Y-m-d",
    locale: Russian,
    onChange: (selectedDates) => onDateChange(selectedDates)
  };

  return (
    <div className="filters-container">
      <div className="filter-group">
        <label htmlFor="search-categories">Поиск по названию</label>
        <input
          id="search-categories"
          type="text"
          placeholder="Введите название..."
          value={searchFilter}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <div className="filter-group">
        <label htmlFor="date-filter">Диапазон дат создания</label>
        <Flatpickr
          options={configFlatpickr}
          value={dateRange}
          placeholder="Выберите даты"
          className="date-input"
        />
      </div>

      <button
        onClick={onClear}
        className="custom_button_long"
        disabled={!searchFilter && !dateRange[0]}
      >
        Сбросить все фильтры
      </button>

      <button
        onClick={onDeleteAll}
        className="custom_button_long"
        id="delete-all"
        disabled={deleteDisabled}
      >
        Удалить все категории
      </button>
    </div>
  );
};

CategoriesFilters.propTypes = {
  dateRange: PropTypes.array.isRequired,
  searchFilter: PropTypes.string,
  onSearchChange: PropTypes.func.isRequired,
  onDateChange: PropTypes.func.isRequired,
  onClear: PropTypes.func.isRequired,
  onDeleteAll: PropTypes.func.isRequired,
  deleteDisabled: PropTypes.bool.isRequired  
};

export default React.memo(CategoriesFilters);