import React, { useMemo, useState } from 'react';
import Lightbox from 'yet-another-react-lightbox';
import Fullscreen from 'yet-another-react-lightbox/plugins/fullscreen';
import Thumbnails from 'yet-another-react-lightbox/plugins/thumbnails';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import HTMLReactParser from "html-react-parser";
import Pagination from '../../../features/Pagination';
import NewsGallery from './TrashGallery';
import 'yet-another-react-lightbox/styles.css';
import 'yet-another-react-lightbox/plugins/thumbnails.css';

const TrashManagement = ({
  deletedNews,
  restoreNews,
  purgeNews,
  purgeAllNews,
  pagination,
  handlePageChange
}) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxSlides, setLightboxSlides] = useState([]);

  const currentNews = useMemo(() => {
    const start = (pagination.currentPage - 1) * pagination.perPage;
    return deletedNews.slice(start, start + pagination.perPage);
  }, [deletedNews, pagination]);

  const handleOpenLightbox = (newsItem, index) => {
    if (!newsItem.files?.length) return;
    
    setLightboxSlides(newsItem.files.map(file => ({
      src: `http://127.0.0.1:5000/uploads/${file.fileName}`,
      alt: `Изображение новости ${newsItem.newsID}`
    })));
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  return (
    <>
      <div className="filters-container">
        <button 
          onClick={purgeAllNews}
          className="custom_button_long action-remove"
          disabled={deletedNews.length === 0}
        >
          Очистить всю корзину
        </button>
      </div>

      <Pagination
        totalPages={pagination.totalPages}
        currentPage={pagination.currentPage}
        paginate={handlePageChange}
        totalItems={pagination.totalItems}
      />

      <div className="data-list">
        {currentNews.length === 0 ? (
          <p>Корзина пуста</p>
        ) : currentNews.map((news, index) => (
          <div key={news.newsID} className="data-item">
            <h2>{news.title}</h2>
            <div className="news-description">{HTMLReactParser(news.description)}</div>
              
            <div className="news-meta">
              {news.publisher_nick && <p><strong>Автор:</strong> {news.publisher_nick}</p>}
              

              {news?.event_start && (
                <p>
                  <strong>Дата создания:</strong>{" "}
                  {new Date(news.create_date).toLocaleDateString("ru-RU", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                  {", "}
                  {new Date(news.create_date).toLocaleTimeString("ru-RU", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              )}

              {news?.delete_date && (
                <p>
                  <strong>Дата удаления:</strong>{" "}
                  {new Date(news.delete_date).toLocaleDateString("ru-RU", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                  {", "}
                  {new Date(news.delete_date).toLocaleTimeString("ru-RU", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              )}
              {news.files?.length > 0 && (
                <NewsGallery 
                  files={news.files}
                  onImageClick={(index) => handleOpenLightbox(news, index)}
                />
              )}
            </div>

            <div className="moderation-actions">
              <button 
                onClick={() => restoreNews(news.newsID)}
                className="custom_button_short action-confirm"
              >
                Восстановить
              </button>
              <button 
                onClick={() => restoreNews(news.newsID)}
                className="custom_button_short action-options"
              >
                Восстановить с правками
              </button>
              <button 
                onClick={() => purgeNews(news.newsID)}
                className="custom_button_short action-remove"
              >
                Удалить
              </button>
            </div>
          </div>
        ))}
      </div>

      <Pagination
        totalPages={pagination.totalPages}
        currentPage={pagination.currentPage}
        paginate={handlePageChange}
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
          maxZoomPixelRatio: 4, // Максимальный уровень увеличения
          zoomInMultiplier: 1.2,  // Множитель увеличения
          scrollToZoom: true    // Включить зум скроллом
        }}
      />
    </>
  );
};

export default React.memo(TrashManagement);
