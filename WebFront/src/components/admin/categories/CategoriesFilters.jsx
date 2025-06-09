import React from 'react';
import PropTypes from 'prop-types';
import Flatpickr from 'react-flatpickr';
import { Russian } from 'flatpickr/dist/l10n/ru.js';
import 'flatpickr/dist/flatpickr.min.css';

const CategoriesFilters = ({
  filters,
  onFilterChange,
  onClear,
  onDeleteAll,
  deleteDisabled,
}) => {
  const configFlatpickr = {
    mode: "range",
    altInput: true,
    altFormat: "F j, Y",  
    dateFormat: "Y-m-d",
    locale: Russian,
    closeOnSelect: false,
    onChange: (dates) => {
      if (dates.length === 2) {
        onFilterChange("dateRange", dates);
      }
    },
  };

  return (
    <div className="filters-container">
      <div className="filter-group">
        <label htmlFor="search">Поиск по категориям:</label>
        <input
          type="text"
          id="search"
          placeholder="Поиск по названию или описанию"
          value={filters.search}
          onChange={(e) => onFilterChange('search', e.target.value)}
        />
      </div>

      <div className="filter-group">
        <label>Диапазон дат создания:</label>
        <Flatpickr
          options={configFlatpickr}
          value={filters.dateRange}
          placeholder="Выберите даты"
        />
      </div>

      <button
        onClick={onClear}
        className="custom_button_long"
        disabled={!filters.searchQuery && !filters.dateRange[0]}
      >
        Сбросить фильтры
      </button>

      {!deleteDisabled && (
        <button
          onClick={onDeleteAll}
          className="custom_button_long action-remove"
        >
          Удалить все
        </button>
      )}
    </div>
  );
};

CategoriesFilters.propTypes = {
  filters: PropTypes.shape({
    search: PropTypes.string,
    dateRange: PropTypes.arrayOf(PropTypes.instanceOf(Date)),
  }).isRequired,
  onFilterChange: PropTypes.func.isRequired,
  onClear: PropTypes.func.isRequired,
  onDeleteAll: PropTypes.func.isRequired,
  deleteDisabled: PropTypes.bool.isRequired,
};

export default React.memo(CategoriesFilters);
