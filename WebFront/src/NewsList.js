import React, { useEffect, useState, useMemo, useCallback } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import PageWrapper from "./PageWrapper";
import HTMLReactParser from "html-react-parser";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/flatpickr.min.css";
import { Russian } from "flatpickr/dist/l10n/ru.js";

import Lightbox from "yet-another-react-lightbox";
import Fullscreen from "yet-another-react-lightbox/plugins/fullscreen";
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/plugins/thumbnails.css";
import "yet-another-react-lightbox/styles.css";

import { api } from './apiClient';

function NewsList() {

  const [currentUser, setCurrentUser] = useState(null);

  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const newsPerPage = 5;

  // Фильтры
  const [authorFilter, setAuthorFilter] = useState("");
  const [dateRange, setDateRange] = useState([null, null]); // Теперь храним диапазон дат
  const [uniqueAuthors, setUniqueAuthors] = useState([]);

  // Lightbox State
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxSlides, setLightboxSlides] = useState([]);

  // Конфигурация Flatpickr для диапазона дат
  const configFlatpickr = useMemo(() => ({
    mode: "range", // Включаем режим диапазона
    altInput: true,
    altFormat: "F j, Y",
    dateFormat: "Y-m-d",
    locale: Russian,
  }), []);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    setCurrentUser(userData);
  }, []);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await api.get("/api/news");

        // Фильтруем только опубликованные новости
        const publishedNews = result.filter(item => item.status === "Approved");
        setData(publishedNews);
        setFilteredData(publishedNews);
        
        // Получаем уникальных авторов
        const authors = [...new Set(publishedNews.map(item => item.publisher_nick).filter(Boolean))];
        setUniqueAuthors(authors);
      } catch (error) {
        console.error("Ошибка загрузки данных:", error);
        toast.error("Не удалось загрузить данные");
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    let result = [...data];
  
    if (authorFilter) {
      result = result.filter(item => item.publisher_nick === authorFilter);
    }
  
    if (dateRange[0] && dateRange[1]) {
      const [startDate, endDate] = dateRange;
      const filterStartDate = new Date(startDate).setHours(0, 0, 0, 0);
      const filterEndDate = new Date(endDate).setHours(23, 59, 59, 999);
  
      result = result.filter(item => {
        const itemDate = new Date(item.event_start).getTime();
        return itemDate >= filterStartDate && itemDate <= filterEndDate;
      });
    }
  
    setFilteredData(result);
  }, [data, authorFilter, dateRange]);

  // Обработчик изменения даты (теперь работает с диапазоном)
  const handleDateChange = (selectedDates) => {
    setDateRange(selectedDates);
  };

  const clearFilters = () => {
    setAuthorFilter("");
    setDateRange([null, null]);
  };

  // MemoizedFlatpickr с поддержкой диапазона
  const MemoizedFlatpickr = useMemo(() => {
    return (
      <Flatpickr
        options={configFlatpickr}
        onChange={handleDateChange}
        value={dateRange}
        placeholder="Выберите диапазон дат"
      />
    );
  }, [configFlatpickr, dateRange]);
  
  const handleAuthorChange = (e) => {
    setAuthorFilter(e.target.value || "");
  };

  const currentNews = useMemo(() => {
    const indexOfLastNews = currentPage * newsPerPage;
    const indexOfFirstNews = indexOfLastNews - newsPerPage;
    return filteredData.slice(indexOfFirstNews, indexOfLastNews);
  }, [filteredData, currentPage, newsPerPage]);

  const totalPages = Math.ceil(filteredData.length / newsPerPage);

  useEffect(() => {
    if (currentNews.length === 0 && currentPage > 1) {
      setCurrentPage((prev) => Math.max(prev - 1, 1));
    }
  }, [currentNews, currentPage]);

  const handleEditNews = (newsItem) => {
    // Открываем в новом окне с параметром edit
    window.open(`/news-creator?edit=${newsItem.newsID}`, "_blank");
  };

  const deleteNews = useCallback(async (newsID) => {
    try {
      await api.delete(`/api/news/${newsID}`);
      toast.success("Новость удалена успешно!");
      setData((prevData) => prevData.filter((item) => item.newsID !== newsID));
    } catch (error) {
      console.error("Ошибка при удалении новости:", error);
      toast.error(error.message || "Ошибка при удалении новости");
    }
  }, []);
  
  const deleteAllNews = useCallback(async () => {
    if (!window.confirm("Вы уверены, что хотите удалить ВСЕ новости?")) return;
  
    try {
      await api.delete("/api/news");
      toast.success("Все новости удалены успешно!");
      setData([]);
      setCurrentPage(1);
    } catch (error) {
      console.error("Ошибка при удалении всех новостей:", error);
      toast.error(error.message || "Ошибка при удалении всех новостей");
    }
  }, []);

  // Функция для открытия лайтбокса
  const openLightbox = (imageUrls, index) => {
    const slides = imageUrls.map((url, i) => ({
      src: url,
      alt: `Изображение ${i + 1}`,
    }));
    setLightboxSlides(slides);
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  return (
    <PageWrapper>
      <title>Список публикаций</title>
      <div id="data-list-form" className="container">
        <h1>Список публикаций</h1>

        {/* Фильтры */}
        <div className="filters-container">
          <div className="filter-group">
            <label htmlFor="author-filter">Фильтр по автору:</label>
            <select
              id="author-filter"
              value={authorFilter}
              onChange={handleAuthorChange}
            >
              <option value="">Все авторы</option>
              {uniqueAuthors.map(author => (
                <option key={author} value={author}>{author}</option>
              ))}
            </select>
          </div>
          
          <div className="filter-group">
            <label>Фильтр по дате публикации:</label>
              {MemoizedFlatpickr}
          </div>
          
          <button 
            onClick={clearFilters} 
            className="custom_button_mid"
            disabled={!authorFilter && !dateRange[0]}
          >
            Сбросить фильтры
          </button>

          {/* Кнопка "Удалить все" — только для администраторов */}
          {(currentUser?.role === 'Moderator' || currentUser?.role === 'Administrator') && filteredData.length > 0 && (
            <button onClick={deleteAllNews} className="custom_button_mid" id="delete-all">
              Удалить все
            </button>
          )}

        </div>

        {totalPages > 1 && (
          <Pagination totalPages={totalPages} currentPage={currentPage} paginate={setCurrentPage} />
        )}

        <div className="data-list">
          {currentNews.length === 0 ? (
            <p>Публикации не найдены</p>
          ) : (
            currentNews.map((item) => (
              <div key={item.newsID} className="data-item">
                <h2>{item.title}</h2>
                <div className="news-description">{HTMLReactParser(item.description)}</div>
                {item.publisher_nick && (
                  <p>
                    <strong>Автор:</strong> {item.publisher_nick}
                  </p>
                )}
                {item.event_start && (
                  <p>
                    <strong>Дата события:</strong>{" "}
                    {new Date(item.event_start).toLocaleDateString("ru-RU", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                    {", "}
                    {new Date(item.event_start).toLocaleTimeString("ru-RU", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                )}
                {item.files?.length > 0 && (
                  <p>
                    <strong>Количество фотографий:</strong> {item.files.length}
                  </p>
                )}
                {item.files?.length > 0 && (
                  <div className="thumbnail-container">
                    {item.files.map((file, index) => (
                      <div key={index} className="thumbnail">
                        <img
                          src={`http://127.0.0.1:5000/uploads/${file.fileName}`}
                          alt={index}
                          className="data-image"
                          onClick={() =>
                            openLightbox(
                              item.files.map((f) => `http://127.0.0.1:5000/uploads/${f.fileName}`),
                              index
                            )
                          }
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Весь блок действий будет скрыт для Publisher */}
                {(currentUser?.role === 'Administrator' || currentUser?.role === 'Moderator') && (
                  <div className="list-actions">
                    {/* Кнопка "Изменить" — для администраторов и модераторов */}
                    <button 
                      onClick={() => handleEditNews(item)} 
                      className="custom_button_short" 
                      id="edit"
                    >
                      Изменить
                    </button>

                    {/* Кнопка "Удалить" — только для администраторов */}
                    {currentUser?.role === 'Administrator' && (
                      <button 
                        onClick={() => deleteNews(item.newsID)} 
                        className="custom_button_short" 
                        id="delete"
                      >
                        Удалить
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {totalPages > 1 && (
          <Pagination totalPages={totalPages} currentPage={currentPage} paginate={setCurrentPage} />
        )}
      </div>
      <ToastContainer />

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

    </PageWrapper>
  );
}

const Pagination = React.memo(({ totalPages, currentPage, paginate }) => (
  <div className="pagination">
    {Array.from({ length: totalPages }).map((_, index) => (
      <button
        key={index}
        onClick={() => paginate(index + 1)}
        className={`pagination_button ${currentPage === index + 1 ? "active" : ""}`}
      >
        {index + 1}
      </button>
    ))}
  </div>
));

export default NewsList;
