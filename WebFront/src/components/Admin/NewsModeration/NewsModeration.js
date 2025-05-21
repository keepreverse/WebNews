import React, { useState, useMemo } from 'react';
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
  pendingNews,
  currentPage,
  newsPerPage,
  newsTotalPages,
  setCurrentPage,
  handleModerate,
  handleArchive,
  filters,
  onFilterChange,
  onClearFilters
}) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxSlides, setLightboxSlides] = useState([]);

  const filteredNews = useMemo(() => {
    let result = [...pendingNews];
    
    if (filters.author) {
      result = result.filter(item => item.publisher_nick === filters.author);
    }

    if (filters.dateRange[0] && filters.dateRange[1]) {
      const [startDate, endDate] = filters.dateRange;
      const filterStart = new Date(startDate).setHours(0, 0, 0, 0);
      const filterEnd = new Date(endDate).setHours(23, 59, 59, 999);

      result = result.filter(item => {
        const itemDate = new Date(item.event_start).getTime();
        return itemDate >= filterStart && itemDate <= filterEnd;
      });
    }
    
    return result;
  }, [pendingNews, filters]);

  const currentNews = useMemo(() => {
    const indexOfLastNews = currentPage * newsPerPage;
    return filteredNews.slice(indexOfLastNews - newsPerPage, indexOfLastNews);
  }, [filteredNews, currentPage, newsPerPage]);

  const handleOpenLightbox = (newsItem, index) => {
    if (!newsItem.files || newsItem.files.length === 0) return;
    
    const slides = newsItem.files.map(file => ({
      src: `http://127.0.0.1:5000/uploads/${file.fileName}`,
      alt: `Изображение новости ${newsItem.newsID}`
    }));

    setLightboxSlides(slides);
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  return (
    <>
      <NewsFilters
        uniqueAuthors={[...new Set(pendingNews.map(n => n.publisher_nick).filter(Boolean))]}
        filters={filters}
        onAuthorChange={(e) => onFilterChange('author', e.target.value)}
        onDateChange={(dates) => onFilterChange('dateRange', dates)}
        onClear={onClearFilters}
      />

      {newsTotalPages > 1 && (
        <Pagination
          totalPages={Math.ceil(filteredNews.length / newsPerPage)}
          currentPage={currentPage}
          paginate={setCurrentPage}
        />
      )}

    <div className="data-list">
    {currentNews.length === 0 ? (
        <p>Нет новостей на модерации</p>
    ) : currentNews.map((news, index) => (

        <div key={news.newsID} className="data-item">
        <h2>{news.title}</h2>
        <div className="news-description">{HTMLReactParser(news.description)}</div>
        
        <div className="news-meta">
            {news.publisher_nick && (
            <p><strong>Автор:</strong> {news.publisher_nick}</p>
            )}
            
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

            {news.event_end && (
            <p>
                <strong>Дата окончания:</strong>{" "}
                {new Date(news.event_end).toLocaleDateString("ru-RU", {
                year: "numeric",
                month: "long",
                day: "numeric",
                })}
                {", "}
                {new Date(news.event_end).toLocaleTimeString("ru-RU", {
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
            <button 
            onClick={() => handleModerate(news.newsID, 'approve')}
            className="custom_button_short approve"
            >
            Одобрить
            </button>
            <button 
            onClick={() => handleModerate(news.newsID, 'reject')}
            className="custom_button_short reject"
            >
            Отклонить
            </button>
            <button
            onClick={() => handleArchive(news.newsID)}
            className="custom_button_short archive"
            >
            В архив
            </button>
        </div>
        </div>
    ))}
    </div>

      {newsTotalPages > 1 && (
        <Pagination
          totalPages={Math.ceil(filteredNews.length / newsPerPage)}
          currentPage={currentPage}
          paginate={setCurrentPage}
        />
      )}

      <Lightbox
        open={lightboxOpen}
        close={() => setLightboxOpen(false)}
        index={lightboxIndex}
        slides={lightboxSlides}
        plugins={[Fullscreen, Thumbnails, Zoom]}
        animation={{ fade: 300 }}
        controller={{ closeOnBackdropClick: true }}
          styles={{
            container: { backgroundColor: "rgba(0, 0, 0, 0.8)" },
            thumbnail: {
              backgroundColor: "rgba(0, 0, 0, 0.5)",
            },
            thumbnailsContainer: {
              backgroundColor: "rgba(0, 0, 0, 0.8)",
            },
          }}
          thumbnails={{
            vignette: false,
          }}
          zoom={{
            maxZoomPixelRatio: 2,
            zoomInMultiplier: 1.2,
            scrollToZoom: true
          }}
        />
    </>
  );
};

NewsModeration.propTypes = {
  pendingNews: PropTypes.arrayOf(
    PropTypes.shape({
      newsID: PropTypes.number.isRequired,
      title: PropTypes.string.isRequired,
      description: PropTypes.string.isRequired,
      publisher_nick: PropTypes.string,
      event_start: PropTypes.string.isRequired,
      files: PropTypes.arrayOf(
        PropTypes.shape({
          fileName: PropTypes.string.isRequired
        })
      )
    })
  ).isRequired,
  currentPage: PropTypes.number.isRequired,
  newsPerPage: PropTypes.number.isRequired,
  newsTotalPages: PropTypes.number.isRequired,
  setCurrentPage: PropTypes.func.isRequired,
  handleModerate: PropTypes.func.isRequired,
  handleArchive: PropTypes.func.isRequired,
  filters: PropTypes.shape({
    author: PropTypes.string,
    dateRange: PropTypes.arrayOf(PropTypes.instanceOf(Date))
  }).isRequired,
  onFilterChange: PropTypes.func.isRequired,
  onClearFilters: PropTypes.func.isRequired
};

export default React.memo(NewsModeration);