import React, { useEffect, useState, useMemo, useCallback } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import PageWrapper from "./PageWrapper";
import "./styles.css";
import HTMLReactParser from "html-react-parser";
import Lightbox from "react-image-lightbox";
import "react-image-lightbox/style.css";

function NewsList() {
  const [data, setData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const newsPerPage = 5;

  // Lightbox State
  const [isOpen, setIsOpen] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [currentImages, setCurrentImages] = useState([]);

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
        }
      } catch (error) {
        console.error("Ошибка загрузки данных:", error);
        toast.error("Не удалось загрузить данные");
      }
    };

    fetchData();
  }, []);

  const currentNews = useMemo(() => {
    const indexOfLastNews = currentPage * newsPerPage;
    const indexOfFirstNews = indexOfLastNews - newsPerPage;
    return data.slice(indexOfFirstNews, indexOfLastNews);
  }, [data, currentPage, newsPerPage]);

  const totalPages = Math.ceil(data.length / newsPerPage);

  useEffect(() => {
    if (currentNews.length === 0 && currentPage > 1) {
      setCurrentPage((prev) => Math.max(prev - 1, 1));
    }
  }, [currentNews, currentPage]);

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
      document.body.style.overflow = "hidden"; // Отключаем прокрутку
    } else {
      document.body.style.overflow = "auto"; // Включаем обратно при закрытии
    }
  
    return () => {
      document.body.style.overflow = "auto"; // Очистка при размонтировании
    };
  }, [isOpen]);
  

  return (
    <PageWrapper>
      <title>Список публикаций</title>
      <div id="data-list-form" className="container">
        <h1>Список публикаций</h1>

        {data.length > 0 && (
          <button onClick={deleteAllNews} className="custom_button_mid" id="delete-all">
            Удалить все публикации
          </button>
        )}

        {totalPages > 1 && (
          <Pagination totalPages={totalPages} currentPage={currentPage} paginate={setCurrentPage} />
        )}

        <div className="data-list">
          {currentNews.length === 0 ? (
            <p>В данный момент нет доступных публикаций.</p>
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
          onMovePrevRequest={() => setPhotoIndex((photoIndex + currentImages.length - 1) % currentImages.length)}
          onMoveNextRequest={() => setPhotoIndex((photoIndex + 1) % currentImages.length)}
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
