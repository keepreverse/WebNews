import React from "react";
import PropTypes from "prop-types";
import Flatpickr from "react-flatpickr";
import { Russian } from "flatpickr/dist/l10n/ru.js";
import "flatpickr/dist/flatpickr.min.css";

const NewsFilters = ({
  uniqueAuthors,
  filters,
  onFilterChange,
  onClear,
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
        <label htmlFor="search">Поиск по новостям:</label>
        <input
          id="search"
          type="text"
          placeholder="Поиск по заголовку или описанию"
          value={filters.searchQuery || ""}
          onChange={(e) => onFilterChange("searchQuery", e.target.value)}
        />
      </div>

      <div className="filter-group">
        <label>Фильтр по автору:</label>
        <select
          value={filters.author || ""}
          onChange={(e) => {
            onFilterChange("author", e.target.value);
          }}
        >
          <option value="">Все авторы</option>
          {uniqueAuthors.map((author) => (
            <option key={author} value={author}>
              {author}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label>Диапазон дат событий:</label>
        <Flatpickr
          options={configFlatpickr}
          value={filters.dateRange}
          placeholder="Выберите даты"
          className="date-picker"
        />
      </div>

      <button
        onClick={onClear}
        className="custom_button_long"
        disabled={
          !filters.author && !filters.dateRange[0] && !filters.searchQuery
        }
        aria-label="Сбросить фильтры"
      >
        Сбросить фильтры
      </button>
    </div>
  );
};

NewsFilters.propTypes = {
  uniqueAuthors: PropTypes.arrayOf(PropTypes.string).isRequired,
  filters: PropTypes.shape({
    author: PropTypes.string,
    dateRange: PropTypes.arrayOf(PropTypes.instanceOf(Date)),
    searchQuery: PropTypes.string,
  }).isRequired,
  onFilterChange: PropTypes.func.isRequired,
  onClear: PropTypes.func.isRequired,
};

export default React.memo(NewsFilters);
