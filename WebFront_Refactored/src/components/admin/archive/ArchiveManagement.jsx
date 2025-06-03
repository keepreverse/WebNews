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
  const openLightbox = (item, idx) => {
    if (!item.files?.length) return;
    setLightboxSlides(
      item.files.map((file) => ({
        src: `https://webnews-1fwz.onrender.com/uploads/${file.fileName}`,
        alt: `Изображение новости ${item.newsID}`,
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
          currentPageItems.map((item, idx) => (
            <div key={item.newsID} className="data-item">
              <h2>{item.title}</h2>
              <div className="news-description">
                {HTMLReactParser(item.description)}
              </div>
              <div className="news-meta">
                {item.publisher_nick && (
                  <p>
                    <strong>Автор:</strong> {item.publisher_nick}
                  </p>
                )}
                {item.create_date && (
                  <p>
                    <strong>Дата создания:</strong>{" "}
                    {new Date(item.create_date).toLocaleDateString("ru-RU", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                    ,{" "}
                    {new Date(item.create_date).toLocaleTimeString(
                      "ru-RU",
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                      }
                    )}
                  </p>
                )}
                {item.publish_date && (
                  <p>
                    <strong>Дата публикации:</strong>{" "}
                    {new Date(item.publish_date).toLocaleDateString("ru-RU", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                    ,{" "}
                    {new Date(item.publish_date).toLocaleTimeString(
                      "ru-RU",
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                      }
                    )}
                  </p>
                )}
                {item.files?.length > 0 && (
                  <Gallery
                    files={item.files}
                    onImageClick={(i) => openLightbox(item, i)}
                  />
                )}
              </div>
              <div className="moderation-actions">
                {/* Восстановить (только статус → Approved) */}
                <button
                  onClick={() => restoreNews(item.newsID)}
                  className="custom_button_short action-confirm"
                >
                  Восстановить
                </button>

                {/* Исправить (рестор+релокация в редактор) */}
                <button
                  onClick={() => restoreEditNews(item.newsID)}
                  className="custom_button_short action-options"
                >
                  Исправить
                </button>

                {/* Удалить → в корзину */}
                <button
                  onClick={() => deleteArchiveNews(item.newsID)}
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
