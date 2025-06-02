// src/components/admin/trash/TrashManagement.jsx
import React, { useMemo, useState } from "react";
import Lightbox from "yet-another-react-lightbox";
import Fullscreen from "yet-another-react-lightbox/plugins/fullscreen";
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import HTMLReactParser from "html-react-parser";
import Pagination from "../../../features/Pagination";
import Gallery from "../../../features/Gallery";
import TrashFilters from "./TrashFilters";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/thumbnails.css";

const TrashManagement = ({
  trash = [],  
  allTrash = [],     
  pagination,
  filters,
  handleFilterChange,
  handlePageChange,
  restoreNews,
  restoreEditNews,
  purgeSingleNews,
  purgeTrash,
}) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxSlides, setLightboxSlides] = useState([]);

  // 1) текущие элементы (pagination)
  const currentPageItems = useMemo(() => {
    const start = (pagination.currentPage - 1) * pagination.perPage;
    return trash.slice(start, start + pagination.perPage);
  }, [trash, pagination]);

  // 2) открытие лайтбокса
  const openLightbox = (item, idx) => {
    if (!item.files?.length) return;
    setLightboxSlides(
      item.files.map((file) => ({
        src: `http://127.0.0.1:5000/uploads/${file.fileName}`,
        alt: `Изображение новости ${item.newsID}`,
      }))
    );
    setLightboxIndex(idx);
    setLightboxOpen(true);
  };

  return (
    <>
      {/* 1. Фильтры */}
      <TrashFilters
        searchFilter={filters.search}
        dateRange={filters.dateRange}
        onSearchChange={(val) => handleFilterChange("search", val)}
        onDateChange={(dates) => handleFilterChange("dateRange", dates)}
        onClear={() => {
          handleFilterChange("search", "");
          handleFilterChange("dateRange", [null, null]);
        }}
        onPurgeAll={purgeTrash}
        purgeDisabled={allTrash.length === 0}
      />

      {/* 2. Верхняя пагинация */}
      {pagination.totalPages > 1 && (
        <Pagination
          totalPages={pagination.totalPages}
          currentPage={pagination.currentPage}
          paginate={(p) => handlePageChange(p, trash.length)}
          totalItems={pagination.totalItems}
        />
      )}

      {/* 3. Список */}
      <div className="data-list">
        {currentPageItems.length === 0 ? (
          <p>Корзина пуста</p>
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
                    {new Date(item.create_date).toLocaleTimeString("ru-RU", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                )}
                {item.delete_date && (
                  <p>
                    <strong>Дата удаления:</strong>{" "}
                    {new Date(item.delete_date).toLocaleDateString("ru-RU", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                    ,{" "}
                    {new Date(item.delete_date).toLocaleTimeString("ru-RU", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
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
                <button
                  onClick={() => restoreNews(item.newsID)}
                  className="custom_button_short action-confirm"
                >
                  Восстановить
                </button>
                <button
                  onClick={() => restoreEditNews(item.newsID)}
                  className="custom_button_short action-options"
                >
                  Исправить
                </button>
                <button
                  onClick={() => purgeSingleNews(item.newsID)}
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
          paginate={(p) => handlePageChange(p, trash.length)}
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
          thumbnail: { backgroundColor: "rgba(0, 0, 0, 0.5)" },
          thumbnailsContainer: { backgroundColor: "rgba(0, 0, 0, 0.8)" },
          icon: {
            color: "rgba(255, 255, 255, 0.7)",
            filter: "drop-shadow(0 0 2px rgba(0, 0, 0, 0.5))",
          },
          iconDisabled: { color: "rgba(255, 255, 255, 0.3)" },
          iconHover: { color: "#fff", backgroundColor: "rgba(0, 0, 0, 0.3)" },
        }}
        thumbnails={{ vignette: false }}
        zoom={{
          maxZoomPixelRatio: 4,
          zoomInMultiplier: 1.2,
          scrollToZoom: true,
        }}
      />
    </>
  );
};

export default React.memo(TrashManagement);
