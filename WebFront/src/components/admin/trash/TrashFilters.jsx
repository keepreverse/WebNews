import React from "react";
import PropTypes from "prop-types";
import Flatpickr from "react-flatpickr";
import { Russian } from "flatpickr/dist/l10n/ru.js";
import "flatpickr/dist/flatpickr.min.css";

const TrashFilters = ({
  filters,
  onFilterChange,
  onClear,
  onPurgeAll,
  purgeDisabled,
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
        <label htmlFor="search">Поиск в корзине:</label>
        <input
          type="text"
          id="search"
          value={filters.search || ""}
          onChange={(e) => onFilterChange("search", e.target.value)}
          placeholder="Введите текст"
        />
      </div>

      <div className="filter-group">
        <label>Диапазон дат удаления:</label>
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

      {!purgeDisabled && (
        <button
          onClick={onPurgeAll}
          className="custom_button_long action-remove"
        >
          Очистить корзину
        </button>
      )}
    </div>
  );
};

TrashFilters.propTypes = {
  filters: PropTypes.shape({
    search: PropTypes.string,
    dateRange: PropTypes.arrayOf(PropTypes.instanceOf(Date)),
  }).isRequired,
  onFilterChange: PropTypes.func.isRequired,
  onClear: PropTypes.func.isRequired,
  onPurgeAll: PropTypes.func.isRequired,
  purgeDisabled: PropTypes.bool.isRequired,
};

export default React.memo(TrashFilters);
