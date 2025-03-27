import React, { useEffect, useState, useMemo, useCallback } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import PageWrapper from "./PageWrapper";
import HTMLReactParser from "html-react-parser";
import Lightbox from "react-image-lightbox";
import "react-image-lightbox/style.css";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/flatpickr.min.css";
import { Russian } from "flatpickr/dist/l10n/ru.js";

function NewsList() {
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const newsPerPage = 5;

  // Фильтры
  const [authorFilter, setAuthorFilter] = useState("");
  const [dateRange, setDateRange] = useState([null, null]); // Теперь храним диапазон дат
  const [uniqueAuthors, setUniqueAuthors] = useState([]);

  // Lightbox State
  const [isOpen, setIsOpen] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [currentImages, setCurrentImages] = useState([]);

  // Конфигурация Flatpickr для диапазона дат
  const configFlatpickr = useMemo(() => ({
    mode: "range", // Включаем режим диапазона
    altInput: true,
    altFormat: "F j, Y",
    dateFormat: "Y-m-d",
    locale: Russian,
  }), []);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("http://127.0.0.1:5000/api/news");
        if (!response.ok) {
          if (response.status === 404) {
            toast.warn("Новости не найдены.");
          } else {
            throw new Error("Ошибка при загрузке данных");
          }
        } else {
          const result = await response.json();
          setData(result);
          setFilteredData(result);
          
          // Получаем уникальных авторов
          const authors = [...new Set(result.map(item => item.publisher_nick).filter(Boolean))];
          setUniqueAuthors(authors);
        }
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
    setCurrentPage(1);
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

  // Добавляем кнопку "Изменить" и обработчик
  const handleEditNews = (newsItem) => {
    // Передаем данные новости через URL
    window.open(`/news-creator?edit=${newsItem.newsID}`, "_blank");
  };


  const deleteNews = useCallback(async (newsID) => {
    if (!window.confirm("Вы уверены, что хотите удалить эту новость?")) return;

    try {
      const response = await fetch(`http://127.0.0.1:5000/api/news/${newsID}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Новость удалена успешно!");
        setData((prevData) => prevData.filter((item) => item.newsID !== newsID));
      } else {
        toast.error("Не удалось удалить новость");
      }
    } catch (error) {
      console.error("Ошибка при удалении новости:", error);
      toast.error("Ошибка при удалении новости");
    }
  }, []);

  const deleteAllNews = useCallback(async () => {
    if (!window.confirm("Вы уверены, что хотите удалить ВСЕ новости?")) return;

    try {
      const response = await fetch("http://127.0.0.1:5000/api/news", {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Все новости удалены успешно!");
        setData([]);
        setCurrentPage(1);
      } else {
        toast.error("Не удалось удалить все новости");
      }
    } catch (error) {
      console.error("Ошибка при удалении всех новостей:", error);
      toast.error("Ошибка при удалении всех новостей");
    }
  }, []);

  const openLightbox = (images, index) => {
    setCurrentImages(images);
    setPhotoIndex(index);
    setIsOpen(true);
  };
  
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      document.body.removeAttribute("aria-hidden"); // Удаляем атрибут
    } else {
      document.body.style.overflow = "auto";
    }
  
    return () => {
      document.body.style.overflow = "auto";
      document.body.removeAttribute("aria-hidden"); // Очистка
    };
  }, [isOpen]);

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
            <label>Фильтр по дате:</label>
              {MemoizedFlatpickr}
          </div>
          
          <button 
            onClick={clearFilters} 
            className="custom_button_mid"
            disabled={!authorFilter && !dateRange[0]}
          >
            Сбросить фильтры
          </button>
        </div>

        {filteredData.length > 0 && (
          <button onClick={deleteAllNews} className="custom_button_mid" id="delete-all">
            Удалить все
          </button>
        )}

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
                          alt={`image-${index}`}
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
                <button onClick={() => deleteNews(item.newsID)} className="custom_button_short" id="delete">
                  Удалить
                </button>
                <button 
                  onClick={() => handleEditNews(item)} 
                  className="custom_button_short" 
                  id="edit"
                >
                  Изменить
                </button>
              </div>
            ))
          )}
        </div>

        {totalPages > 1 && (
          <Pagination totalPages={totalPages} currentPage={currentPage} paginate={setCurrentPage} />
        )}
      </div>
      <ToastContainer />

      {isOpen && (
        <Lightbox
          mainSrc={currentImages[photoIndex]}
          nextSrc={currentImages[(photoIndex + 1) % currentImages.length]}
          prevSrc={currentImages[(photoIndex + currentImages.length - 1) % currentImages.length]}
          onCloseRequest={() => setIsOpen(false)}
          onMovePrevRequest={() => 
            setPhotoIndex((photoIndex + currentImages.length - 1) % currentImages.length)
          }
          onMoveNextRequest={() => 
            setPhotoIndex((photoIndex + 1) % currentImages.length)
          }
          imageTitle={`Изображение ${photoIndex + 1} из ${currentImages.length}`}
        />
      )}

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
