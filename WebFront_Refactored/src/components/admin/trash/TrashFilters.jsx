// src/components/admin/trash/TrashFilters.jsx
import React from "react";
import PropTypes from "prop-types";
import Flatpickr from "react-flatpickr";
import { Russian } from "flatpickr/dist/l10n/ru.js";
import "flatpickr/dist/flatpickr.min.css";

const TrashFilters = ({
  searchFilter,
  dateRange,
  onSearchChange,
  onDateChange,
  onClear,
  onPurgeAll,
  purgeDisabled,
}) => {
  const datePickerConfig = {
    mode: "range",
    altInput: true,
    altFormat: "F j, Y",
    dateFormat: "Y-m-d",
    locale: Russian,
    onChange: (dates) => onDateChange(dates),
  };

  return (
    <div className="filters-container">
      {/* Поиск по заголовку/описанию */}
      <div className="filter-group">
        <label htmlFor="search">Поиск по корзине:</label>
        <input
          id="search"
          type="text"
          placeholder="Поиск по заголовку или описанию"
          value={searchFilter}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      {/* Диапазон дат удаления */}
      <div className="filter-group">
        <label htmlFor="date-filter">Диапазон дат удаления:</label>
        <Flatpickr
          id="date-filter"
          options={datePickerConfig}
          value={dateRange}
          placeholder="Выберите даты"
          className="date-input"
        />
      </div>

      {/* Сброс фильтров */}    
      <button
        onClick={onClear}
        className="custom_button_long"
        disabled={!searchFilter && !dateRange[0]}
      >
        Сбросить фильтры
      </button>

      {/* Очистить всю корзину */}
      <button
        onClick={onPurgeAll}
        className="custom_button_long action-remove"
        disabled={purgeDisabled}
      >
        Очистить корзину
      </button>
    </div>
  );
};

TrashFilters.propTypes = {
  searchFilter: PropTypes.string.isRequired,
  dateRange: PropTypes.arrayOf(PropTypes.instanceOf(Date)).isRequired,
  onSearchChange: PropTypes.func.isRequired,
  onDateChange: PropTypes.func.isRequired,
  onClear: PropTypes.func.isRequired,
  onPurgeAll: PropTypes.func.isRequired,
  purgeDisabled: PropTypes.bool.isRequired,
};

export default React.memo(TrashFilters);
