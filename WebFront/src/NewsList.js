import React, { useEffect, useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import PageWrapper from "./PageWrapper";
import "./styles.css";
import HTMLReactParser from "html-react-parser";

function NewsList() {
  const [data, setData] = useState([]);

  // Загружаем данные с API
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("http://127.0.0.1:5000/api/news");
        if (!response.ok) {
          throw new Error("Ошибка при загрузке данных");
        }
        const result = await response.json();
        setData(result);
      } catch (error) {
        console.error("Ошибка загрузки данных:", error);
        toast.error("Не удалось загрузить данные");
      }
    };

    fetchData();
  }, []);

  return (
    <PageWrapper>
      <title>Список новостей</title>
      <div id="data-list-form" className="container">
        <h1>Список новостей</h1>
        <div className="data-list">
          {data.map((item, index) => (
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

              {/* Показываем изображение, если оно есть */}
              {item.imageUrl && (
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="data-image"
                />
              )}
            </div>
          ))}
        </div>
      </div>
      <ToastContainer />
    </PageWrapper>
  );
}

export default NewsList;
