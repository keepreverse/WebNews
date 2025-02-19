import React, { useState, useEffect, useCallback, useRef, useMemo} from "react";
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import JoditEditor from "jodit-react";
import PageWrapper from "./PageWrapper";
import HTMLReactParser from "html-react-parser";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/flatpickr.min.css";
import { Russian } from "flatpickr/dist/l10n/ru.js";

function NewsCreator() {
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [newsImages, setNewsImages] = useState([]);
  const [previewMode, setPreviewMode] = useState(false);
  const titleRef = useRef("");

  const navigate = useNavigate();

  const configJoditEditor = useMemo(() => ({
    toolbarAdaptive: false,
    showCharsCounter: false,
    showWordsCounter: false,
    showXPathInStatusbar: false,
    allowResizeX: false,
    autofocus: false,
    saveModeInStorage: true,
    askBeforePasteHTML: true,
    askBeforePasteFromWord: true,
    toolbarButtonSize: "large",
    placeholder: "Введите текст новости",
    minHeight: 200,
    disablePlugins:
      "video,about,add-new-line,class-span,source,resizer," +
      "speech-recognize,spellcheck,stat,drag-and-drop," +
      "drag-and-drop-element,clipboard,copyformat," +
      "delete-command,file,format-block,hotkeys," +
      "iframe,image,image-processor,image-properties,indent," +
      "inline-popup,media,paste-from-word," +
      "paste-storage,powered-by-jodit,print,search,sticky," +
      "symbols,table,table-keyboard-navigation,wrap-nodes",
    buttons:
      "undo redo | fontsize | bold italic underline brush link | align ol ul | eraser | fullsize |",
    events: {
      beforePaste(event, editor) {
        const clipboardData = event.clipboardData || window.clipboardData;
        if (clipboardData) {
          const items = clipboardData.items;
          for (const item of items) {
            if (item.type.startsWith("image/")) {
              event.preventDefault();
              toast.warn("Вставка изображений запрещена!");
              return false;
            }
          }
        }
      },
      drop(event, editor) {
        const dt = event.dataTransfer;
        if (dt && dt.files.length > 0) {
          for (const file of dt.files) {
            if (file.type.startsWith("image/")) {
              event.preventDefault();
              toast.warn("Перетаскивание изображений запрещено!");
              return false;
            }
          }
        }
      }
    }
  }), []);
  
  const configFlatpickr = useMemo(() => ({
    enableTime: true,
    altInput: true,
    altFormat: "F j, Y, H:i",
    dateFormat: "Y-m-d\\TH:i:ss",
    locale: Russian,
  }), []); 
  
  const configToast = useMemo(() => ({
    position: "top-right",
    autoClose: 4000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
  }), []); 

  function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);
  
    useEffect(() => {
      const handler = setTimeout(() => {
        setDebouncedValue(value);
      }, delay);
  
      return () => {
        clearTimeout(handler);
      };
    }, [value, delay]);
  
    return debouncedValue;
  }
  
  const [title, setTitle] = useState("");
  const debouncedTitle = useDebounce(title, 500); // Обновляет с задержкой 500 мс
  
  const handleTitleChange = useCallback((e) => {
    titleRef.current = e.target.value;
    setTitle(e.target.value);
  }, []);


  const handleDateChange = (selectedDate) => {
    setDate(selectedDate[0]); // сохраняет первую выбранную дату
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    handleFiles(files);
  };
  
  const handleFiles = (files) => {
    const newImages = files
      .filter((file) => file.type.startsWith("image/"))
      .map((file) => ({
        id: uuidv4(), // Уникальный ID
        file: file, // Сохраняем сам файл
        preview: URL.createObjectURL(file), // Создаём URL для превью
      }));
  
    setNewsImages((prevImages) => [...prevImages, ...newImages]); // Добавляем, а не заменяем
  };
  

  const handleDeleteThumbnail = (thumbnailId) => {
    setNewsImages((prevImages) => prevImages.filter((image) => image.id !== thumbnailId));
  };
  
  
/*
  const handleDeleteThumbnail = (thumbnailId) => {
    setNewsImages((prevImages) =>
      prevImages.filter((image) => image.key !== thumbnailId)
    );

    const dataTransfer = new DataTransfer();
    Array.from(document.forms.newsForm["files[]"].files).forEach((file) => {
      if (file.uniqueKey !== thumbnailId) {
        dataTransfer.items.add(file);
      }
    });

    document.forms.newsForm["files[]"].files = dataTransfer.files;
  };
*/

  const handleDeleteAllThumbnails = () => {
    setNewsImages([]);
    const fileInput = document.getElementById("news-image");
    if (fileInput) {
      fileInput.value = ""; // Сброс input
    }
  };

  const handlePreview = () => {
    setTitle(title);
    setDescription(description);
    setPreviewMode(!previewMode);
  };

  const handleRestartPreview = () => {
    setPreviewMode(false);
  };

  const handleNewsList = () => {
    window.open("/news-list", "_blank");
  };
  
  const handleLogout = () => {
    navigate("/");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nickname = document.forms.newsForm.nickname.value;
    const event_start = date;

    if (!nickname.trim()) {
      toast.error("Пожалуйста, введите имя пользователя", configToast);
      return;
    }

    if (!event_start || event_start.length === 0) {
      toast.error("Пожалуйста, укажите дату события", configToast);
      return;
    }

    if (!title.trim()) {
      toast.error("Пожалуйста, введите заголовок новости", configToast);
      return;
    }

    if (!description.trim()) {
      toast.error("Пожалуйста, введите текст новости", configToast);
      return;
    }

    const filesToSubmit = Array.from(
      document.forms.newsForm["files[]"].files
    ).filter((file) =>
      newsImages.find((image) => image.key === file.uniqueKey)
    );

    const newsData = new FormData(document.forms.newsForm);

    newsData.delete("files[]");
    filesToSubmit.forEach((file) => {
      newsData.append("files[]", file);
    });

    try {
      const response = await fetch("http://127.0.0.1:5000/api/news", {
        method: "POST",
        body: newsData,
      });

      if (!response.ok) {
        throw new Error("Failed to add news");
      }

      toast.success("Новость успешно отправлена!", configToast);
    } catch (error) {
      console.error("Error adding news:", error.message);
      toast.error(
        "Ошибка при отправке новости. Пожалуйста, повторите попытку.",
        configToast
      );
    }
  };


  const MemoizedJoditEditor = useMemo(() => {
    return (
      <JoditEditor
        name="description"
        value={description}
        config={configJoditEditor}
        tabIndex={1}
        onBlur={(newText) => setDescription(newText)}
      />
    );
  }, [description, configJoditEditor]); // Зависит только от `description`, а не от `title`
  
  const MemoizedFlatpickr = useMemo(() => {
    return (
      <Flatpickr
        id="news-date"
        name="event_start"
        placeholder="Выберите дату события"
        options={configFlatpickr}
        onChange={handleDateChange}
      />
    );
  }, [configFlatpickr]);
  
  const MemoizedToastContainer = useMemo(() => <ToastContainer options={configToast}/>, [configToast]);
  
  return (
    <PageWrapper>
      <title>Конфигуратор публикаций</title>
      <div id="news-form" className="container">
        <h1>Конфигуратор публикаций</h1>
        <div className="content">
          <form className="form" name="newsForm" onSubmit={handleSubmit}>
            <input
              type="text"
              id="news-nickname"
              name="nickname"
              className="inpt"
              placeholder="Введите имя пользователя"
            />

            {MemoizedFlatpickr}

            <input
              type="text"
              id="news-title"
              name="title"
              className="inpt"
              placeholder="Введите заголовок новости"
              value={title}
              onChange={handleTitleChange}
            />

            {MemoizedJoditEditor}

            <label htmlFor="news-image">Изображение:</label>
            <div id="drop-zone" className="drop-zone">
              Перетащите сюда фотографии или кликните для выбора файлов
              <input
                type="file"
                id="news-image"
                name="files[]"
                accept="image/*"
                multiple
                onChange={handleImageChange}
              />
            </div>


            {newsImages.length > 0 && (
              <div id="thumbnail-container" className="thumbnail-container">
                {newsImages.map((image) => (
                  <div key={image.id} className="thumbnail">
                    <img src={image.preview} alt="Thumbnail" />
                    <span className="delete-button" onClick={() => handleDeleteThumbnail(image.id)}>✖</span>
                  </div>
                ))}
              </div>
            )}


            {newsImages.length > 0 && (
              <button
                className="custom_button"
                id="delete"
                onClick={handleDeleteAllThumbnails}
              >
                Удалить все фотографии
              </button>
            )}

            {previewMode ? (
              <div className="view">
                {title && <h3>{HTMLReactParser(debouncedTitle)}</h3>}
                {description && (
                  <div id="view">{HTMLReactParser(description)}</div>
                )}
                <button
                  className="custom_button"
                  id="view"
                  onClick={handleRestartPreview}
                >
                  Закрыть предварительный просмотр
                </button>
              </div>
            ) : (
              <button
                className="custom_button"
                id="view"
                onClick={handlePreview}
              >
                Предварительный просмотр
              </button>
            )}

            <button type="submit" className="custom_button" id="submit">
              Отправить публикацию
            </button>
          </form>

          <button className="custom_button" id="newslist" onClick={handleNewsList}>
            Список публикаций
          </button>

          <button className="custom_button" id="logout" onClick={handleLogout}>
            Сменить пользователя
          </button>
        </div>
      </div>
      {MemoizedToastContainer}
    </PageWrapper>
  );
}

export default NewsCreator;
