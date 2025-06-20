// src/components/admin/archive/ArchiveManagement.jsx

import React, { useMemo, useState } from "react";
import Lightbox from "yet-another-react-lightbox";
import Fullscreen from "yet-another-react-lightbox/plugins/fullscreen";
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import HTMLReactParser from "html-react-parser";
import Pagination from "../../../features/Pagination";
import Gallery from "../../../features/Gallery";
import ArchiveFilters from "./ArchiveFilters";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/thumbnails.css";

const ArchiveManagement = ({
  archive = [],
  allArchive = [],
  pagination,
  filters,
  onFilterChange,
  onClearFilters,
  handlePageChange,
  restoreNews,
  restoreEditNews,
  deleteArchiveNews,
  deleteArchive,
}) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxSlides, setLightboxSlides] = useState([]);

  // 1) вычисляем элементы для текущей страницы (pagination)
  const currentPageItems = useMemo(() => {
    const start = (pagination.currentPage - 1) * pagination.perPage;
    return archive.slice(start, start + pagination.perPage);
  }, [archive, pagination]);

  // 2) функция открытия лайтбокса
  const openLightbox = (news, idx) => {
    if (!news.files?.length) return;
    setLightboxSlides(
      news.files.map((file) => ({
        src: `http://127.0.0.1:5000/uploads/${file.fileName}`,
        alt: `Изображение новости ${news.newsID}`,
      }))
    );
    setLightboxIndex(idx);
    setLightboxOpen(true);
  };

  return (
    <>
      {/* 1. Фильтры */}
      <ArchiveFilters
        filters={filters}
        onFilterChange={onFilterChange}
        onClear={onClearFilters}
        onPurgeAll={deleteArchive}
        purgeDisabled={allArchive.length === 0}
      />

      {/* 2. Верхняя пагинация */}
      {pagination.totalPages > 1 && (
        <Pagination
          totalPages={pagination.totalPages}
          currentPage={pagination.currentPage}
          paginate={handlePageChange}
          totalItems={pagination.totalItems}
        />
      )}

      {/* 3. Список элементов */}
      <div className="data-list">
        {currentPageItems.length === 0 ? (
          <p>Архив пуст</p>
        ) : (
          currentPageItems.map((news, idx) => (
            <div key={news.newsID} className="data-item">
              <h2>{news.title}</h2>
              <div className="news-description">
                {HTMLReactParser(news.description)}
              </div>
              <div className="news-meta">
                {news.publisher_nick && (
                  <p>
                    <strong>Автор:</strong> {news.publisher_nick}
                  </p>
                )}

                {news.category_name && <p><strong>Категория:</strong> {news.category_name}</p>} 

                {news.create_date && (
                  <p>
                    <strong>Дата создания:</strong>{" "}
                    {new Date(news.create_date).toLocaleDateString("ru-RU", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                    ,{" "}
                    {new Date(news.create_date).toLocaleTimeString(
                      "ru-RU",
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                      }
                    )}
                  </p>
                )}
                {news.archive_date && (
                  <p>
                    <strong>Дата архивации:</strong>{" "}
                    {new Date(news.archive_date).toLocaleDateString("ru-RU", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                    ,{" "}
                    {new Date(news.archive_date).toLocaleTimeString(
                      "ru-RU",
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                      }
                    )}
                  </p>
                )}

                {news.files?.length > 0 && (
                  <Gallery
                    files={news.files}
                    onImageClick={(i) => openLightbox(news, i)}
                  />
                )}
              </div>
              <div className="moderation-actions">
                {/* Восстановить (только статус → Approved) */}
                <button
                  onClick={() => restoreNews(news.newsID)}
                  className="custom_button_short action-confirm"
                >
                  Восстановить
                </button>

                {/* Исправить (рестор+релокация в редактор) */}
                <button
                  onClick={() => restoreEditNews(news.newsID)}
                  className="custom_button_short action-options"
                >
                  Исправить
                </button>

                {/* Удалить → в корзину */}
                <button
                  onClick={() => deleteArchiveNews(news.newsID)}
                  className="custom_button_short action-remove"
                >
                  Удалить
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 4. Нижняя пагинация */}
      {pagination.totalPages > 1 && (
        <Pagination
          totalPages={pagination.totalPages}
          currentPage={pagination.currentPage}
          paginate={handlePageChange}
          totalItems={pagination.totalItems}
        />
      )}

      {/* 5. Lightbox */}
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

export default React.memo(ArchiveManagement);
