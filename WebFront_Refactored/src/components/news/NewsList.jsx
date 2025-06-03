// src/components/news/NewsList.jsx
import React, { useMemo, useState } from 'react';
import PropTypes from "prop-types";
import Lightbox from 'yet-another-react-lightbox';
import Fullscreen from 'yet-another-react-lightbox/plugins/fullscreen';
import Thumbnails from 'yet-another-react-lightbox/plugins/thumbnails';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import HTMLReactParser from "html-react-parser";
import NewsFilters from "../../components/admin/news/NewsFilters";
import NewsGallery from "../../features/Gallery";
import Pagination from "../../features/Pagination";
import { translateRole } from '../../utils/helpers';

import 'yet-another-react-lightbox/styles.css';
import 'yet-another-react-lightbox/plugins/thumbnails.css';

const NewsList = ({
  currentUser,
  allNews,
  filteredNews,
  currentNews,
  pagination,
  filters,
  onFilterChange,
  onClearFilters,
  onDeleteNews,
  onDeleteAllNews,
  onEditNews,
  onPageChange
}) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxSlides, setLightboxSlides] = useState([]);

  // Собираем уникальных авторов из всех новостей (для фильтра)
  const uniqueAuthors = useMemo(
    () =>
      Array.from(
        new Set(allNews.map((item) => item.publisher_nick).filter(Boolean))
      ),
    [allNews]
  );

  const handleOpenLightbox = (newsItem, index) => {
    if (!newsItem.files?.length) return;
    
    setLightboxSlides(newsItem.files.map(file => ({
      src: `https://webnews-1fwz.onrender.com/uploads/${file.fileName}`,
      alt: `Изображение новости ${newsItem.newsID}`
    })));
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  return (
    <>
      {/* 1. Секция “Информация о пользователе” */}
      {currentUser && (
        <div className="user-info">
          <p>
            Текущий пользователь: {currentUser.nickname} (
            {currentUser.login})
          </p>
          <p>Роль: {translateRole(currentUser.role)}</p>
          <p>
            Доступные действия:
            {(currentUser.role === "Administrator" ||
              currentUser.role === "Moderator") &&
              " Удаление, Редактирование"}
            {currentUser.role === "Publisher" && " Просмотр"}
          </p>
        </div>
      )}

      {/* 2. Фильтры */}

      {/* 2.1 Поиск по тексту + фильтр по автору + диапазон дат */}
      <NewsFilters
        uniqueAuthors={uniqueAuthors}
        filters={filters}
        onFilterChange={onFilterChange}
        onClear={onClearFilters}
      />
      
      {/* 2.2 Кнопка “Удалить все” (для админа/модератора, если есть хотя бы одна отфильтрованная) */}
      <div className="filters-container" style={{ padding: '0 0 12px 0' }}>
        {filteredNews.length > 0 && (
          <button
            onClick={onDeleteAllNews}
            className="custom_button_long action-remove"
          >
            Удалить все новости
          </button>
        )}
      </div>

      <Pagination
        totalPages={pagination.totalPages}
        currentPage={pagination.currentPage}
        paginate={onPageChange}
        totalItems={pagination.totalItems}
      />

      {/* 4. Список карточек новостей */}
      <div className="data-list">
        {currentNews.length === 0 ? (
          <p>Публикации не найдены</p>
        ) : (
          currentNews.map((item) => (
            <div key={item.newsID} className="data-item">
              <h2>{item.title}</h2>
              <div className="news-description">
                {HTMLReactParser(item.description)}
              </div>
              {item.publisher_nick && (
                <p>
                  <strong>Автор:</strong> {item.publisher_nick}
                </p>
              )}
              {item.event_start && (
                <p>
                  <strong>Дата события:</strong>{" "}
                  {new Date(item.event_start).toLocaleDateString(
                    "ru-RU",
                    {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    }
                  )}
                  {", "}
                  {new Date(item.event_start).toLocaleTimeString(
                    "ru-RU",
                    {
                      hour: "2-digit",
                      minute: "2-digit",
                    }
                  )}
                </p>
              )}
              {/* Количество фотографий */}
              {item.files?.length > 0 && (
                <p>
                  <strong>Количество фотографий:</strong>{" "}
                  {item.files.length}
                </p>
              )}

              {item.files?.length > 0 && (
                <NewsGallery 
                  files={item.files}
                  onImageClick={(index) => handleOpenLightbox(item, index)}
                />
              )}

                <div className="list-actions">
                  <button
                    onClick={() => onEditNews(item)}
                    className="custom_button_short action-options"
                  >
                    Редактировать
                  </button>
                  <button
                    onClick={() => onDeleteNews(item.newsID)}
                    className="custom_button_short action-remove"
                  >
                    Удалить
                  </button>
                </div>
            </div>
          ))
        )}
      </div>

      <Pagination
        totalPages={pagination.totalPages}
        currentPage={pagination.currentPage}
        paginate={onPageChange}
        totalItems={pagination.totalItems}
      />

      <Lightbox
        open={lightboxOpen}
        close={() => setLightboxOpen(false)}
        index={lightboxIndex}
        slides={lightboxSlides}
        plugins={[Fullscreen, Thumbnails, Zoom]}
        styles={{
          container: { backgroundColor: "rgba(0, 0, 0, 0.8)" },
          thumbnail: {
            backgroundColor: "rgba(0, 0, 0, 0.5)",
          },
          thumbnailsContainer: {
            backgroundColor: "rgba(0, 0, 0, 0.8)",
          },
          icon: {
            color: "rgba(255, 255, 255, 0.7)",
            filter: "drop-shadow(0 0 2px rgba(0, 0, 0, 0.5))",
          },
          iconDisabled: {
            color: "rgba(255, 255, 255, 0.3)",
          },
          iconHover: {
            color: "#fff",
            backgroundColor: "rgba(0, 0, 0, 0.3)",
          }
        }}
        thumbnails={{
          vignette: false,
        }}
        zoom={{
          maxZoomPixelRatio: 2, // Максимальный уровень увеличения
          zoomInMultiplier: 1.5,  // Множитель увеличения
          scrollToZoom: true    // Включить зум скроллом
        }}
      />

    </>
  );
};

NewsList.propTypes = {
  currentUser: PropTypes.shape({
    login: PropTypes.string,
    nickname: PropTypes.string,
    role: PropTypes.string,
  }),
  allNews: PropTypes.array.isRequired,
  filteredNews: PropTypes.array.isRequired,
  currentNews: PropTypes.array.isRequired,
  pagination: PropTypes.shape({
    currentPage: PropTypes.number.isRequired,
    perPage: PropTypes.number.isRequired,
    totalItems: PropTypes.number.isRequired,
    totalPages: PropTypes.number.isRequired,
  }).isRequired,
  filters: PropTypes.shape({
    author: PropTypes.string,
    dateRange: PropTypes.array,
    searchQuery: PropTypes.string,
  }).isRequired,
  onFilterChange: PropTypes.func.isRequired,
  onClearFilters: PropTypes.func.isRequired,
  onDeleteNews: PropTypes.func.isRequired,
  onDeleteAllNews: PropTypes.func.isRequired,
  onEditNews: PropTypes.func.isRequired,
  onPageChange: PropTypes.func.isRequired,
  onOpenLightbox: PropTypes.func.isRequired,
  onCloseLightbox: PropTypes.func.isRequired,
  lightboxOpen: PropTypes.bool.isRequired,
  lightboxIndex: PropTypes.number.isRequired,
  lightboxSlides: PropTypes.array.isRequired,
};

export default React.memo(NewsList);
