import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import Lightbox from 'yet-another-react-lightbox';
import Fullscreen from 'yet-another-react-lightbox/plugins/fullscreen';
import Thumbnails from 'yet-another-react-lightbox/plugins/thumbnails';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import HTMLReactParser from "html-react-parser";
import NewsFilters from './NewsFilters';
import NewsGallery from './NewsGallery';
import Pagination from '../Pagination';
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
  onPageChange
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
      src: `http://127.0.0.1:5000/uploads/${file.fileName}`,
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
        paginate={onPageChange}
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
              
              {news.event_start && (
                <p>
                  <strong>Дата события:</strong>{" "}
                  {new Date(news.event_start).toLocaleDateString("ru-RU", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                  {", "}
                  {new Date(news.event_start).toLocaleTimeString("ru-RU", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              )}

              {news.files?.length > 0 && (
                <NewsGallery 
                  files={news.files}
                  onImageClick={() => handleOpenLightbox(news, index)}
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
        paginate={onPageChange}
        totalItems={pagination.totalItems}
      />

      <Lightbox
        open={lightboxOpen}
        close={() => setLightboxOpen(false)}
        index={lightboxIndex}
        slides={lightboxSlides}
        plugins={[Fullscreen, Thumbnails, Zoom]}
        animation={{ fade: 300 }}
        controller={{ closeOnBackdropClick: true }}
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
  onPageChange: PropTypes.func.isRequired
};

export default React.memo(NewsModeration);