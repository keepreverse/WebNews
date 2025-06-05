import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import Lightbox from 'yet-another-react-lightbox';
import Fullscreen from 'yet-another-react-lightbox/plugins/fullscreen';
import Thumbnails from 'yet-another-react-lightbox/plugins/thumbnails';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import HTMLReactParser from "html-react-parser";
import NewsFilters from './NewsFilters';
import Gallery from '../../../features/Gallery';
import Pagination from '../../../features/Pagination';
import 'yet-another-react-lightbox/styles.css';
import 'yet-another-react-lightbox/plugins/thumbnails.css';


const NewsModeration = ({
  allNews,
  pendingNews,
  pagination,
  handleModerate,
  handleArchive,
  filters,
  onFilterChange,
  onClearFilters,
  handlePageChange
}) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxSlides, setLightboxSlides] = useState([]);

  // Уникальные авторы из всех новостей (не отфильтрованных)
  const uniqueAuthors = useMemo(() => 
    [...new Set(allNews.map(n => n.publisher_nick).filter(Boolean))], 
    [allNews]
  );

  const currentNews = useMemo(() => {
    const start = (pagination.currentPage - 1) * pagination.perPage;
    return pendingNews.slice(start, start + pagination.perPage);
  }, [pendingNews, pagination]);

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
      <NewsFilters
        uniqueAuthors={uniqueAuthors}
        filters={filters}
        onFilterChange={onFilterChange}
        onClear={onClearFilters}
      />

      <Pagination
        totalPages={pagination.totalPages}
        currentPage={pagination.currentPage}
        paginate={handlePageChange}
        totalItems={pagination.totalItems}
      />

      <div className="data-list">
        {currentNews?.length === 0 ? (
          <p>Нет новостей на модерации</p>
        ) : currentNews?.map((news, index) => (
          <div key={news.newsID} className="data-item">
            <h2>{news.title}</h2>
            <div className="news-description">{HTMLReactParser(news.description)}</div>
            
            <div className="news-meta">
              {news.publisher_nick && <p><strong>Автор:</strong> {news.publisher_nick}</p>}
              
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

              {news.event_start && (
                <p>
                  <strong>Дата события:</strong>{" "}
                  {(() => {
                    const startDate = new Date(news.event_start);
                    const endDate = news.event_end ? new Date(news.event_end) : null;

                    const formatDate = date =>
                      date.toLocaleDateString("ru-RU", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      });

                    const formatTime = date =>
                      date.toLocaleTimeString("ru-RU", {
                        hour: "2-digit",
                        minute: "2-digit",
                      });

                    // Если есть endDate и она отличается от startDate по дате или времени
                    if (
                      endDate &&
                      (startDate.getTime() !== endDate.getTime())
                    ) {
                      return (
                        <>
                          {formatDate(startDate)}, {formatTime(startDate)} –{" "}
                          {formatDate(endDate)}, {formatTime(endDate)}
                        </>
                      );
                    }

                    // Иначе выводим только одну дату и время
                    return (
                      <>
                        {formatDate(startDate)}, {formatTime(startDate)}
                      </>
                    );
                  })()}
                </p>
              )}

              {news.files?.length > 0 && (
                <Gallery 
                  files={news.files}
                  onImageClick={(index) => handleOpenLightbox(news, index)}
                />
              )}
            </div>

            <div className="moderation-actions">
              <button onClick={() => handleModerate(news.newsID, 'approve')} className="custom_button_short approve">
                Одобрить
              </button>
              <button onClick={() => handleModerate(news.newsID, 'reject')} className="custom_button_short reject">
                Отклонить
              </button>
              <button onClick={() => handleArchive(news.newsID)} className="custom_button_short archive">
                В архив
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
          maxZoomPixelRatio: 2, // Максимальный уровень увеличения
          zoomInMultiplier: 1.5,  // Множитель увеличения
          scrollToZoom: true    // Включить зум скроллом
        }}
      />
    </>
  );
};

NewsModeration.propTypes = {
  allNews: PropTypes.array.isRequired,
  pendingNews: PropTypes.array.isRequired,
  pagination: PropTypes.object.isRequired,
  handleModerate: PropTypes.func.isRequired,
  handleArchive: PropTypes.func.isRequired,
  filters: PropTypes.object.isRequired,
  onFilterChange: PropTypes.func.isRequired,
  onClearFilters: PropTypes.func.isRequired,
  handlePageChange: PropTypes.func.isRequired
};

export default React.memo(NewsModeration);