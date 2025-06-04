// src/components/admin/archive/ArchiveFilters.jsx

import React from "react";
import PropTypes from "prop-types";
import Flatpickr from "react-flatpickr";
import { Russian } from "flatpickr/dist/l10n/ru.js";
import "flatpickr/dist/flatpickr.min.css";

const ArchiveFilters = ({
  filters,
  onFilterChange,
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
    onChange: (dates) => onFilterChange("dateRange", dates),
  };

  return (
    <div className="filters-container">
      {/* Поиск по заголовку/описанию в архиве */}
      <div className="filter-group">
        <label htmlFor="search">Поиск в архиве:</label>
        <input
          id="search"
          type="text"
          placeholder="Поиск по заголовку или описанию"
          value={filters.searchQuery || ""}
          onChange={(e) => onFilterChange("searchQuery", e.target.value)}
        />
      </div>

      {/* Диапазон дат (фильтрация по publish_date или create_date) */}
      <div className="filter-group">
        <label htmlFor="date-filter">Диапазон дат архивации:</label>
        <Flatpickr
          id="date-filter"
          options={datePickerConfig}
          value={filters.dateRange}
          placeholder="Выберите даты"
          className="date-input"
        />
      </div>

      <button
        onClick={onClear}
        className="custom_button_long"
        disabled={!filters.searchQuery && !filters.dateRange[0]}
      >
        Сбросить фильтры
      </button>

      {/* Очистить весь архив */}
      {!purgeDisabled && (
        <button
          onClick={onPurgeAll}
          className="custom_button_long action-remove"
        >
          Очистить архив
        </button>
      )}
    </div>
  );
};

ArchiveFilters.propTypes = {
  filters: PropTypes.shape({
    searchQuery: PropTypes.string,
    dateRange: PropTypes.arrayOf(PropTypes.instanceOf(Date)),
  }).isRequired,
  onFilterChange: PropTypes.func.isRequired,
  onClear: PropTypes.func.isRequired,
  onPurgeAll: PropTypes.func.isRequired,
  purgeDisabled: PropTypes.bool.isRequired,
};

export default React.memo(ArchiveFilters);
