import React from 'react';
import PropTypes from 'prop-types';
import Flatpickr from 'react-flatpickr';
import { Russian } from 'flatpickr/dist/l10n/ru.js';
import 'flatpickr/dist/flatpickr.min.css';

const NewsFilters = ({
  uniqueAuthors,
  filters,
  onAuthorChange,
  onDateChange,
  onClear
}) => {
  const datePickerConfig = {
    mode: "range",
    altInput: true,
    altFormat: "F j, Y",
    dateFormat: "Y-m-d",
    locale: Russian,
    onChange: (dates) => onDateChange(dates)
  };

  return (
    <div className="filters-container news-filters">
      <div className="filter-group">
        <label htmlFor="news-author-filter">Фильтр по автору:</label>
        <select
          id="news-author-filter"
          value={filters.author || ''}
          onChange={onAuthorChange}
          className="author-select"
        >
          <option value="">Все авторы</option>
          {uniqueAuthors.map(author => (
            <option key={author} value={author}>
              {author}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label htmlFor="news-date-filter">Диапазон дат события:</label>
        <Flatpickr
          options={datePickerConfig}
          value={filters.dateRange}
          placeholder="Выберите период"
          className="date-picker"
        />
      </div>

      <button
        onClick={onClear}
        className="custom_button_long"
        disabled={!filters.author && !filters.dateRange[0]}
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
    dateRange: PropTypes.arrayOf(PropTypes.instanceOf(Date))
  }).isRequired,
  onAuthorChange: PropTypes.func.isRequired,
  onDateChange: PropTypes.func.isRequired,
  onClear: PropTypes.func.isRequired
};

export default React.memo(NewsFilters);