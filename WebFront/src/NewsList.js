/* eslint-disable jsx-a11y/img-redundant-alt */
import React, { useEffect, useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import PageWrapper from "./PageWrapper";
import "./styles.css"; // Убедитесь, что этот файл подключен
import HTMLReactParser from "html-react-parser";

function NewsList() {
  const [data, setData] = useState([]);

  // Загружаем данные с API
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("http://127.0.0.1:5000/api/news");
        if (!response.ok) {
          if (response.status === 404) {
            // Если нет новостей, показываем warning
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

  const deleteNews = async (newsID) => {
    try {
      const response = await fetch(`http://127.0.0.1:5000/api/news/${newsID}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Новость удалена успешно!");
        setData(data.filter((item) => item.newsID !== newsID)); // Убираем удаленную новость из списка
      } else {
        toast.error("Не удалось удалить новость");
      }
    } catch (error) {
      console.error("Ошибка при удалении новости:", error);
      toast.error("Ошибка при удалении новости");
    }
  };

  const deleteAllNews = async () => {
    try {
      const response = await fetch("http://127.0.0.1:5000/api/news", {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Все новости удалены успешно!");
        setData([]); // Очистим список новостей
      } else {
        toast.error("Не удалось удалить все новости");
      }
    } catch (error) {
      console.error("Ошибка при удалении всех новостей:", error);
      toast.error("Ошибка при удалении всех новостей");
    }
  };

  return (
    <PageWrapper>
      <title>Список публикаций</title>
      <div id="data-list-form" className="container">
        <h1>Список публикаций</h1>

        {/* Кнопка удаления всех новостей */}
        {/* Условие для отображения кнопки "Удалить все новости" */}
        {data.length > 0 && (
          <button
            onClick={deleteAllNews}
            className="custom_button_mid"
            id="delete-all"
          >
            Удалить все новости
          </button>
        )}

        <div className="data-list">
          {data.length === 0 ? (
            <p>В данный момент нет доступных новостей.</p>
          ) : (
            data.map((item, index) => (
              <div key={index} className="data-item">
                <h2>{item.title}</h2>

                <div className="news-description">
                  {HTMLReactParser(item.description)}
                </div>

                {/* Показываем nickname */}
                {item.publisher_nick && (
                  <p>
                    <strong>Автор:</strong> {item.publisher_nick}
                  </p>
                )}

                {/* Показываем количество фотографий */}
                {item.files && item.files.length > 0 && (
                  <p>
                    <strong>Количество фотографий:</strong> {item.files.length}
                  </p>
                )}

                {/* Показываем дату начала события */}
                {item.event_start && (
                  <p>
                    <strong>Дата события:</strong>{" "}
                    {new Date(item.event_start).toLocaleDateString("ru-RU", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                    ,{" "}
                    {new Date(item.event_start).toLocaleTimeString("ru-RU", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                )}

                {/* Показываем изображения в виде сетки */}
                {item.files && item.files.length > 0 && (
                  <div className="thumbnail-container">
                    {item.files.map((file, index) => (
                      <div key={index} className="thumbnail">
                        <img
                          src={`http://127.0.0.1:5000/uploads/${file.fileName}`}
                          alt={`image-${index}`}
                          className="data-image"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Кнопка удаления новости */}
                <button
                  onClick={() => deleteNews(item.newsID)}
                  className="custom_button_short"
                  id="delete"
                >
                  Удалить новость
                </button>
              </div>
            ))
          )}
        </div>
      </div>
      <ToastContainer />
    </PageWrapper>
  );
}

export default NewsList;
